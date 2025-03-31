// src/components/CallInterface.jsx
import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';
import useCallStore from '../store/useCallStore';

const CallInterface = () => {
  const { 
    callState, callType, 
    calleeName, callerName, 
    localStream, remoteStream,
    isAudioMuted, isVideoOff,
    toggleAudio, toggleVideo, endCall
  } = useCallStore();
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [callDuration, setCallDuration] = useState(0);
  const [callTimer, setCallTimer] = useState(null);

  // Configurar os streams de vídeo quando disponíveis
  useEffect(() => {
    console.log("CallInterface - Atualizando referências de stream");
    
    // Stream local
    if (localStream && localVideoRef.current) {
      console.log("Configurando stream local no elemento de vídeo");
      localVideoRef.current.srcObject = localStream;
      
      // Em alguns dispositivos, chamar play() pode ser necessário
      localVideoRef.current.play().catch(e => 
        console.log("Não foi possível reproduzir vídeo local automaticamente:", e)
      );
    }
    
    // Stream remoto
    if (remoteStream && remoteVideoRef.current) {
      console.log("Configurando stream remoto no elemento de vídeo");
      remoteVideoRef.current.srcObject = remoteStream;
      
      // Em alguns dispositivos, chamar play() pode ser necessário
      remoteVideoRef.current.play().catch(e => 
        console.log("Não foi possível reproduzir vídeo remoto automaticamente:", e)
      );
    }
  }, [localStream, remoteStream]);

  // Iniciar timer da chamada quando conectada
  useEffect(() => {
    if (callState === 'ongoing' && !callTimer) {
      console.log("Iniciando timer de duração da chamada");
      const timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
      
      setCallTimer(timer);
    }
    
    return () => {
      if (callTimer) {
        console.log("Limpando timer de duração da chamada");
        clearInterval(callTimer);
      }
    };
  }, [callState, callTimer]);

  // Formatar duração da chamada
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' + secs : secs}`;
  };

  // Nome a ser exibido na chamada
  const displayName = calleeName || callerName || 'Usuário';
  
  // Status da chamada
  const getCallStatus = () => {
    switch (callState) {
      case 'calling':
        return `Chamando ${displayName}...`;
      case 'ongoing':
        return formatDuration(callDuration);
      default:
        return 'Conectando...';
    }
  };

  // Handler para encerrar chamada com confirmação
  const handleEndCall = () => {
    console.log("Botão de encerrar chamada clicado");
    endCall();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Área principal do vídeo/chamada */}
      <div className="flex-1 relative">
        {/* Vídeo remoto (tela inteira) */}
        {callType === 'video' && remoteStream && (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        )}
        
        {/* Indicador de chamada de voz (quando não há vídeo) */}
        {(callType === 'voice' || !remoteStream) && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center">
              <span className="text-3xl text-white">
                {displayName.substring(0, 1).toUpperCase()}
              </span>
            </div>
          </div>
        )}
        
        {/* Vídeo local (pequeno, no canto) */}
        {callType === 'video' && localStream && (
          <div className="absolute bottom-5 right-5 w-32 h-48 overflow-hidden rounded-lg border-2 border-white">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted // Sempre mute o vídeo local para evitar eco
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        {/* Status da chamada na parte superior */}
        <div className="absolute top-0 left-0 right-0 bg-black bg-opacity-40 text-white p-2 text-center">
          {getCallStatus()}
        </div>
      </div>
      
      {/* Barra de controles - mais larga para facilitar em mobile */}
      <div className="h-24 bg-gray-900 flex items-center justify-between px-4">
        <div className="text-white">
          <div className="font-semibold">{displayName}</div>
          <div className="text-sm opacity-70">{getCallStatus()}</div>
        </div>
        
        <div className="flex gap-4">
          {/* Botão de áudio - Maior para fácil acesso em mobile */}
          <button
            onClick={toggleAudio}
            className={`p-4 rounded-full ${
              isAudioMuted ? 'bg-red-500' : 'bg-gray-700'
            }`}
          >
            {isAudioMuted ? (
              <MicOff className="w-6 h-6 text-white" />
            ) : (
              <Mic className="w-6 h-6 text-white" />
            )}
          </button>
          
          {/* Botão de vídeo (apenas em chamadas de vídeo) */}
          {callType === 'video' && (
            <button
              onClick={toggleVideo}
              className={`p-4 rounded-full ${
                isVideoOff ? 'bg-red-500' : 'bg-gray-700'
              }`}
            >
              {isVideoOff ? (
                <VideoOff className="w-6 h-6 text-white" />
              ) : (
                <Video className="w-6 h-6 text-white" />
              )}
            </button>
          )}
          
          {/* Botão de encerrar chamada - Botão maior e mais destacado */}
          <button
            onClick={handleEndCall}
            className="p-4 rounded-full bg-red-600"
          >
            <PhoneOff className="w-8 h-8 text-white" />
          </button>
        </div>
        
        <div className="w-20"> {/* Espaço vazio para balancear o layout */}
        </div>
      </div>
    </div>
  );
};

export default CallInterface;