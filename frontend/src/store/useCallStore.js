// store/useCallStore.js
import { create } from 'zustand';
import callService from '../services/callService';

const useCallStore = create((set, get) => ({
  // Estado da chamada
  callState: 'idle', // idle, calling, incoming, ongoing, ending
  callType: null, // 'video' ou 'voice'
  callerId: null,
  callerName: null,
  calleeId: null,
  calleeName: null,
  
  // Streams
  localStream: null,
  remoteStream: null,
  
  // Controles de mídia
  isAudioMuted: false,
  isVideoOff: false,
  
  // Ações
  startCall: async (userId, username, type = 'video') => {
    try {
      set({ 
        callState: 'calling',
        callType: type,
        calleeId: userId,
        calleeName: username 
      });
      
      // Iniciar stream local
      const stream = await callService.getLocalStream(type === 'video');
      set({ localStream: stream });
      
      // Iniciar sinalização para o outro usuário
      await callService.initiateCall(userId, type);
      
      // O resto da lógica (conexão peer) será tratado pelos eventos do socket
    } catch (error) {
      console.error('Erro ao iniciar chamada:', error);
      get().endCall();
    }
  },
  
  handleIncomingCall: (callerId, callerName, callType) => {
    set({ 
      callState: 'incoming',
      callType,
      callerId,
      callerName
    });
  },
  
  acceptCall: async () => {
    try {
      const { callType, callerId } = get();
      
      // Obter stream local
      const stream = await callService.getLocalStream(callType === 'video');
      set({ localStream: stream, callState: 'ongoing' });
      
      // Aceitar a chamada no serviço
      await callService.acceptCall(callerId);
      
      // Eventos do socket tratarão a conexão peer
    } catch (error) {
      console.error('Erro ao aceitar chamada:', error);
      get().endCall();
    }
  },
  
  rejectCall: async () => {
    const { callerId } = get();
    await callService.rejectCall(callerId);
    get().resetCallState();
  },
  
  endCall: async () => {
    const { callState, localStream } = get();
    
    // Só termina se houver uma chamada ativa
    if (callState !== 'idle') {
      set({ callState: 'ending' });
      
      // Parar streams
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      
      // Desconectar peer
      await callService.endCurrentCall();
      
      get().resetCallState();
    }
  },
  
  // Definir stream remoto quando a conexão for estabelecida
  setRemoteStream: (stream) => {
    set({ remoteStream: stream, callState: 'ongoing' });
  },
  
  // Controles de mídia
  toggleAudio: () => {
    const { localStream, isAudioMuted } = get();
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = isAudioMuted;
      });
      set({ isAudioMuted: !isAudioMuted });
    }
  },
  
  toggleVideo: () => {
    const { localStream, isVideoOff, callType } = get();
    if (localStream && callType === 'video') {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = isVideoOff;
      });
      set({ isVideoOff: !isVideoOff });
    }
  },
  
  // Resetar o estado
  resetCallState: () => {
    set({
      callState: 'idle',
      callType: null,
      callerId: null,
      callerName: null,
      calleeId: null,
      calleeName: null,
      localStream: null,
      remoteStream: null,
      isAudioMuted: false,
      isVideoOff: false
    });
  }
}));

export default useCallStore;