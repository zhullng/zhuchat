// src/components/CallsProvider.jsx
import { useEffect, useState } from 'react';
import useCallStore from '../store/useCallStore';
import callService from '../services/callService';
import { useAuthStore } from '../store/useAuthStore'; 
import CallInterface from './CallInterface';
import IncomingCallModal from './IncomingCallModal';
import { initializeSocket, disconnectSocket } from '../socket';

const CallsProvider = ({ children }) => {
  const { authUser } = useAuthStore();
  const [socketInitialized, setSocketInitialized] = useState(false);
  const { 
    callState, callType, callerId, callerName, 
    handleIncomingCall, setRemoteStream, endCall, 
    acceptCall, rejectCall
  } = useCallStore();

  useEffect(() => {
    if (authUser?._id && !socketInitialized) {
      const socket = initializeSocket();
      
      if (socket) {
        callService.init(socket, authUser._id);

        callService.registerCallbacks({
          onIncomingCall: (callerId, callerName, callType) => {
            handleIncomingCall(callerId, callerName, callType);
          },
          onRemoteStream: (stream) => {
            setRemoteStream(stream);
          },
          onCallEnded: () => {
            endCall();
          }
        });
        
        setSocketInitialized(true);
      }
    }

    return () => {
      endCall();
      disconnectSocket();
    };
  }, [authUser?._id, socketInitialized]);

  return (
    <>
      {(callState === 'calling' || callState === 'ongoing') && (
        <CallInterface />
      )}

      {callState === 'incoming' && (
        <IncomingCallModal
          caller={callerName || 'Alguém'}
          callType={callType}
          onAccept={acceptCall}
          onReject={rejectCall}
        />
      )}

      {children}
    </>
  );
};

export default CallsProvider;