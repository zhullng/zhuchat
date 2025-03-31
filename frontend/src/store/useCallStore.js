// src/store/useCallStore.js
import { create } from 'zustand';
import callService from '../services/callService';
import toast from 'react-hot-toast';

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
      console.log(`Iniciando chamada ${type} para ${username} (${userId})`);
      
      // Primeiro atualize o estado para mostrar a interface
      set({ 
        callState: 'calling',
        callType: type,
        calleeId: userId,
        calleeName: username 
      });
      
      // Notificar o usuário
      toast.loading(`Chamando ${username}...`, { id: 'calling' });
      
      // Obter stream local
      console.log("Solicitando stream local para chamada");
      const stream = await callService.getLocalStream(type === 'video');
      set({ localStream: stream });
      
      // Iniciar a chamada no serviço
      await callService.initiateCall(userId, type);
      
      console.log("Chamada iniciada com sucesso");
    } catch (error) {
      console.error('Erro ao iniciar chamada:', error);
      toast.error(`Não foi possível chamar ${username}: ${error.message}`, { id: 'calling' });
      get().endCall();
    }
  },
  
  handleIncomingCall: (callerId, callerName, callType) => {
    console.log(`Chamada recebida de ${callerName} (${callerId}), tipo: ${callType}`);
    
    // Mostrar um toast para garantir que o usuário veja a chamada mesmo se o modal não aparecer
    toast('Chamada recebida', {
      icon: callType === 'video' ? '📹' : '📞',
      duration: 10000, // 10 segundos
    });
    
    set({ 
      callState: 'incoming',
      callType,
      callerId,
      callerName
    });
  },
  
  acceptCall: async () => {
    try {
      console.log("Aceitando chamada recebida");
      const { callType, callerId, callerName } = get();
      
      // Mostrar toast para informar o usuário
      toast.loading(`Conectando...`, { id: 'connecting' });
      
      // Obter o stream local ANTES de atualizar o estado
      console.log("Obtendo stream local para aceitar chamada");
      const stream = await callService.getLocalStream(callType === 'video');
      
      // Atualizar o estado com o stream obtido
      set({ 
        localStream: stream,
        callState: 'ongoing' // Mude o estado para 'ongoing' para mostrar a interface
      });
      
      // Emitir sinal de aceitação
      console.log("Enviando sinal de aceitação da chamada");
      await callService.acceptCall(callerId);
      
      console.log("Chamada aceita com sucesso");
    } catch (error) {
      console.error('Erro ao aceitar chamada:', error);
      toast.error(`Erro ao conectar: ${error.message}`, { id: 'connecting' });
      get().endCall();
    }
  },
  
  rejectCall: async () => {
    console.log("Rejeitando chamada recebida");
    const { callerId } = get();
    
    await callService.rejectCall(callerId);
    toast.success('Chamada rejeitada');
    get().resetCallState();
  },
  
  endCall: async () => {
    const { callState, localStream, calleeName, callerName } = get();
    
    // Só encerra se houver uma chamada ativa
    if (callState !== 'idle') {
      console.log("Encerrando chamada atual");
      
      // Mudar estado primeiro
      set({ callState: 'ending' });
      
      // Limpar toasts
      toast.dismiss('calling');
      toast.dismiss('connecting');
      
      // Mostrar notificação
      const displayName = calleeName || callerName || 'Usuário';
      toast.success(`Chamada com ${displayName} encerrada`);
      
      // Parar streams
      if (localStream) {
        console.log("Parando tracks do stream local");
        try {
          localStream.getTracks().forEach(track => {
            track.stop();
          });
        } catch (e) {
          console.error("Erro ao parar tracks:", e);
        }
      }
      
      // Encerrar a chamada no serviço
      await callService.endCurrentCall();
      
      // Resetar o estado
      get().resetCallState();
    }
  },
  
  // Definir stream remoto quando a conexão for estabelecida
  setRemoteStream: (stream) => {
    console.log("Stream remoto recebido e configurado");
    toast.dismiss('connecting');
    toast.success('Chamada conectada');
    
    set({ 
      remoteStream: stream, 
      callState: 'ongoing' 
    });
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
      
      toast(isAudioMuted ? 'Microfone ativado' : 'Microfone desativado', { 
        icon: isAudioMuted ? '🎙️' : '🔇',
        duration: 1500
      });
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
      
      toast(isVideoOff ? 'Câmera ativada' : 'Câmera desativada', { 
        icon: isVideoOff ? '📹' : '🚫',
        duration: 1500
      });
    }
  },
  
  // Resetar o estado
  resetCallState: () => {
    console.log("Resetando estado da chamada");
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