// components/CallsProvider.jsx
import { useEffect } from 'react';
import useCallStore from '../store/useCallStore';
import callService from '../services/callService';
import { useAuthStore } from '../store/useAuthStore'; 
import CallInterface from './CallInterface';
import IncomingCallModal from './IncomingCallModal';

// Este componente vai configurar e gerenciar as chamadas em nível de aplicativo
const CallsProvider = ({ socket, children }) => {
  const { authUser } = useAuthStore();
  const { 
    callState, callType, callerId, callerName, 
    localStream, remoteStream, 
    handleIncomingCall, setRemoteStream, endCall, 
    acceptCall, rejectCall
  } = useCallStore();

  // Inicializar o serviço de chamada quando o componente montar
  useEffect(() => {
    if (socket && authUser?._id) {
      // Inicializar o serviço com o socket existente
      callService.init(socket, authUser._id);

      // Registrar callbacks no serviço de chamadas
      callService.registerCallbacks({
        onIncomingCall: (callerId, callerName, callType) => {
          handleIncomingCall(callerId, callerName, callType);
        },
        onRemoteStream: (stream) => {
          setRemoteStream(stream);
        },
        onCallEnded: (reason) => {
          endCall();
        }
      });
    }

    // Cleanup quando o componente desmontar
    return () => {
      // Encerrar chamadas ativas ao desmontar
      endCall();
    };
  }, [socket, authUser?._id]);

  return (
    <>
      {/* Renderizar a interface de chamada quando uma chamada estiver em andamento */}
      {(callState === 'calling' || callState === 'ongoing') && (
        <CallInterface />
      )}

      {/* Modal de chamada recebida */}
      {callState === 'incoming' && (
        <IncomingCallModal
          caller={callerName || 'Alguém'}
          callType={callType}
          onAccept={acceptCall}
          onReject={rejectCall}
        />
      )}

      {/* Renderizar o resto da aplicação */}
      {children}
    </>
  );
};

export default CallsProvider;