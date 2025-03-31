// src/components/CallsProvider.jsx - Corrigido
import { useEffect, useState, useRef } from 'react';
import useCallStore from '../store/useCallStore';
import callService from '../services/callService';
import { useAuthStore } from '../store/useAuthStore'; 
import CallInterface from './CallInterface';
import IncomingCallModal from './IncomingCallModal';
import { initializeSocket, disconnectSocket, getSocket } from '../services/socket';
import toast from 'react-hot-toast';

const CallsProvider = ({ children }) => {
  const { authUser } = useAuthStore();
  const [socketInitialized, setSocketInitialized] = useState(false);
  const providerMounted = useRef(false);
  const { 
    callState, callType, callerId, callerName, 
    handleIncomingCall, setRemoteStream, endCall, 
    acceptCall, rejectCall
  } = useCallStore();

  // Inicializar o socket e o serviço de chamada quando o componente montar - APENAS UMA VEZ
  useEffect(() => {
    console.log("CallsProvider - Efeito de montagem inicial");
    providerMounted.current = true;
    
    // Esta função só deve executar UMA VEZ quando o componente montar
    if (authUser?._id && !socketInitialized && providerMounted.current) {
      console.log("CallsProvider - Inicializando socket e serviço de chamadas");
      
      try {
        const socket = initializeSocket();
        
        if (socket) {
          console.log("Socket inicializado com sucesso, configurando serviço de chamadas");
          
          // Remover handlers antigos para evitar duplicação
          socket.off("call:incoming");
          
          // Adicionar handler direto aqui também para garantir que seja chamado
          socket.on("call:incoming", (data) => {
            console.log("CHAMADA RECEBIDA NO PROVIDER:", data);
            const { callerId, callerName, callType } = data;
            
            // Notificar o usuário de várias maneiras
            toast.success(`Chamada recebida de ${callerName || "Alguém"}!`, {
              duration: 10000,
              icon: '📞',
            });
            
            // Forçar alerta para garantir que o usuário receba a notificação
            setTimeout(() => {
              if (providerMounted.current) {
                alert(`Chamada recebida de ${callerName || "Alguém"}!`);
              }
            }, 500);
            
            if (providerMounted.current) {
              handleIncomingCall(callerId, callerName || "Usuário", callType);
            }
          });
          
          // Inicializar o serviço com o socket
          callService.init(socket, authUser._id);

          // Registrar callbacks no serviço de chamadas
          callService.registerCallbacks({
            onIncomingCall: (callerId, callerName, callType) => {
              console.log(`Callback onIncomingCall: ${callerName} está chamando (${callType})`);
              if (providerMounted.current) {
                handleIncomingCall(callerId, callerName, callType);
              }
            },
            onRemoteStream: (stream) => {
              console.log("Callback onRemoteStream: stream remoto recebido");
              if (providerMounted.current) {
                setRemoteStream(stream);
              }
            },
            onCallEnded: (reason) => {
              console.log(`Callback onCallEnded: chamada encerrada (${reason})`);
              if (providerMounted.current) {
                endCall();
              }
            }
          });
          
          setSocketInitialized(true);
        } else {
          console.error("Falha ao inicializar socket");
        }
      } catch (error) {
        console.error("Erro ao configurar serviço de chamadas:", error);
      }
    }

    // Cleanup quando o componente desmontar - MUITO IMPORTANTE
    return () => {
      console.log("CallsProvider - Desmontando e limpando recursos");
      providerMounted.current = false;
      
      // Não desconecte o socket aqui, apenas ao deslogar
      // Isso é crucial para manter o socket vivo entre navegações
      
      // Apenas limpar recursos da chamada se estiver em andamento
      if (callState !== 'idle') {
        endCall();
      }
    };
  }, [authUser?._id]); // Remova socketInitialized das dependências para evitar reexecuções

  // Este efeito fará a limpeza completa apenas quando o usuário deslogar
  useEffect(() => {
    if (!authUser) {
      console.log("Usuário deslogado, desconectando socket");
      disconnectSocket();
      setSocketInitialized(false);
    }
  }, [authUser]);

  // Debug log para verificar o estado atual da chamada
  useEffect(() => {
    console.log("Estado atual da chamada:", callState);
  }, [callState]);

  return (
    <>
      {/* Renderizar a interface de chamada quando uma chamada estiver em andamento */}
      {(callState === 'calling' || callState === 'ongoing') && (
        <CallInterface />
      )}

      {/* Modal de chamada recebida */}
      {callState === 'incoming' && (
        <IncomingCallModal
          caller={callerName || 'Usuário'}
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