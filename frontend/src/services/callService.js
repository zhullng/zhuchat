// src/services/callService.js
import SimplePeer from 'simple-peer';
import { getSocket } from './socket.js';

// Simplificando as constraints para máxima compatibilidade em dispositivos móveis
const mediaConstraints = {
  video: true, // Simplificado para maior compatibilidade
  audio: true
};

class CallService {
  constructor() {
    this.socket = null;
    this.peer = null;
    this.localStream = null;
    this.onIncomingCall = null;
    this.onRemoteStream = null;
    this.onCallEnded = null;
    this.currentCallId = null;
    this.callerId = null;
    this.calleeId = null;
  }

  init(socketInstance, userId) {
    console.log("Inicializando serviço de chamadas para usuário:", userId);
    
    // Limpar qualquer instância anterior
    this._cleanup();
    
    this.socket = socketInstance;
    this.userId = userId;

    if (!this.socket) {
      console.error("Socket não inicializado");
      return;
    }

    // Remover listeners anteriores para evitar duplicações
    this.socket.off('call:incoming');
    this.socket.off('call:accepted');
    this.socket.off('call:rejected');
    this.socket.off('call:signal');
    this.socket.off('call:ended');

    // Adicionar os listeners para eventos de chamada
    this.socket.on('call:incoming', (data) => {
      console.log("Chamada recebida:", data);
      this._handleIncomingCall(data);
    });
    
    this.socket.on('call:accepted', (data) => {
      console.log("Chamada aceita:", data);
      this._handleCallAccepted(data);
    });
    
    this.socket.on('call:rejected', (data) => {
      console.log("Chamada rejeitada:", data);
      this._handleCallRejected(data);
    });
    
    this.socket.on('call:signal', (data) => {
      console.log("Sinal recebido tipo:", data.signal?.type);
      this._handleCallSignal(data);
    });
    
    this.socket.on('call:ended', (data) => {
      console.log("Chamada encerrada:", data);
      this._handleCallEnded(data);
    });
    
    console.log("Listeners de eventos de chamada configurados");
  }

  _cleanup() {
    // Limpar recursos
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    this.currentCallId = null;
    this.callerId = null;
    this.calleeId = null;
  }

  registerCallbacks({ onIncomingCall, onRemoteStream, onCallEnded }) {
    this.onIncomingCall = onIncomingCall;
    this.onRemoteStream = onRemoteStream;
    this.onCallEnded = onCallEnded;
    console.log("Callbacks de chamada registrados");
  }

  async getLocalStream(withVideo = true) {
    try {
      console.log("Solicitando acesso à mídia local:", withVideo ? "vídeo+áudio" : "apenas áudio");
      
      let stream;
      
      // Tente obter o stream com configurações mais simples
      try {
        const constraints = {
          audio: true,
          video: withVideo ? true : false // Configuração simplificada para maior compatibilidade
        };
        
        console.log("Usando constraints:", JSON.stringify(constraints));
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log("Stream obtido com sucesso");
      } catch (initialError) {
        console.error("Erro inicial ao obter mídia:", initialError);
        
        // Se falhar e for uma chamada de vídeo, tente com apenas áudio
        if (withVideo) {
          console.log("Tentando fallback para apenas áudio");
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          console.log("Stream de áudio obtido como fallback");
        } else {
          throw initialError;
        }
      }
      
      // Verificar as faixas obtidas
      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();
      
      console.log(`Stream obtido com ${videoTracks.length} faixas de vídeo e ${audioTracks.length} faixas de áudio`);
      
      this.localStream = stream;
      return stream;
    } catch (error) {
      console.error('Erro ao acessar mídia local:', error);
      console.error('Nome do erro:', error.name);
      console.error('Mensagem:', error.message);
      throw error;
    }
  }

  initiateCall(targetUserId, callType) {
    return new Promise((resolve, reject) => {
      console.log(`Iniciando chamada ${callType} para o usuário ${targetUserId}`);
      
      const socket = this.socket || getSocket();
      
      if (!socket) {
        console.error("Socket não disponível para iniciar chamada");
        reject(new Error('Socket não inicializado'));
        return;
      }
      
      if (!this.localStream) {
        console.error("Stream local não disponível para iniciar chamada");
        reject(new Error('Stream local não inicializado'));
        return;
      }

      this.currentCallId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.calleeId = targetUserId;

      console.log(`Emitindo evento call:initiate com ID de chamada: ${this.currentCallId}`);
      
      socket.emit('call:initiate', {
        targetUserId,
        callerId: this.userId,
        callType,
        callId: this.currentCallId
      }, (response) => {
        console.log("Resposta do evento call:initiate:", response);
        
        if (response && response.success) {
          console.log("Chamada iniciada com sucesso");
          resolve();
        } else {
          console.error("Erro ao iniciar chamada:", response);
          reject(new Error(response?.message || 'Falha ao iniciar chamada'));
        }
      });
    });
  }

  acceptCall(callerId) {
    return new Promise((resolve, reject) => {
      console.log(`Aceitando chamada do usuário ${callerId}, ID: ${this.currentCallId}`);
      
      const socket = this.socket || getSocket();
      
      if (!socket) {
        console.error("Socket não disponível para aceitar chamada");
        reject(new Error('Socket não inicializado'));
        return;
      }
      
      if (!this.localStream) {
        console.error("Stream local não disponível para aceitar chamada");
        reject(new Error('Stream local não inicializado'));
        return;
      }

      this.callerId = callerId;

      console.log("Emitindo evento call:accept");
      
      socket.emit('call:accept', {
        callerId,
        calleeId: this.userId,
        callId: this.currentCallId
      }, (response) => {
        console.log("Resposta do evento call:accept:", response);
        
        if (response && response.success) {
          console.log("Chamada aceita com sucesso, criando peer");
          this._createPeer(false);
          resolve();
        } else {
          console.error("Erro ao aceitar chamada:", response);
          reject(new Error(response?.message || 'Falha ao aceitar chamada'));
        }
      });
    });
  }

  rejectCall(callerId) {
    return new Promise((resolve) => {
      console.log(`Rejeitando chamada do usuário ${callerId}`);
      
      const socket = this.socket || getSocket();
      
      if (socket) {
        socket.emit('call:reject', {
          callerId,
          calleeId: this.userId,
          callId: this.currentCallId
        });
        console.log("Evento call:reject emitido");
      } else {
        console.warn("Socket não disponível para rejeitar chamada");
      }
      
      this.currentCallId = null;
      this.callerId = null;
      resolve();
    });
  }

  endCurrentCall() {
    return new Promise((resolve) => {
      console.log("Encerrando chamada atual");
      
      if (this.peer) {
        console.log("Destruindo peer");
        this.peer.destroy();
        this.peer = null;
      }

      const socket = this.socket || getSocket();
      
      if (socket && this.currentCallId) {
        console.log(`Emitindo evento call:end para ID de chamada: ${this.currentCallId}`);
        
        socket.emit('call:end', {
          userId: this.userId,
          callId: this.currentCallId
        });
      } else if (!socket) {
        console.warn("Socket não disponível para encerrar chamada");
      }

      this.currentCallId = null;
      this.callerId = null;
      this.calleeId = null;
      
      resolve();
    });
  }

  _handleIncomingCall(data) {
    const { callerId, callerName, callType, callId } = data;
    console.log(`Chamada recebida de ${callerName || callerId} (${callType}), ID: ${callId}`);
    
    this.currentCallId = callId;
    this.callerId = callerId;
    
    if (this.onIncomingCall) {
      console.log("Notificando aplicação sobre chamada recebida");
      this.onIncomingCall(callerId, callerName || "Usuário", callType);
    } else {
      console.warn("Callback onIncomingCall não configurado");
    }
  }

  _handleCallAccepted(data) {
    console.log("Chamada aceita pelo destinatário", data);
    this._createPeer(true);
  }

  _handleCallRejected(data) {
    console.log("Chamada rejeitada pelo destinatário", data);
    
    this.currentCallId = null;
    this.callerId = null;
    this.calleeId = null;
    
    if (this.onCallEnded) {
      this.onCallEnded('rejected');
    }
  }

  _handleCallSignal(data) {
    const { signal } = data;
    
    console.log("Sinal WebRTC recebido:", signal ? signal.type : "indefinido");
    
    if (this.peer) {
      this.peer.signal(signal);
    } else {
      console.warn("Recebido sinal, mas peer não está inicializado");
    }
  }

  _handleCallEnded(data) {
    console.log("Evento call:ended recebido", data);
    
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    
    this.currentCallId = null;
    this.callerId = null;
    this.calleeId = null;
    
    if (this.onCallEnded) {
      this.onCallEnded('ended');
    }
  }

  _createPeer(initiator) {
    console.log(`Criando peer como ${initiator ? 'iniciador' : 'receptor'}`);
    
    if (this.peer) {
      console.log("Destruindo peer existente antes de criar um novo");
      this.peer.destroy();
      this.peer = null;
    }

    try {
      // Criar o peer com configurações de servidores STUN para melhor conectividade
      this.peer = new SimplePeer({
        initiator,
        stream: this.localStream,
        trickle: true,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });

      const socket = this.socket || getSocket();
      
      if (!socket) {
        console.error("Socket não disponível para sinalização WebRTC");
        return;
      }

      this.peer.on('signal', (signal) => {
        console.log("Enviando sinal:", signal.type);
        
        socket.emit('call:signal', {
          signal,
          targetUserId: initiator ? this.calleeId : this.callerId,
          callId: this.currentCallId
        });
      });

      this.peer.on('connect', () => {
        console.log("Conexão WebRTC estabelecida!");
      });

      this.peer.on('stream', (stream) => {
        console.log("Stream remoto recebido");
        
        if (this.onRemoteStream) {
          this.onRemoteStream(stream);
        } else {
          console.warn("Callback onRemoteStream não configurado");
        }
      });

      this.peer.on('error', (err) => {
        console.error('Erro no peer WebRTC:', err);
        this.endCurrentCall();
      });

      this.peer.on('close', () => {
        console.log("Conexão WebRTC fechada");
        this.peer = null;
        this.endCurrentCall();
      });
    } catch (error) {
      console.error("Erro ao criar peer:", error);
      this.endCurrentCall();
    }
  }
}

const callService = new CallService();
export default callService;