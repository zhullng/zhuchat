// src/store/useCallStore.js
import { create } from 'zustand';
import callService from '../services/callService';

const useCallStore = create((set, get) => ({
  callState: 'idle', // idle, calling, incoming, ongoing, ending
  callType: null, // 'video' ou 'voice'
  callerId: null,
  callerName: null,
  calleeId: null,
  calleeName: null,
  
  localStream: null,
  remoteStream: null,
  
  isAudioMuted: false,
  isVideoOff: false,
  
  startCall: async (userId, username, type = 'video') => {
    try {
      set({ 
        callState: 'calling',
        callType: type,
        calleeId: userId,
        calleeName: username 
      });
      
      const stream = await callService.getLocalStream(type === 'video');
      set({ localStream: stream });
      
      await callService.initiateCall(userId, type);
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
      
      const stream = await callService.getLocalStream(callType === 'video');
      set({ localStream: stream, callState: 'ongoing' });
      
      await callService.acceptCall(callerId);
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
    
    if (callState !== 'idle') {
      set({ callState: 'ending' });
      
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      
      await callService.endCurrentCall();
      
      get().resetCallState();
    }
  },
  
  setRemoteStream: (stream) => {
    set({ remoteStream: stream, callState: 'ongoing' });
  },
  
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