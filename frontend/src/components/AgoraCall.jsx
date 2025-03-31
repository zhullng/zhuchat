// src/components/AgoraCall.jsx
import React, { useEffect, useState, useRef } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { X, Mic, MicOff, Video, VideoOff, Users, Share2 } from 'lucide-react';
import toast from "react-hot-toast";

const AgoraCall = ({ channelName, userName, onClose }) => {
  // Substitua pela sua App ID da Agora
  const appId = 'SEU_APP_ID_AGORA';
  
  const [localVideoTrack, setLocalVideoTrack] = useState(null);
  const [localAudioTrack, setLocalAudioTrack] = useState(null);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [isJoined, setIsJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [waitingForUsers, setWaitingForUsers] = useState(false);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  
  const agoraEngineRef = useRef(null);
  const localPlayerContainerRef = useRef(null);
  const clientUidRef = useRef(null);
  
  // Validar nome do canal antes de usar
  const validateChannelName = (name) => {
    // Verificar se o nome do canal tem menos de 64 bytes e caracteres válidos
    if (!name || name.length > 64) {
      return false;
    }
    
    // Regex para caracteres permitidos: a-z, A-Z, 0-9, espaço e símbolos específicos
    const validChars = /^[a-zA-Z0-9 !#$%&()+\-:;<=>?@[\]^_{|}~,.]+$/;
    return validChars.test(name);
  };
  
  useEffect(() => {
    console.log("Iniciando componente AgoraCall com canal:", channelName);
    
    // Verificar nome do canal
    if (!validateChannelName(channelName)) {
      setError("Nome do canal inválido. Deve ter menos de 64 caracteres e usar apenas caracteres permitidos.");
      setIsLoading(false);
      toast.error("Nome do canal inválido");
      return;
    }
    
    // Criar cliente Agora
    agoraEngineRef.current = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    
    // Adicionar handlers de eventos de conexão
    agoraEngineRef.current.on("connection-state-change", (curState, prevState) => {
      console.log(`Agora - Estado da conexão mudou: ${prevState} -> ${curState}`);
      setConnectionStatus(curState);
      
      if (curState === "CONNECTED") {
        toast.success("Conectado ao servidor de chamadas");
      } else if (curState === "DISCONNECTED") {
        toast.error("Desconectado do servidor de chamadas");
        setIsLoading(false);
      }
    });
    
    // Inicializar função de chamada
    const initializeAgora = async () => {
      // Escutar eventos de usuários remotos
      agoraEngineRef.current.on("user-published", handleUserPublished);
      agoraEngineRef.current.on("user-unpublished", handleUserUnpublished);
      agoraEngineRef.current.on("user-joined", handleUserJoined);
      agoraEngineRef.current.on("user-left", handleUserLeft);
      agoraEngineRef.current.on("exception", handleException);
      
      try {
        console.log("Agora - Solicitando permissões de mídia");
        // Solicitar permissões de mídia primeiro
        await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        
        // Gerar um UID aleatório para o usuário
        const uid = Math.floor(Math.random() * 1000000);
        clientUidRef.current = uid;
        
        console.log(`Agora - Tentando entrar no canal: ${channelName} com UID: ${uid}`);
        // Entrar no canal
        await agoraEngineRef.current.join(appId, channelName, null, uid);
        console.log("Agora - Entrou no canal com sucesso");
        toast.success("Conectado ao canal de chamada");
        setIsJoined(true);
        
        // Verificar se há outros usuários no canal
        const usersInChannel = agoraEngineRef.current.remoteUsers;
        console.log("Agora - Usuários no canal:", usersInChannel.length);
        
        if (usersInChannel.length === 0) {
          setWaitingForUsers(true);
          toast.success("Aguardando outros participantes entrarem...");
        }
        
        console.log("Agora - Criando tracks de áudio e vídeo");
        // Criar e publicar tracks de áudio e vídeo locais
        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        const videoTrack = await AgoraRTC.createCameraVideoTrack();
        
        setLocalAudioTrack(audioTrack);
        setLocalVideoTrack(videoTrack);
        
        console.log("Agora - Publicando tracks locais");
        // Publicar os tracks locais
        await agoraEngineRef.current.publish([audioTrack, videoTrack]);
        console.log("Agora - Tracks publicados com sucesso");
        
        // Mostrar vídeo local
        if (localPlayerContainerRef.current) {
          console.log("Agora - Reproduzindo vídeo local");
          videoTrack.play(localPlayerContainerRef.current);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error("Erro ao inicializar Agora:", error);
        setError(error.message || "Erro ao iniciar chamada");
        toast.error(`Erro ao iniciar chamada: ${error.message}`);
        setIsLoading(false);
      }
    };
    
    // Definir timeout para evitar chamadas presas em carregamento
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        console.log("Agora - Timeout ao tentar conectar");
        setError("Tempo esgotado ao tentar conectar. Verifique sua conexão.");
        setIsLoading(false);
        toast.error("Tempo esgotado ao conectar");
      }
    }, 15000); // 15 segundos de timeout
    
    initializeAgora();
    
    // Limpeza ao desmontar
    return () => {
      clearTimeout(timeoutId);
      leaveCall();
    };
  }, [channelName]);
  
  // Função para encerrar a chamada
  const leaveCall = async () => {
    console.log("Agora - Encerrando chamada");
    try {
      if (localAudioTrack) {
        localAudioTrack.close();
      }
      if (localVideoTrack) {
        localVideoTrack.close();
      }
      
      // Deixar o canal
      if (agoraEngineRef.current) {
        await agoraEngineRef.current.leave();
        console.log("Agora - Saiu do canal com sucesso");
      }
    } catch (error) {
      console.error("Erro ao encerrar chamada:", error);
    }
    
    setIsJoined(false);
    setRemoteUsers([]);
    setLocalAudioTrack(null);
    setLocalVideoTrack(null);
  };
  
  // Manipular publicação de usuário remoto
  const handleUserPublished = async (user, mediaType) => {
    console.log(`Agora - Usuário ${user.uid} publicou ${mediaType}`);
    setWaitingForUsers(false);
    
    try {
      // Inscrever-se no usuário
      await agoraEngineRef.current.subscribe(user, mediaType);
      console.log(`Agora - Inscrito no usuário ${user.uid} para ${mediaType}`);
      
      // Se for vídeo, atualizar UI
      if (mediaType === "video") {
        // Atualizar a lista de usuários remotos
        setRemoteUsers(prevUsers => {
          // Verificar se o usuário já existe
          if (prevUsers.find(u => u.uid === user.uid)) {
            return prevUsers.map(u => u.uid === user.uid ? { ...u, videoTrack: user.videoTrack } : u);
          } else {
            return [...prevUsers, user];
          }
        });
      }
      
      // Se for áudio, atualizar UI
      if (mediaType === "audio") {
        user.audioTrack?.play();
      }
    } catch (error) {
      console.error(`Agora - Erro ao receber mídia do usuário ${user.uid}:`, error);
    }
  };
  
  // Manipular despublicação de usuário remoto
  const handleUserUnpublished = (user, mediaType) => {
    console.log(`Agora - Usuário ${user.uid} despublicou ${mediaType}`);
    if (mediaType === "video") {
      setRemoteUsers(prevUsers => 
        prevUsers.map(u => u.uid === user.uid ? { ...u, videoTrack: null } : u)
      );
    }
  };
  
  // Manipular entrada de novo usuário
  const handleUserJoined = (user) => {
    console.log(`Agora - Usuário ${user.uid} entrou na chamada`);
    toast.success(`Outro usuário entrou na chamada`);
    setWaitingForUsers(false);
  };
  
  // Manipular saída de usuário
  const handleUserLeft = (user) => {
    console.log(`Agora - Usuário ${user.uid} saiu da chamada`);
    toast.success(`Outro usuário saiu da chamada`);
    setRemoteUsers(prevUsers => prevUsers.filter(u => u.uid !== user.uid));
    
    // Se não houver mais usuários remotos, mostrar mensagem de espera
    if (agoraEngineRef.current?.remoteUsers.length === 0) {
      setWaitingForUsers(true);
    }
  };
  
  // Manipular exceções
  const handleException = (event) => {
    console.error("Exceção do Agora:", event);
    if (event.code === 'OPERATION_ABORTED') {
      // Erro comum, não mostrar toast
      return;
    }
    toast.error(`Erro: ${event.msg || 'Erro desconhecido'}`);
  };
  
  // Compartilhar link da chamada
  const shareCallLink = async () => {
    try {
      const callUrl = `${window.location.origin}/join-call/${channelName}`;
      
      if (navigator.share) {
        await navigator.share({
          title: 'Entrar na chamada ZhuChat',
          text: 'Entre na minha chamada ZhuChat:',
          url: callUrl
        });
      } else {
        await navigator.clipboard.writeText(callUrl);
        toast.success("Link da chamada copiado para a área de transferência!");
      }
    } catch (error) {
      console.error("Erro ao compartilhar link:", error);
      toast.error("Não foi possível compartilhar o link da chamada");
    }
  };
  
  // Alternar áudio
  const toggleMute = async () => {
    if (localAudioTrack) {
      localAudioTrack.setEnabled(!isMuted);
      setIsMuted(!isMuted);
    }
  };
  
  // Alternar vídeo
  const toggleVideo = async () => {
    if (localVideoTrack) {
      localVideoTrack.setEnabled(!isVideoOff);
      setIsVideoOff(!isVideoOff);
    }
  };
  
  // Obter status da conexão
  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'DISCONNECTED':
        return 'Desconectado';
      case 'CONNECTING':
        return 'Conectando...';
      case 'CONNECTED':
        return 'Conectado';
      case 'RECONNECTING':
        return 'Reconectando...';
      case 'ABORTED':
        return 'Conexão interrompida';
      default:
        return isJoined ? 'Chamada em andamento' : 'Conectando...';
    }
  };
  
  // Encerrar a chamada
  const handleClose = async () => {
    await leaveCall();
    onClose();
  };
  
  // Renderizar cada usuário remoto
  const renderRemoteUser = (user) => {
    if (!user.videoTrack) return null;
    
    const playerContainerId = `remote-player-${user.uid}`;
    
    // Usado para reproduzir o vídeo após a renderização do componente
    setTimeout(() => {
      if (user.videoTrack) {
        console.log(`Agora - Reproduzindo vídeo do usuário ${user.uid}`);
        user.videoTrack.play(playerContainerId);
      }
    }, 100);
    
    return (
      <div 
        key={user.uid} 
        id={playerContainerId} 
        className="w-full h-full bg-gray-800 rounded-lg overflow-hidden"
      />
    );
  };
  
  // Se houver erro, mostrar mensagem de erro
  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        <div className="p-4 flex justify-between items-center bg-gray-900">
          <h2 className="text-white font-medium">Erro na chamada</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full bg-red-500 text-white"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 flex items-center justify-center bg-gray-800">
          <div className="text-center text-white p-4">
            <div className="bg-red-500 p-4 rounded-lg mb-4">
              <X size={48} className="mx-auto mb-2" />
              <h3 className="text-xl font-bold mb-2">Não foi possível iniciar a chamada</h3>
              <p>{error}</p>
            </div>
            <button
              onClick={onClose}
              className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded"
            >
              Voltar
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Cabeçalho da chamada */}
      <div className="p-4 flex justify-between items-center bg-gray-900">
        <h2 className="text-white font-medium">
          {isLoading ? 'Iniciando chamada...' : getConnectionStatusText()}
        </h2>
        <div className="flex items-center">
          <span className="text-gray-300 mr-3 text-sm">
            {waitingForUsers && !isLoading ? 
              <span className="flex items-center text-yellow-300">
                <Users size={16} className="mr-1"/> Aguardando participantes
              </span> : 
              clientUidRef.current ? `Seu ID: ${clientUidRef.current}` : ''
            }
          </span>
          <button 
            onClick={handleClose}
            className="p-2 rounded-full bg-red-500 text-white"
            title="Encerrar chamada"
          >
            <X size={20} />
          </button>
        </div>
      </div>
      
      {/* Área de vídeo */}
      <div className="flex-1 relative bg-gray-800">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
            <p className="text-white ml-4">Iniciando sua câmera...</p>
          </div>
        )}
        
        {/* Vídeo do usuário remoto (ocupando a maior parte da tela) */}
        <div className="absolute inset-0">
          {remoteUsers.length > 0 ? (
            remoteUsers.map(renderRemoteUser)
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              {waitingForUsers ? (
                <div className="text-center">
                  <div className="animate-pulse mb-4">
                    <Users size={64} className="text-gray-400 mx-auto"/>
                  </div>
                  <p className="text-white text-lg">Aguardando outros participantes...</p>
                  <p className="text-gray-400 mt-2">Envie o link para convidar alguém para a chamada</p>
                  <button 
                    onClick={shareCallLink}
                    className="mt-4 flex items-center mx-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                  >
                    <Share2 size={18} className="mr-2" />
                    Compartilhar link da chamada
                  </button>
                </div>
              ) : (
                <p className="text-white text-lg">Conectando à chamada...</p>
              )}
            </div>
          )}
        </div>
        
        {/* Vídeo local (pequeno, no canto) */}
        <div 
          ref={localPlayerContainerRef}
          className="absolute bottom-4 right-4 w-32 h-32 sm:w-48 sm:h-36 bg-gray-700 rounded-lg overflow-hidden border-2 border-white shadow-lg z-10"
        />
      </div>
      
      {/* Controles da chamada */}
      <div className="p-4 flex justify-center space-x-4 bg-gray-900">
        <button
          onClick={toggleMute}
          className={`p-3 rounded-full ${isMuted ? 'bg-red-500' : 'bg-gray-700'} text-white`}
          title={isMuted ? 'Ativar microfone' : 'Desativar microfone'}
        >
          {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
        </button>
        
        <button
          onClick={toggleVideo}
          className={`p-3 rounded-full ${isVideoOff ? 'bg-red-500' : 'bg-gray-700'} text-white`}
          title={isVideoOff ? 'Ativar vídeo' : 'Desativar vídeo'}
        >
          {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
        </button>
        
        <button
          onClick={handleClose}
          className="p-3 rounded-full bg-red-500 text-white"
          title="Encerrar chamada"
        >
          <X size={24} />
        </button>
      </div>
    </div>
  );
};

export default AgoraCall;