import React, { useEffect } from "react";
import { Phone, PhoneOff, Video } from "lucide-react";
import signalingService from "../services/signalingService";
import toast from "react-hot-toast";

/**
 * Componente para mostrar chamada recebida e permitir atender/rejeitar
 */
const IncomingCall = ({ caller, callId, isVideo, onAccept, onReject }) => {
  
  // Usar useEffect para registro de depuração e configuração de timeout
  useEffect(() => {
    console.log("Chamada recebida exibida:", { caller, callId, isVideo });
    
    // Configurar um timeout para rejeitar automaticamente após um longo período
    const timeoutId = setTimeout(() => {
      console.log("Timeout de chamada recebida atingido, rejeitando automaticamente");
      handleReject();
    }, 45000); // 45 segundos
    
    // Reproduzir som de chamada (se tiver um áudio para isso)
    // const ringtone = new Audio("/sounds/ringtone.mp3");
    // ringtone.loop = true;
    // ringtone.play().catch(e => console.log("Não foi possível reproduzir o toque:", e));
    
    return () => {
      clearTimeout(timeoutId);
      // if (ringtone) {
      //   ringtone.pause();
      //   ringtone.currentTime = 0;
      // }
    };
  }, [callId]);

  const handleAccept = async () => {
    console.log("Aceitando chamada:", callId, "de:", caller.id);
    
    try {
      // Aceitar a chamada através do serviço de sinalização
      await signalingService.acceptCall(caller.id, callId);
      
      toast.success("Chamada aceita!");
      
      // Notificar o componente pai que a chamada foi aceita
      if (onAccept) {
        onAccept(callId, caller.id, isVideo);
      }
    } catch (err) {
      console.error("Erro ao aceitar chamada:", err);
      toast.error("Erro ao aceitar chamada: " + (err.message || "Erro desconhecido"));
      
      // Mesmo com erro, tente iniciar a chamada
      if (onAccept) {
        onAccept(callId, caller.id, isVideo);
      }
    }
  };

  const handleReject = async () => {
    console.log("Rejeitando chamada:", callId, "de:", caller.id);
    
    try {
      // Rejeitar a chamada através do serviço de sinalização
      signalingService.rejectCall(caller.id, callId);
      
      toast.success("Chamada rejeitada");
      
      // Notificar o componente pai que a chamada foi rejeitada
      if (onReject) onReject();
    } catch (err) {
      console.error("Erro ao rejeitar chamada:", err);
      toast.error("Erro ao rejeitar chamada");
      
      // Mesmo com erro, notificar o componente pai para fechar a interface
      if (onReject) onReject();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
      <div className="bg-base-100 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="avatar">
              <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center">
                {isVideo ? (
                  <Video size={36} className="text-blue-600" />
                ) : (
                  <Phone size={36} className="text-blue-600" />
                )}
              </div>
            </div>
          </div>
          <h2 className="text-xl font-bold mb-1">{caller.name || "Usuário"}</h2>
          <p className="text-base-content/70">
            Está chamando você ({isVideo ? "Chamada de vídeo" : "Chamada de voz"})
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