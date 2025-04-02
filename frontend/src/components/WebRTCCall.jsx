import React, { useEffect, useRef } from "react";
import { X, Mic, MicOff, Camera, CameraOff, PhoneOff } from "lucide-react";
import toast from "react-hot-toast";
import useCallStore from "../store/useCallStore";

/**
 * WebRTC Call Component
 * Componente simplificado que usa o CallStore para gerenciar o estado da chamada
 */
const WebRTCCall = ({ onClose }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  
  // Obter estado da chamada
  const {
    callState,
    callType,
    calleeId,
    calleeName,
    callerId,
    callerName,
    localStream,
    remoteStream,
    isAudioMuted,
    isVideoOff,
    toggleAudio,
    toggleVideo,
    endCall
  } = useCallStore();
  
  // Nome do outro usuário (chamador ou chamado)
  const otherUserName = callState === 'calling' 
    ? calleeName || 'Usuário' 
    : callerName || 'Usuário';
  
  // Configurar referências de vídeo quando os streams mudarem
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
    
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [localStream, remoteStream]);
  
  // Determinar se estamos conectando ou conectados
  const isConnecting = callState === 'calling' || (callState === 'ongoing' && !remoteStream);
  const isConnected = callState === 'ongoing' && remoteStream;
  
  // Lidar com encerramento da chamada
  const handleEndCall = () => {
    endCall();
    if (onClose) onClose();
  };
  
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="p-4 flex justify-between items-center bg-gray-900">
        <h2 className="text-white font-medium">
          {isConnecting 
            ? `Chamando ${otherUserName}...` 
            : isConnected 
              ? `Chamada com ${otherUserName}` 
              : 'Conectando...'}
        </h2>
        <button 
          onClick={handleEndCall}
          className="p-2 rounded-full bg-red-500 text-white"
          title="Encerrar chamada"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 relative bg-gray-800">
        {/* Vídeo remoto (tela cheia) */}
        <div className="absolute inset-0">
          {callType === 'video' && (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover bg-gray-900"
            />
          )}
          
          {(!isConnected || callType !== 'video') && (
            <div className="w-full h-full flex items-center justify-center">
              <div className="bg-gray-700 rounded-full p-8">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                  <circle cx="12" cy="8" r="5" />
                  <path d="M20 21a8 8 0 0 0-16 0" />
                </svg>
              </div>
            </div>
          )}
        </div>
        
        {/* Vídeo local (pequeno overlay) */}
        {callType === 'video' && (
          <div className="absolute bottom-4 right-4 w-1/4 h-1/4 max-w-xs max-h-xs rounded-lg overflow-hidden border-2 border-white shadow-lg">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover bg-gray-900"
            />
          </div>
        )}
        
        {/* Controles */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
          <button 
            onClick={toggleAudio}
            className={`p-3 rounded-full ${isAudioMuted ? 'bg-red-500' : 'bg-gray-700'} text-white`}
          >
            {isAudioMuted ? <MicOff size={24} /> : <Mic size={24} />}
          </button>
          
          {callType === 'video' && (
            <button 
              onClick={toggleVideo}
              className={`p-3 rounded-full ${isVideoOff ? 'bg-red-500' : 'bg-gray-700'} text-white`}
            >
              {isVideoOff ? <CameraOff size={24} /> : <Camera size={24} />}
            </button>
          )}
          
          <button 
            onClick={handleEndCall}
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
              {callState === 'calling' ? 'Chamando...' : 'Conectando...'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WebRTCCall;