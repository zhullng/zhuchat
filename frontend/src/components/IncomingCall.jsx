import React, { useEffect } from "react";
import { Phone, PhoneOff, Video } from "lucide-react";
import useCallStore from "../store/useCallStore";

/**
 * Componente para mostrar chamada recebida e permitir atender/rejeitar
 */
const IncomingCall = () => {
  const { callState, callerId, callerName, callType, callId, acceptCall, rejectCall } = useCallStore();
  
  // Se não tiver uma chamada recebida, não renderiza nada
  if (callState !== 'incoming') return null;
  
  // Configurar timeout para rejeitar automaticamente após 45 segundos
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      console.log("Timeout de chamada recebida atingido, rejeitando automaticamente");
      rejectCall();
    }, 45000); // 45 segundos
    
    return () => clearTimeout(timeoutId);
  }, [callId, rejectCall]);
  
  // Lidar com aceitação da chamada
  const handleAccept = async () => {
    console.log("Aceitando chamada");
    acceptCall();
  };
  
  // Lidar com rejeição da chamada
  const handleReject = async () => {
    console.log("Rejeitando chamada");
    rejectCall();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
      <div className="bg-base-100 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="avatar">
              <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center">
                {callType === 'video' ? (
                  <Video size={36} className="text-blue-600" />
                ) : (
                  <Phone size={36} className="text-blue-600" />
                )}
              </div>
            </div>
          </div>
          <h2 className="text-xl font-bold mb-1">{callerName || "Usuário"}</h2>
          <p className="text-base-content/70">
            Está chamando você ({callType === 'video' ? "Chamada de vídeo" : "Chamada de voz"})
          </p>
        </div>

        <div className="flex justify-center space-x-6">
          <button
            onClick={handleReject}
            className="btn btn-circle btn-lg bg-red-500 hover:bg-red-600 border-none"
          >
            <PhoneOff size={24} className="text-white" />
          </button>
          <button
            onClick={handleAccept}
            className="btn btn-circle btn-lg bg-green-500 hover:bg-green-600 border-none"
          >
            <Phone size={24} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCall;