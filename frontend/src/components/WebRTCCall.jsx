import React, { useEffect, useRef, useState } from "react";
import { X, Mic, MicOff, Camera, CameraOff, PhoneOff } from "lucide-react";
import toast from "react-hot-toast";
import { RTCConfig, getMediaConstraints, handleMediaError } from "../lib/webrtcConfig";
import signalingService from "../services/signalingService";

/**
 * WebRTC Call Component
 * A direct implementation using browser's WebRTC API
 */
const WebRTCCall = ({ 
  userId, // ID of user being called
  userName, // Name of calling user
  onClose, // Callback when call ends
  isVideo = true, // Whether to use video
}) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  
  const [isConnecting, setIsConnecting] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(!isVideo);

  // Configure the WebRTC connection
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
        
        // Create peer connection with our config
        peerConnectionRef.current = new RTCPeerConnection(RTCConfig);
        
        // Add local tracks to the connection
        localStreamRef.current.getTracks().forEach(track => {
          peerConnectionRef.current.addTrack(track, localStreamRef.current);
        });
        
        // Listen for remote stream
        peerConnectionRef.current.ontrack = (event) => {
          if (remoteVideoRef.current && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0];
            setIsConnected(true);
            setIsConnecting(false);
            toast.success("Chamada conectada!");
          }
        };
        
        // Handle connection state changes
        peerConnectionRef.current.oniceconnectionstatechange = () => {
          console.log("ICE Connection State:", peerConnectionRef.current.iceConnectionState);
          
          if (peerConnectionRef.current.iceConnectionState === "failed" ||
              peerConnectionRef.current.iceConnectionState === "disconnected") {
            toast.error("Conexão perdida");
            setError("Conexão perdida. Tente novamente.");
            setIsConnecting(false);
          }
        };
        
        // Handle ICE candidates
        peerConnectionRef.current.onicecandidate = (event) => {
          if (event.candidate) {
            // Here you would send the ICE candidate to the remote peer through your signaling server
            console.log("New ICE candidate:", event.candidate);
            // signalingService.sendIceCandidate(userId, event.candidate);
          }
        };
        
        // Create and send offer (if initiating the call)
        try {
          const offer = await peerConnectionRef.current.createOffer();
          await peerConnectionRef.current.setLocalDescription(offer);
          
          // In a real app, you'd connect to the signaling service and send the offer
          // signalingService.connect().then(() => {
          //   signalingService.sendOffer(userId, offer);
          // });
          
          toast.success(`Iniciando chamada ${isVideo ? 'com vídeo' : 'de voz'} com ${userName}...`);
          
          // For this demo, we'll simulate the connection after a delay
          setTimeout(() => {
            if (Math.random() > 0.3) { // 70% success rate for demo
              setIsConnected(true);
              setIsConnecting(false);
              toast.success("Chamada conectada!");
            } else {
              setError("Não foi possível conectar à chamada. Verifique sua conexão.");
              setIsConnecting(false);
            }
          }, 3000);
          
        } catch (err) {
          console.error("Error creating offer:", err);
          setError("Erro ao iniciar chamada: " + err.message);
          setIsConnecting(false);
        }
        
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
      // Close peer connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      
      // Stop all tracks from local stream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [userId, userName, isVideo]);
  
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
    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    
    // Stop all tracks from local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    toast.success("Chamada encerrada");
    onClose();
  };
  
  // Error display
  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        <div className="p-4 flex justify-between items-center bg-gray-900">
          <h2 className="text-white font-medium">Erro na chamada</h2>
          <button onClick={onClose} className="p-2 rounded-full bg-red-500 text-white">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center bg-gray-800">
          <div className="text-center text-white p-4">
            <div className="bg-red-500 p-4 rounded-lg mb-4">
              <X size={48} className="mx-auto mb-2" />
              <h3 className="text-xl font-bold mb-2">Não foi possível iniciar a chamada</h3>
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
          {isConnecting ? 'Iniciando chamada...' : isConnected ? 'Chamada em andamento' : 'Conectando...'}
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
        {/* Remote video (full screen) */}
        <div className="absolute inset-0">
          {isVideo && (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          )}
          
          {!isVideo && isConnected && (
            <div className="w-full h-full flex items-center justify-center">
              <div className="bg-gray-700 rounded-full p-8">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                  <path d="M5.5 19.5h-3a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h3"></path>
                  <path d="M5.5 17.5v-7a2 2 0 0 1 2-2H16"></path>
                  <path d="M17.5 13.5v4a2 2 0 0 0 2 2h.5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-4"></path>
                  <path d="M11.5 8.5V6.5a2 2 0 0 1 2-2h.5a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-.5a2 2 0 0 1-2-2z"></path>
                </svg>
              </div>
            </div>
          )}
        </div>
        
        {/* Local video (small overlay) */}
        {isVideo && (
          <div className="absolute bottom-4 right-4 w-1/4 h-1/4 max-w-xs max-h-xs rounded-lg overflow-hidden border-2 border-white shadow-lg">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
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
            <p className="text-white ml-4">Conectando à chamada...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WebRTCCall;