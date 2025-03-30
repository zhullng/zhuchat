// services/callService.js
import SimplePeer from 'simple-peer';

// Configurações de mídia para diferentes tipos de chamada
const mediaConstraints = {
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    facingMode: 'user'
  },
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

  // Inicializar o serviço de chamadas com o socket
  init(socketInstance, userId) {
    this.socket = socketInstance;
    this.userId = userId;

    // Configurar listeners de eventos do socket
    this.socket.on('call:incoming', this._handleIncomingCall.bind(this));
    this.socket.on('call:accepted', this._handleCallAccepted.bind(this));
    this.socket.on('call:rejected', this._handleCallRejected.bind(this));
    this.socket.on('call:signal', this._handleCallSignal.bind(this));
    this.socket.on('call:ended', this._handleCallEnded.bind(this));
  }

  // Registrar callbacks
  registerCallbacks({ onIncomingCall, onRemoteStream, onCallEnded }) {
    this.onIncomingCall = onIncomingCall;
    this.onRemoteStream = onRemoteStream;
    this.onCallEnded = onCallEnded;
  }

  // Obter stream local (áudio/vídeo ou apenas áudio)
  async getLocalStream(withVideo = true) {
    try {
      const constraints = {
        audio: mediaConstraints.audio,
        video: withVideo ? mediaConstraints.video : false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.localStream = stream;
      return stream;
    } catch (error) {
      console.error('Erro ao acessar mídia local:', error);
      throw error;
    }
  }

  // Iniciar uma chamada para outro usuário
  initiateCall(targetUserId, callType) {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.localStream) {
        reject(new Error('Socket ou stream local não inicializado'));
        return;
      }

      // Gerar ID único para a chamada
      this.currentCallId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.calleeId = targetUserId;

      // Enviar sinal de chamada para o servidor
      this.socket.emit('call:initiate', {
        targetUserId,
        callerId: this.userId,
        callType,
        callId: this.currentCallId
      }, (response) => {
        if (response && response.success) {
          resolve();
        } else {
          reject(new Error(response?.message || 'Falha ao iniciar chamada'));
        }
      });
    });
  }

  // Aceitar uma chamada recebida
  acceptCall(callerId) {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.localStream) {
        reject(new Error('Socket ou stream local não inicializado'));
        return;
      }

      this.callerId = callerId;

      // Informar ao servidor que a chamada foi aceita
      this.socket.emit('call:accept', {
        callerId,
        calleeId: this.userId,
        callId: this.currentCallId
      }, (response) => {
        if (response && response.success) {
          // Iniciar peer como receptor da chamada
          this._createPeer(false);
          resolve();
        } else {
          reject(new Error(response?.message || 'Falha ao aceitar chamada'));
        }
      });
    });
  }

  // Rejeitar uma chamada recebida
  rejectCall(callerId) {
    return new Promise((resolve) => {
      if (this.socket) {
        this.socket.emit('call:reject', {
          callerId,
          calleeId: this.userId,
          callId: this.currentCallId
        });
      }
      this.currentCallId = null;
      resolve();
    });
  }

  // Encerrar a chamada atual
  endCurrentCall() {
    return new Promise((resolve) => {
      if (this.peer) {
        this.peer.destroy();
        this.peer = null;
      }

      if (this.socket && this.currentCallId) {
        this.socket.emit('call:end', {
          userId: this.userId,
          callId: this.currentCallId
        });
      }

      this.currentCallId = null;
      this.callerId = null;
      this.calleeId = null;
      resolve();
    });
  }

  // Métodos privados para tratamento de eventos do socket
  _handleIncomingCall(data) {
    const { callerId, callerName, callType, callId } = data;
    this.currentCallId = callId;
    this.callerId = callerId;
    
    if (this.onIncomingCall) {
      this.onIncomingCall(callerId, callerName, callType);
    }
  }

  _handleCallAccepted(data) {
    // A chamada foi aceita, iniciar peer como iniciador
    this._createPeer(true);
  }

  _handleCallRejected() {
    this.currentCallId = null;
    this.callerId = null;
    this.calleeId = null;
    
    if (this.onCallEnded) {
      this.onCallEnded('rejected');
    }
  }

  _handleCallSignal(data) {
    const { signal } = data;
    
    if (this.peer) {
      this.peer.signal(signal);
    }
  }

  _handleCallEnded() {
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

  // Criar um objeto Peer do SimplePeer
  _createPeer(initiator) {
    // Destruir peer existente, se houver
    if (this.peer) {
      this.peer.destroy();
    }

    // Criar novo peer
    this.peer = new SimplePeer({
      initiator,
      stream: this.localStream,
      trickle: true
    });

    // Configurar event listeners do peer
    this.peer.on('signal', (signal) => {
      // Enviar sinal para o outro peer via servidor
      this.socket.emit('call:signal', {
        signal,
        targetUserId: initiator ? this.calleeId : this.callerId,
        callId: this.currentCallId
      });
    });

    this.peer.on('stream', (stream) => {
      // Recebemos o stream do outro peer
      if (this.onRemoteStream) {
        this.onRemoteStream(stream);
      }
    });

    this.peer.on('error', (err) => {
      console.error('Erro no peer WebRTC:', err);
      this.endCurrentCall();
    });

    this.peer.on('close', () => {
      this.peer = null;
      this.endCurrentCall();
    });
  }
}

// Exportar como singleton
const callService = new CallService();
export default callService;