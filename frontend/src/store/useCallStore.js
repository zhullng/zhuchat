// src/store/useCallStore.js
import { create } from 'zustand';
import callService from '../services/callService';
import toast from 'react-hot-toast';
import { getSocket, initializeSocket } from '../services/socket';

const useCallStore = create((set, get) => ({
  callState: 'idle', // idle, calling, incoming, ongoing, ending
  callType: null, // 'video' ou 'voice'
  callerId: null,
  callerName: null,
  calleeId: null,
  calleeName: null,
  callId: null,
  
  localStream: null,
  remoteStream: null,
  
  isAudioMuted: false,
  isVideoOff: false,
  
  // Inicializar eventos de chamada
  initialize: async () => {
    try {
      const socket = await initializeSocket();
      if (!socket) return;
      
      console.log("Inicializando listeners de chamada no socket");
      
      // Remover listeners existentes
      socket.off('call:incoming');
      socket.off('call:accepted');
      socket.off('call:rejected');
      
      // Configurar listener para chamadas recebidas
      socket.on('call:incoming', (data) => {
        const { callerId, callerName, callType, callId } = data;
        console.log("Chamada recebida:", data);
        
        // Se já houver uma chamada ativa, rejeitar automaticamente
        if (get().callState !== 'idle') {
          console.log("Já existe uma chamada ativa, rejeitando automaticamente");
          callService.rejectCall(callerId, callId);
          return;
        }
        
        // Notificar sobre chamada recebida
        get().handleIncomingCall(callerId, callerName || "Usuário", callType, callId);
        
        // Reproduzir som de chamada se disponível
        // const ringtone = new Audio("/sounds/ringtone.mp3");
        // ringtone.loop = true;
        // ringtone.play().catch(e => console.log("Não foi possível reproduzir o toque:", e));
      });
      
      // Configurar listener para chamadas aceitas
      socket.on('call:accepted', (data) => {
        console.log("Chamada aceita:", data);
        
        // Iniciar conexão WebRTC como iniciador
        if (get().callState === 'calling') {
          callService.startWebRTCConnection(true);
        }
      });
      
      // Configurar listener para chamadas rejeitadas
      socket.on('call:rejected', (data) => {
        console.log("Chamada rejeitada:", data);
        
        if (get().callState === 'calling') {
          toast.error(`${get().calleeName || 'Usuário'} rejeitou a chamada`, {
            id: 'calling'
          });
          
          get().endCall();
        }
      });
      
      // Configurar callbacks do serviço de chamada
      callService.setOnRemoteStream((stream) => {
        set({ remoteStream: stream, callState: 'ongoing' });
        toast.dismiss('calling');
        toast.dismiss('connecting');
        toast.success("Chamada conectada!");
      });
      
      callService.setOnCallEnded(() => {
        if (get().callState !== 'idle') {
          toast.success("Chamada encerrada pelo outro usuário");
          get().endCall();
        }
      });
    } catch (error) {
      console.error("Erro ao inicializar eventos de chamada:", error);
    }
  },
  
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
  
  handleIncomingCall: (callerId, callerName, callType, callId) => {
    console.log(`Chamada recebida de ${callerName} (${callerId}), tipo: ${callType}`);
    
    // Mostrar um toast para garantir que o usuário veja a chamada mesmo se o modal não aparecer
    toast(`${callerName} está chamando você`, {
      icon: callType === 'video' ? '📹' : '📞',
      duration: 30000, // 30 segundos
      id: 'incoming-call'
    });
    
    set({ 
      callState: 'incoming',
      callType,
      callerId,
      callerName,
      callId
    });
  },
  
  acceptCall: async () => {
    try {
      console.log("Aceitando chamada recebida");
      const { callType, callerId, callerName, callId } = get();
      
      // Mostrar toast para informar o usuário
      toast.loading(`Conectando...`, { id: 'connecting' });
      toast.dismiss('incoming-call');
      
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
      await callService.acceptCall(callerId, callId);
      
      // IMPORTANTE: Adicionar timeout para iniciar conexão WebRTC,
      // para dar tempo ao servidor processar a aceitação
      setTimeout(async () => {
        // Iniciar conexão WebRTC como receptor
        console.log("Iniciando conexão WebRTC como receptor");
        await callService.startWebRTCConnection(false);
      }, 1000);
      
      console.log("Chamada aceita com sucesso");
    } catch (error) {
      console.error('Erro ao aceitar chamada:', error);
      toast.error(`Erro ao conectar: ${error.message}`, { id: 'connecting' });
      get().endCall();
    }
  },
  
  rejectCall: async () => {
    console.log("Rejeitando chamada recebida");
    const { callerId, callId } = get();
    
    toast.dismiss('incoming-call');
    callService.rejectCall(callerId, callId);
    toast.success('Chamada rejeitada');
    get().resetCallState();
  },
  
  endCall: async () => {
    const { callState, localStream } = get();
    
    // Só encerra se houver uma chamada ativa
    if (callState !== 'idle') {
      console.log("Encerrando chamada atual");
      
      // Mudar estado primeiro
      set({ callState: 'ending' });
      
      // Limpar toasts
      toast.dismiss('calling');
      toast.dismiss('connecting');
      toast.dismiss('incoming-call');
      
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
      callId: null,
      localStream: null,
      remoteStream: null,
      isAudioMuted: false,
      isVideoOff: false
    });
  }
}));

export default useCallStore;