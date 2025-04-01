import React, { useEffect, useRef, useState } from "react";
import { X, Mic, MicOff, Camera, CameraOff, PhoneOff, Users } from "lucide-react";
import toast from "react-hot-toast";
import { RTCConfig, getMediaConstraints, handleMediaError } from "../lib/webrtcConfig";
import signalingService from "../services/signalingService";

/**
 * WebRTC Group Call Component
 * Uses a simple mesh network topology for group calls
 * For production, consider using a SFU (Selective Forwarding Unit) for better performance
 */
const WebRTCGroupCall = ({ 
  groupId, // ID of group
  groupName, // Name of group
  userName, // Name of calling user
  members = [], // Group members
  onClose, // Callback when call ends
  isVideo = true, // Whether to use video
}) => {
  const localVideoRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const localStreamRef = useRef(null);
  
  const [isConnecting, setIsConnecting] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(!isVideo);
  const [participants, setParticipants] = useState([]);

  // For demo purposes, create simulated participants
  useEffect(() => {
    // In production, this would come from your signaling server
    // Simulating 2-4 participants for demo
    const numberOfParticipants = Math.floor(Math.random() * 3) + 2;
    const demoParticipants = [];
    
    for (let i = 0; i < numberOfParticipants; i++) {
      demoParticipants.push({
        id: `user-${i}`,
        name: `User ${i + 1}`,
        stream: null,
        isConnected: false
      });
    }
    
    setParticipants(demoParticipants);
    
    // Simulate connections after a delay
    setTimeout(() => {
      setIsConnected(true);
      setIsConnecting(false);
      
      // Randomly connect some participants
      const updatedParticipants = demoParticipants.map(p => ({
        ...p,
        isConnected: Math.random() > 0.3 // 70% chance to connect
      }));
      
      setParticipants(updatedParticipants);
      toast.success("Chamada em grupo conectada!");
    }, 3000);
  }, []);
  
  // Configure the WebRTC connections
  useEffect(() => {
    const setupCall = async () => {
      try {
        // Get local media stream (audio/video)
        const mediaConstraints = getMediaConstraints(isVideo);
        
        localStreamRef.current = await navigator.mediaDevices.getUserMedia(mediaConstraints);
        
        // Display local stream
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }
        
        // In a real implementation, you would:
        // 1. Connect to your signaling server
        // 2. Create peer connections for each participant
        // 3. Exchange ICE candidates and SDP offers/answers
        
        toast.success(`Iniciando chamada em grupo ${isVideo ? 'com vídeo' : 'de voz'}...`);
        
      } catch (err) {
        console.error("Error accessing media devices:", err);
        const errorInfo = handleMediaError(err);
        setError(errorInfo.message);
        setIsConnecting(false);
      }
    };
    
    setupCall();
    
    // Cleanup function
    return () => {
      // Close all peer connections
      Object.values(peerConnectionsRef.current).forEach(pc => {
        if (pc) pc.close();
      });
      
      // Stop all tracks from local stream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [groupId, isVideo]);
  
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
  
  const endCall = () => {
    // Close all peer connections
    Object.values(peerConnectionsRef.current).forEach(pc => {
      if (pc) pc.close();
    });
    
    // Stop all tracks from local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    toast.success("Chamada em grupo encerrada");
    onClose();
  };
  
  // Error display
  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        <div className="p-4 flex justify-between items-center bg-gray-900">
          <h2 className="text-white font-medium">Erro na chamada em grupo</h2>
          <button onClick={onClose} className="p-2 rounded-full bg-red-500 text-white">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center bg-gray-800">
          <div className="text-center text-white p-4">
            <div className="bg-red-500 p-4 rounded-lg mb-4">
              <X size={48} className="mx-auto mb-2" />
              <h3 className="text-xl font-bold mb-2">Não foi possível iniciar a chamada em grupo</h3>
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
          {isConnecting ? 'Iniciando chamada em grupo...' : 
           isConnected ? `Chamada em grupo: ${groupName}` : 'Conectando...'}
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
        {/* Grid layout for participants */}
        {isConnected && (
          <div className="grid grid-cols-2 gap-2 p-2 h-full">
            {/* Local video */}
            <div className="relative rounded-lg overflow-hidden bg-gray-900">
              {isVideo ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="flex flex-col items-center">
                    <div className="bg-blue-500 p-4 rounded-full mb-2">
                      <Users size={40} className="text-white" />
                    </div>
                    <div className="text-white font-medium">{userName} (Você)</div>
                  </div>
                </div>
              )}
              <div className="absolute bottom-2 left-2 bg-gray-800 bg-opacity-70 text-white px-2 py-1 rounded text-sm">
                Você {isMuted && "(mudo)"}
              </div>
            </div>
            
            {/* Remote participants */}
            {participants.map((participant, index) => (
              <div key={participant.id} className="relative rounded-lg overflow-hidden bg-gray-900">
                {participant.isConnected ? (
                  isVideo ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="flex flex-col items-center">
                        <div className="bg-green-500 p-4 rounded-full mb-2">
                          <Users size={40} className="text-white" />
                        </div>
                        <div className="text-white font-medium">{participant.name}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="flex flex-col items-center">
                        <div className="bg-green-500 p-4 rounded-full mb-2">
                          <Users size={40} className="text-white" />
                        </div>
                        <div className="text-white font-medium">{participant.name}</div>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="flex flex-col items-center">
                      <div className="bg-gray-500 p-4 rounded-full mb-2">
                        <Users size={40} className="text-gray-300" />
                      </div>
                      <div className="text-gray-300 font-medium">{participant.name}</div>
                      <div className="text-gray-400 text-sm">Conectando...</div>
                    </div>
                  </div>
                )}
                <div className="absolute bottom-2 left-2 bg-gray-800 bg-opacity-70 text-white px-2 py-1 rounded text-sm">
                  {participant.name}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Controls */}
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
        
        {/* Loading overlay */}
        {isConnecting && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-black bg-opacity-70">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
            <p className="text-white ml-4">Conectando à chamada em grupo...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WebRTCGroupCall;