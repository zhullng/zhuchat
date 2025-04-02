// src/components/WebRTCCall.jsx
import React, { useEffect, useRef, useState } from "react";
import { X, Mic, MicOff, Camera, CameraOff, PhoneOff } from "lucide-react";
import toast from "react-hot-toast";
import { getSocket, emitSocketEvent } from "../services/socket";
import { useAuthStore } from "../store/useAuthStore";

const RTCConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

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
  const [error, setError] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(!isVideo);
  
  const authUser = useAuthStore(state => state.authUser);

  // Função para criar e configurar a conexão peer
  const setupPeerConnection = () => {
    console.log("⚙️ Configurando conexão WebRTC");
    
    // Fechar conexão existente, se houver
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    // Criar nova conexão
    const pc = new RTCPeerConnection(RTCConfig);
    peerConnectionRef.current = pc;
    
    // Adicionar trilhas locais
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        console.log(`➕ Adicionando trilha ${track.kind} à conexão`);
        pc.addTrack(track, localStreamRef.current);
      });
    } else {
      console.warn("⚠️ Tentando adicionar trilhas, mas não há stream local");
    }
    
    // Configurar handlers de evento
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        console.log("🧊 Enviando candidato ICE", candidate.candidate.substr(0, 30) + "...");
        emitSocketEvent("webrtc:ice-candidate", {
          from: authUser._id,
          to: userId,
          candidate
        });
      }
    };
    
    pc.ontrack = (event) => {
      console.log(`📥 Trilha remota recebida: ${event.track.kind}`);
      if (remoteVideoRef.current && event.streams[0]) {
        console.log("📺 Configurando stream remoto no elemento de vídeo");
        remoteVideoRef.current.srcObject = event.streams[0];
        setIsConnected(true);
        setIsConnecting(false);
        toast.success("Chamada conectada!");
      }
    };
    
    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      console.log(`🧊 Estado da conexão ICE alterado: ${state}`);
      
      if (state === "connected" || state === "completed") {
        setIsConnected(true);
        setIsConnecting(false);
      } else if (state === "failed") {
        toast.error("Falha na conexão");
        setError("Não foi possível estabelecer a conexão. Verifique sua rede.");
        setIsConnecting(false);
      } else if (state === "disconnected") {
        toast.error("Conexão perdida");
      }
    };
    
    return pc;
  };

  // Criar e enviar oferta (para quem inicia a chamada)
  const createAndSendOffer = async () => {
    try {
      if (!peerConnectionRef.current) {
        throw new Error("Peer connection não disponível");
      }
      
      console.log("📤 Criando oferta...");
      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);
      
      console.log("📤 Enviando oferta para", userId);
      emitSocketEvent("webrtc:offer", {
        from: authUser._id,
        to: userId,
        offer
      });
      
      console.log("✅ Oferta enviada com sucesso");
    } catch (err) {
      console.error("❌ Erro ao criar/enviar oferta:", err);
      setError("Erro ao iniciar chamada: " + err.message);
    }
  };
  
  // Configurar listeners de socket
  const setupSocketListeners = () => {
    const socket = getSocket();
    if (!socket) {
      console.error("❌ Socket não disponível para configurar listeners");
      return null;
    }
    
    console.log("🔄 Configurando listeners de socket para WebRTC");
    
    // Handler para ofertas
    const handleOffer = async (data) => {
      console.log("📨 Oferta recebida:", data);
      
      if (data.from !== userId) {
        console.log("⏭️ Ignorando oferta - não é do usuário esperado");
        return;
      }
      
      try {
        // Criar conexão se não existir
        if (!peerConnectionRef.current) {
          setupPeerConnection();
        }
        
        console.log("📝 Definindo descrição remota (oferta)");
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(data.offer)
        );
        
        console.log("📤 Criando resposta");
        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);
        
        console.log("📤 Enviando resposta para", data.from);
        emitSocketEvent("webrtc:answer", {
          from: authUser._id,
          to: data.from,
          answer
        });
      } catch (err) {
        console.error("❌ Erro ao processar oferta:", err);
        setError("Erro ao processar oferta: " + err.message);
      }
    };
    
    // Handler para respostas
    const handleAnswer = async (data) => {
      console.log("📨 Resposta recebida:", data);
      
      if (data.from !== userId) {
        console.log("⏭️ Ignorando resposta - não é do usuário esperado");
        return;
      }
      
      try {
        if (!peerConnectionRef.current) {
          console.error("❌ Recebida resposta, mas não há conexão peer");
          return;
        }
        
        console.log("📝 Definindo descrição remota (resposta)");
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(data.answer)
        );
      } catch (err) {
        console.error("❌ Erro ao processar resposta:", err);
      }
    };
    
    // Handler para candidatos ICE
    const handleIceCandidate = async (data) => {
      if (data.from !== userId) return;
      
      try {
        if (peerConnectionRef.current) {
          console.log("🧊 Adicionando candidato ICE recebido");
          await peerConnectionRef.current.addIceCandidate(
            new RTCIceCandidate(data.candidate)
          );
        }
      } catch (err) {
        console.error("❌ Erro ao adicionar candidato ICE:", err);
      }
    };
    
    // Handler para chamada encerrada
    const handleCallEnded = () => {
      console.log("📞 Chamada encerrada pelo outro usuário");
      toast.success("Chamada encerrada pelo outro usuário");
      onClose();
    };
    
    // Remover listeners antigos
    socket.off("webrtc:offer");
    socket.off("webrtc:answer");
    socket.off("webrtc:ice-candidate");
    socket.off("call:ended");
    
    // Adicionar novos listeners
    socket.on("webrtc:offer", handleOffer);
    socket.on("webrtc:answer", handleAnswer);
    socket.on("webrtc:ice-candidate", handleIceCandidate);
    socket.on("call:ended", handleCallEnded);
    
    // Retornar função de limpeza
    return () => {
      socket.off("webrtc:offer", handleOffer);
      socket.off("webrtc:answer", handleAnswer);
      socket.off("webrtc:ice-candidate", handleIceCandidate);
      socket.off("call:ended", handleCallEnded);
    };
  };

  // Efeito principal para configurar a chamada
  useEffect(() => {
    let cleanup = null;
    
    const setupCall = async () => {
      try {
        console.log(`🚀 Iniciando configuração de chamada (${isIncoming ? 'recebida' : 'iniciada'})`);
        
        // Obter mídia local
        const constraints = {
          audio: true,
          video: isVideo ? { width: 1280, height: 720 } : false
        };
        
        console.log("📹 Obtendo mídia local com constraints:", constraints);
        try {
          localStreamRef.current = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (mediaError) {
          console.error("❌ Erro ao obter mídia:", mediaError);
          
          // Tentar fallback para apenas áudio
          if (isVideo) {
            console.log("⚠️ Tentando fallback para apenas áudio");
            localStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            setIsVideoOff(true);
          } else {
            throw mediaError;
          }
        }
        
        // Configurar vídeo local
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }
        
        // Configurar connection peer
        setupPeerConnection();
        
        // Configurar listeners de socket
        cleanup = setupSocketListeners();
        
        // Iniciar ou responder a chamada
        if (!isIncoming) {
          // Se estamos iniciando a chamada, precisamos criar e enviar a oferta
          console.log("📞 Iniciando chamada como chamador");
          await createAndSendOffer();
        } else {
          // Se estamos recebendo a chamada, aguardamos pela oferta do outro lado
          console.log("📞 Aguardando oferta como receptor");
        }
        
      } catch (err) {
        console.error("❌ Erro na configuração da chamada:", err);
        setError("Erro ao configurar chamada: " + err.message);
        setIsConnecting(false);
      }
    };
    
    setupCall();
    
    // Limpeza ao desmontar
    return () => {
      console.log("🧹 Limpando recursos da chamada");
      
      // Limpar listeners
      if (cleanup) cleanup();
      
      // Fechar conexão peer
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      
      // Parar streams
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [authUser._id, isIncoming, isVideo, userId]);

  // Toggle mudo
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
  
  // Toggle vídeo
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
  
  // Encerrar chamada
  const endCall = () => {
    console.log("📞 Encerrando chamada");
    
    emitSocketEvent("call:end", {
      userId: authUser._id,
      callId: Date.now().toString()
    });
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    toast.success("Chamada encerrada");
    onClose();
  };

  // Exibir erro se houver
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
              {!isIncoming ? 'Chamando...' : 'Conectando...'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WebRTCCall;