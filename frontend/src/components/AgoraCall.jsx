// src/components/AgoraCall.jsx
import React, { useEffect, useState, useRef } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { X, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import toast from "react-hot-toast";

/*
Antes de usar este componente, você precisa instalar a SDK do Agora:
npm install agora-rtc-sdk-ng

Você também precisa se cadastrar em https://www.agora.io para obter uma App ID gratuita.
O plano gratuito oferece 10.000 minutos por mês, o que deve ser suficiente para testes.
*/

const AgoraCall = ({ channelName, userName, onClose }) => {
  // Substitua por sua App ID da Agora
  const appId = '96d68e46467e4119814df82609085f82';
  
  const [localVideoTrack, setLocalVideoTrack] = useState(null);
  const [localAudioTrack, setLocalAudioTrack] = useState(null);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [isJoined, setIsJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const agoraEngineRef = useRef(null);
  const localPlayerContainerRef = useRef(null);
  
  useEffect(() => {
    // Criar cliente Agora
    agoraEngineRef.current = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    
    // Inicializar função de chamada
    const initializeAgora = async () => {
      // Escutar eventos de usuários remotos
      agoraEngineRef.current.on("user-published", handleUserPublished);
      agoraEngineRef.current.on("user-unpublished", handleUserUnpublished);
      agoraEngineRef.current.on("user-joined", handleUserJoined);
      agoraEngineRef.current.on("user-left", handleUserLeft);
      agoraEngineRef.current.on("exception", handleException);
      
      try {
        // Gerar um UID aleatório para o usuário
        const uid = Math.floor(Math.random() * 1000000);
        
        // Entrar no canal
        await agoraEngineRef.current.join(appId, channelName, null, uid);
        toast.success("Conectado ao canal de chamada");
        setIsJoined(true);
        
        // Criar e publicar tracks de áudio e vídeo locais
        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        const videoTrack = await AgoraRTC.createCameraVideoTrack();
        
        setLocalAudioTrack(audioTrack);
        setLocalVideoTrack(videoTrack);
        
        // Publicar os tracks locais
        await agoraEngineRef.current.publish([audioTrack, videoTrack]);
        
        // Mostrar vídeo local
        if (localPlayerContainerRef.current) {
          videoTrack.play(localPlayerContainerRef.current);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error("Erro ao inicializar Agora:", error);
        toast.error(`Erro ao iniciar chamada: ${error.message}`);
        setIsLoading(false);
      }
    };
    
    initializeAgora();
    
    // Limpeza ao desmontar
    return () => {
      leaveCall();
    };
  }, [channelName]);
  
  // Função para encerrar a chamada
  const leaveCall = async () => {
    if (localAudioTrack) {
      localAudioTrack.close();
    }
    if (localVideoTrack) {
      localVideoTrack.close();
    }
    
    // Deixar o canal
    await agoraEngineRef.current?.leave();
    setIsJoined(false);
    setRemoteUsers([]);
    setLocalAudioTrack(null);
    setLocalVideoTrack(null);
  };
  
  // Manipular publicação de usuário remoto
  const handleUserPublished = async (user, mediaType) => {
    // Inscrever-se no usuário
    await agoraEngineRef.current.subscribe(user, mediaType);
    
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
  };
  
  // Manipular despublicação de usuário remoto
  const handleUserUnpublished = (user, mediaType) => {
    if (mediaType === "video") {
      setRemoteUsers(prevUsers => 
        prevUsers.map(u => u.uid === user.uid ? { ...u, videoTrack: null } : u)
      );
    }
  };
  
  // Manipular entrada de novo usuário
  const handleUserJoined = (user) => {
    toast.info(`${user.uid} entrou na chamada`);
  };
  
  // Manipular saída de usuário
  const handleUserLeft = (user) => {
    toast.info(`${user.uid} saiu da chamada`);
    setRemoteUsers(prevUsers => prevUsers.filter(u => u.uid !== user.uid));
  };
  
  // Manipular exceções
  const handleException = (event) => {
    console.error("Exceção do Agora:", event);
    toast.error(`Erro: ${event.msg}`);
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
  
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Cabeçalho da chamada */}
      <div className="p-4 flex justify-between items-center bg-gray-900">
        <h2 className="text-white font-medium">
          {isLoading ? 'Iniciando chamada...' : isJoined ? 'Chamada em andamento' : 'Conectando...'}
        </h2>
        <button 
          onClick={handleClose}
          className="p-2 rounded-full bg-red-500 text-white"
          title="Encerrar chamada"
        >
          <X size={20} />
        </button>
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
              <p className="text-white text-lg">Aguardando outro participante...</p>
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