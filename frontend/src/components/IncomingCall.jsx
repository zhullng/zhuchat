import React from "react";
import { Phone, PhoneOff, Video } from "lucide-react";
import signalingService from "../services/signalingService";

/**
 * Componente para mostrar chamada recebida e permitir atender/rejeitar
 */
const IncomingCall = ({ caller, callId, isVideo, onAccept, onReject }) => {
  const handleAccept = () => {
    // Aceitar a chamada através do serviço de sinalização
    signalingService.acceptCall(caller.id, callId)
      .then(() => {
        // Notificar o componente pai que a chamada foi aceita
        if (onAccept) onAccept(callId, caller.id, isVideo);
      })
      .catch(err => {
        console.error("Erro ao aceitar chamada:", err);
      });
  };

  const handleReject = () => {
    // Rejeitar a chamada através do serviço de sinalização
    signalingService.rejectCall(caller.id, callId);
    
    // Notificar o componente pai que a chamada foi rejeitada
    if (onReject) onReject();
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