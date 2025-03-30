// src/services/callService.js
import SimplePeer from 'simple-peer';
import { getSocket } from './socket.js';

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

  init(socketInstance, userId) {
    this.socket = socketInstance;
    this.userId = userId;

    if (!this.socket) {
      console.error("Socket não inicializado");
      return;
    }

    this.socket.on('call:incoming', this._handleIncomingCall.bind(this));
    this.socket.on('call:accepted', this._handleCallAccepted.bind(this));
    this.socket.on('call:rejected', this._handleCallRejected.bind(this));
    this.socket.on('call:signal', this._handleCallSignal.bind(this));
    this.socket.on('call:ended', this._handleCallEnded.bind(this));
  }

  registerCallbacks({ onIncomingCall, onRemoteStream, onCallEnded }) {
    this.onIncomingCall = onIncomingCall;
    this.onRemoteStream = onRemoteStream;
    this.onCallEnded = onCallEnded;
  }

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

  initiateCall(targetUserId, callType) {
    return new Promise((resolve, reject) => {
      const socket = this.socket || getSocket();
      
      if (!socket || !this.localStream) {
        reject(new Error('Socket ou stream local não inicializado'));
        return;
      }

      this.currentCallId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.calleeId = targetUserId;

      socket.emit('call:initiate', {
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

  acceptCall(callerId) {
    return new Promise((resolve, reject) => {
      const socket = this.socket || getSocket();
      
      if (!socket || !this.localStream) {
        reject(new Error('Socket ou stream local não inicializado'));
        return;
      }

      this.callerId = callerId;

      socket.emit('call:accept', {
        callerId,
        calleeId: this.userId,
        callId: this.currentCallId
      }, (response) => {
        if (response && response.success) {
          this._createPeer(false);
          resolve();
        } else {
          reject(new Error(response?.message || 'Falha ao aceitar chamada'));
        }
      });
    });
  }

  rejectCall(callerId) {
    return new Promise((resolve) => {
      const socket = this.socket || getSocket();
      
      if (socket) {
        socket.emit('call:reject', {
          callerId,
          calleeId: this.userId,
          callId: this.currentCallId
        });
      }
      this.currentCallId = null;
      resolve();
    });
  }

  endCurrentCall() {
    return new Promise((resolve) => {
      if (this.peer) {
        this.peer.destroy();
        this.peer = null;
      }

      const socket = this.socket || getSocket();
      
      if (socket && this.currentCallId) {
        socket.emit('call:end', {
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

  _handleIncomingCall(data) {
    const { callerId, callerName, callType, callId } = data;
    this.currentCallId = callId;
    this.callerId = callerId;
    
    if (this.onIncomingCall) {
      this.onIncomingCall(callerId, callerName, callType);
    }
  }

  _handleCallAccepted(data) {
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

  _createPeer(initiator) {
    if (this.peer) {
      this.peer.destroy();
    }

    this.peer = new SimplePeer({
      initiator,
      stream: this.localStream,
      trickle: true
    });

    const socket = this.socket || getSocket();
    
    if (!socket) {
      console.error("Socket não disponível para sinalização WebRTC");
      return;
    }

    this.peer.on('signal', (signal) => {
      socket.emit('call:signal', {
        signal,
        targetUserId: initiator ? this.calleeId : this.callerId,
        callId: this.currentCallId
      });
    });

    this.peer.on('stream', (stream) => {
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

const callService = new CallService();
export default callService;