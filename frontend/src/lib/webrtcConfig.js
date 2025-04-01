// src/lib/webrtcConfig.js

/**
 * Configuration options for WebRTC peer connections
 */

export const RTCConfig = {
    iceServers: [
      // Free public STUN servers
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
      { urls: "stun:stun3.l.google.com:19302" },
      { urls: "stun:stun4.l.google.com:19302" },
      
      // In a production environment, you would also include TURN servers
      // TURN servers require authentication and typically aren't free
      // Example:
      // {
      //   urls: 'turn:turn.example.com:3478',
      //   username: 'username',
      //   credential: 'password'
      // }
    ],
    iceCandidatePoolSize: 10,
  };
  
  /**
   * Default media constraints for getUserMedia
   */
  export const DEFAULT_MEDIA_CONSTRAINTS = {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30 }
    }
  };
  
  /**
   * Media constraints for audio-only calls
   */
  export const AUDIO_ONLY_CONSTRAINTS = {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: false
  };
  
  /**
   * Helper function to get appropriate media constraints based on call type
   */
  export const getMediaConstraints = (isVideo = true) => {
    return isVideo ? DEFAULT_MEDIA_CONSTRAINTS : AUDIO_ONLY_CONSTRAINTS;
  };
  
  /**
   * Helper function to handle getUserMedia errors
   */
  export const handleMediaError = (error) => {
    console.error('Media error:', error);
    
    if (error.name === 'NotAllowedError') {
      return {
        type: 'permission',
        message: 'Permissão de câmera/microfone negada. Verifique as permissões do navegador.'
      };
    } else if (error.name === 'NotFoundError') {
      return {
        type: 'device',
        message: 'Câmera ou microfone não encontrado. Verifique se os dispositivos estão conectados.'
      };
    } else if (error.name === 'NotReadableError') {
      return {
        type: 'hardware',
        message: 'Não foi possível acessar a câmera ou microfone. O dispositivo pode estar sendo usado por outro aplicativo.'
      };
    } else if (error.name === 'OverconstrainedError') {
      return {
        type: 'constraints',
        message: 'As restrições de mídia não puderam ser satisfeitas.'
      };
    }
    
    return {
      type: 'unknown',
      message: `Erro ao acessar dispositivos de mídia: ${error.message}`
    };
  };