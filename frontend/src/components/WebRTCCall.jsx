import React, { useEffect, useRef, useState } from "react";
import { X, Mic, MicOff, Camera, CameraOff, PhoneOff } from "lucide-react";
import toast from "react-hot-toast";
import { RTCConfig, getMediaConstraints, handleMediaError } from "../lib/webrtcConfig";
import signalingService from "../services/signalingService";
import { useAuthStore } from "../store/useAuthStore";

/**
 * WebRTC Call Component
 * Implementação WebRTC para chamada P2P usando o serviço de sinalização adaptado
 * Melhorado para funcionar tanto para quem inicia quanto para quem recebe a chamada
 */
const WebRTCCall = ({ 
  userId,      // ID do usuário que está sendo chamado/chamando
  userName,    // Nome do usuário que está sendo chamado/chamando
  onClose,     // Callback quando a chamada terminar
  isVideo = true, // Se é uma chamada de vídeo ou não
  isIncoming = false, // Se é uma chamada recebida (já aceita)
}) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  
  const [isConnecting, setIsConnecting] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isCallCreator, setIsCallCreator] = useState(!isIncoming);
  const [error, setError] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(!isVideo);
  
  const authUser = useAuthStore(state => state.authUser);

  // Configurar a conexão peer
  const setupPeerConnection = async () => {
    console.log("Configurando conexão peer para:", isCallCreator ? "chamador" : "receptor");
    
    // Configurar a conexão peer
    peerConnectionRef.current = new RTCPeerConnection(RTCConfig);
    
    // Adicionar as trilhas locais à conexão
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        peerConnectionRef.current.addTrack(track, localStreamRef.current);
      });
    }
    
    // Escutar por trilhas remotas
    peerConnectionRef.current.ontrack = (event) => {
      console.log("Stream remoto recebido!");
      
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setIsConnected(true);
        setIsConnecting(false);
        toast.success("Chamada conectada!");
      }
    };
    
    // Gerenciar mudanças no estado da conexão ICE
    peerConnectionRef.current.oniceconnectionstatechange = () => {
      const state = peerConnectionRef.current.iceConnectionState;
      console.log("ICE Connection State:", state);
      
      if (state === "connected" || state === "completed") {
        setIsConnected(true);
        setIsConnecting(false);
      }
      
      if (state === "failed" || state === "disconnected" || state === "closed") {
        toast.error("Conexão perdida");
        setError("Conexão perdida. Tente novamente.");
        setIsConnecting(false);
        setIsConnected(false);
      }
    };
    
    // Enviar candidatos ICE para o peer remoto
    peerConnectionRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("Enviando candidato ICE para:", userId);
        signalingService.sendIceCandidate(userId, event.candidate);
      }
    };
  };

  // Gerenciar os eventos de sinalização
  const handleSignalingEvents = () => {
    // Quando receber uma oferta
    const offerHandler = async (data) => {
      try {
        if (data.from !== userId) return; // Ignorar ofertas de outros usuários
        
        console.log("Oferta recebida de:", data.from);
        
        // Configurar conexão se não existir
        if (!peerConnectionRef.current) {
          await setupPeerConnection();
        }
        
        // Definir a descrição remota
        const offerDescription = new RTCSessionDescription(data.offer);
        await peerConnectionRef.current.setRemoteDescription(offerDescription);
        
        // Criar e enviar resposta
        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);
        
        await signalingService.sendAnswer(data.from, answer);
        
        setIsCallCreator(false);
      } catch (err) {
        console.error("Erro ao processar oferta:", err);
        setError("Erro ao processar oferta de chamada: " + err.message);
      }
    };
    
    // Quando receber uma resposta
    const answerHandler = async (data) => {
      try {
        if (data.from !== userId) return; // Ignorar respostas de outros usuários
        
        console.log("Resposta recebida de:", data.from);
        
        if (peerConnectionRef.current) {
          const answerDescription = new RTCSessionDescription(data.answer);
          await peerConnectionRef.current.setRemoteDescription(answerDescription);
        }
      } catch (err) {
        console.error("Erro ao processar resposta:", err);
      }
    };
    
    // Quando receber um candidato ICE
    const iceCandidateHandler = async (data) => {
      try {
        if (data.from !== userId) return; // Ignorar candidatos de outros usuários
        
        console.log("Candidato ICE recebido de:", data.from);
        
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      } catch (err) {
        console.error("Erro ao adicionar candidato ICE:", err);
      }
    };
    
    // Quando a chamada for encerrada pelo outro usuário
    const callEndedHandler = () => {
      toast.success("O outro usuário encerrou a chamada");
      onClose();
    };
    
    // Registrar os handlers
    signalingService.off('offer'); // Remove handlers anteriores
    signalingService.off('answer');
    signalingService.off('iceCandidate');
    signalingService.off('callEnded');
    
    signalingService.on('offer', offerHandler);
    signalingService.on('answer', answerHandler);
    signalingService.on('iceCandidate', iceCandidateHandler);
    signalingService.on('callEnded', callEndedHandler);
    
    // Retornar função para remover handlers
    return () => {
      signalingService.off('offer', offerHandler);
      signalingService.off('answer', answerHandler);
      signalingService.off('iceCandidate', iceCandidateHandler);
      signalingService.off('callEnded', callEndedHandler);
    };
  };

  // Iniciar a chamada (para quem está iniciando)
  const startCall = async () => {
    try {
      console.log("Iniciando chamada para:", userId);
      
      // Iniciar uma nova chamada
      await signalingService.initiateCall(userId, isVideo);
      
      // Criar uma oferta WebRTC
      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);
      
      // Enviar a oferta para o peer remoto
      await signalingService.sendOffer(userId, offer);
      
      toast.success(`Iniciando chamada ${isVideo ? 'com vídeo' : 'de voz'} com ${userName}...`);
      
      // Definir um timeout para a conexão
      setTimeout(() => {
        if (!isConnected && isConnecting) {
          setError("Tempo de espera esgotado. O usuário não respondeu à chamada.");
          setIsConnecting(false);
        }
      }, 30000); // 30 segundos
    } catch (err) {
      console.error("Erro ao iniciar chamada:", err);
      setError("Erro ao iniciar chamada: " + err.message);
      setIsConnecting(false);
    }
  };

  // Unir-se a uma chamada (para quem está recebendo)
  const joinCall = async () => {
    console.log("Unindo-se à chamada de:", userId);
    // Para quem recebe a chamada, não precisamos iniciar, apenas
    // aguardamos a oferta que será processada pelo evento 'offer'
    setIsCallCreator(false);
  };

  // Configurar a chamada
  useEffect(() => {
    let mounted = true;
    let signalHandlersCleanup = null;
    
    const setupCall = async () => {
      try {
        console.log("Configurando chamada:", isIncoming ? "recebida" : "iniciada");
        
        // Conectar ao serviço de sinalização
        await signalingService.connect(authUser._id);
        
        // Configurar os handlers para eventos de sinalização
        signalHandlersCleanup = handleSignalingEvents();
        
        // Obter mídia local
        const mediaConstraints = getMediaConstraints(isVideo);
        localStreamRef.current = await navigator.mediaDevices.getUserMedia(mediaConstraints);
        
        // Exibir stream local
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }
        
        // Configurar conexão peer
        await setupPeerConnection();
        
        // Iniciar ou receber a chamada
        if (mounted) {
          if (!isIncoming) {
            // Quem inicia a chamada envia a oferta
            await startCall();
          } else {
            // Quem recebe a chamada aguarda a oferta
            await joinCall();
          }
        }
      } catch (err) {
        console.error("Erro ao configurar chamada:", err);
        const errorInfo = handleMediaError(err);
        if (mounted) {
          setError(errorInfo.message);
          setIsConnecting(false);
        }
      }
    };
    
    setupCall();
    
    // Função de limpeza
    return () => {
      mounted = false;
      
      // Remover handlers de eventos
      if (signalHandlersCleanup) signalHandlersCleanup();
      
      // Encerrar a chamada no serviço de sinalização
      signalingService.endCall();
      
      // Fechar conexão peer
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      
      // Parar todas as trilhas do stream local
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [userId, userName, isVideo, authUser._id, isIncoming]);
  
  // Toggles para mudo e vídeo
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        audioTracks[0].enabled = isMuted;
        setIsMuted(!isMuted);
        toast.success(isMuted ? "Microfone ativado" : "Microfone desativado");
      }
    }
  };
  
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        videoTracks[0].enabled = isVideoOff;
        setIsVideoOff(!isVideoOff);
        toast.success(isVideoOff ? "Câmera ativada" : "Câmera desativada");
      }
    }
  };
  
  // Encerrar a chamada
  const endCall = () => {
    // Encerrar a chamada no serviço de sinalização
    signalingService.endCall();
    
    // Fechar conexão peer
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    
    // Parar todas as trilhas do stream local
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    toast.success("Chamada encerrada");
    onClose();
  };
  
  // Exibição de erro
  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        <div className="p-4 flex justify-between items-center bg-gray-900">
          <h2 className="text-white font-medium">Erro na chamada</h2>
          <button onClick={onClose} className="p-2 rounded-full bg-red-500 text-white">
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
            <button onClick={onClose} className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded">
              Voltar
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="p-4 flex justify-between items-center bg-gray-900">
        <h2 className="text-white font-medium">
          {isConnecting ? 'Iniciando chamada...' : isConnected ? 'Chamada em andamento' : 'Conectando...'}
        </h2>
        <button 
          onClick={endCall}
          className="p-2 rounded-full bg-red-500 text-white"
          title="Encerrar chamada"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 relative bg-gray-800">
        {/* Vídeo remoto (tela cheia) */}
        <div className="absolute inset-0">
          {isVideo && (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          )}
          
          {!isVideo && isConnected && (
            <div className="w-full h-full flex items-center justify-center">
              <div className="bg-gray-700 rounded-full p-8">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                  <path d="M5.5 19.5h-3a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h3"></path>
                  <path d="M5.5 17.5v-7a2 2 0 0 1 2-2H16"></path>
                  <path d="M17.5 13.5v4a2 2 0 0 0 2 2h.5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-4"></path>
                  <path d="M11.5 8.5V6.5a2 2 0 0 1 2-2h.5a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-.5a2 2 0 0 1-2-2z"></path>
                </svg>
              </div>
            </div>
          )}
        </div>
        
        {/* Vídeo local (pequeno overlay) */}
        {isVideo && (
          <div className="absolute bottom-4 right-4 w-1/4 h-1/4 max-w-xs max-h-xs rounded-lg overflow-hidden border-2 border-white shadow-lg">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        {/* Controles */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
          <button 
            onClick={toggleMute}
            className={`p-3 rounded-full ${isMuted ? 'bg-red-500' : 'bg-gray-700'} text-white`}
          >
            {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
          </button>
          
          {isVideo && (
            <button 
              onClick={toggleVideo}
              className={`p-3 rounded-full ${isVideoOff ? 'bg-red-500' : 'bg-gray-700'} text-white`}
            >
              {isVideoOff ? <CameraOff size={24} /> : <Camera size={24} />}
            </button>
          )}
          
          <button 
            onClick={endCall}
            className="p-3 rounded-full bg-red-500 text-white"
          >
            <PhoneOff size={24} />
          </button>
        </div>
        
        {/* Overlay de carregamento */}
        {isConnecting && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-black bg-opacity-70">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
            <p className="text-white ml-4">
              {isCallCreator ? 'Chamando...' : 'Conectando...'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WebRTCCall;