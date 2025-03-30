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

  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
    
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [localStream, remoteStream]);

  useEffect(() => {
    if (callState === 'ongoing' && !callTimer) {
      const timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
      
      setCallTimer(timer);
    }
    
    return () => {
      if (callTimer) {
        clearInterval(callTimer);
      }
    };
  }, [callState, callTimer]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' + secs : secs}`;
  };

  const displayName = calleeName || callerName || 'Usuário';
  
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

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex-1 relative">
        {callType === 'video' && remoteStream && (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        )}
        
        {(callType === 'voice' || !remoteStream) && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center">
              <span className="text-2xl text-white">
                {displayName.substring(0, 1).toUpperCase()}
              </span>
            </div>
          </div>
        )}
        
        {callType === 'video' && localStream && (
          <div className="absolute bottom-5 right-5 w-32 h-48 overflow-hidden rounded-lg border-2 border-white">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>
      
      <div className="h-20 bg-gray-900 flex items-center justify-between px-4">
        <div className="text-white">
          <div className="font-semibold">{displayName}</div>
          <div className="text-sm opacity-70">{getCallStatus()}</div>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={toggleAudio}
            className={`p-3 rounded-full ${
              isAudioMuted ? 'bg-red-500' : 'bg-gray-700'
            }`}
          >
            {isAudioMuted ? (
              <MicOff className="w-6 h-6 text-white" />
            ) : (
              <Mic className="w-6 h-6 text-white" />
            )}
          </button>
          
          {callType === 'video' && (
            <button
              onClick={toggleVideo}
              className={`p-3 rounded-full ${
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
          
          <button
            onClick={endCall}
            className="p-3 rounded-full bg-red-600"
          >
            <PhoneOff className="w-6 h-6 text-white" />
          </button>
        </div>
        
        <div className="w-20"></div>
      </div>
    </div>
  );
};

export default CallInterface;