// src/services/callService.js
import { emitSocketEvent, getSocket, initializeSocket } from './socket';
import { getMediaConstraints } from '../lib/webrtcConfig';

class CallService {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.callId = null;
    this.remoteUserId = null;
    this.onRemoteStreamCallback = null;
    this.onCallEndedCallback = null;
  }
  
  // Obter stream de mídia local
  async getLocalStream(isVideo = true) {
    try {
      if (this.localStream) {
        // Se já existe, pare primeiro
        this.localStream.getTracks().forEach(track => track.stop());
      }
      
      const constraints = getMediaConstraints(isVideo);
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      return this.localStream;
    } catch (error) {
      console.error('Erro ao obter stream local:', error);
      // Tentar fallback para apenas áudio se o problema for com vídeo
      if (isVideo) {
        try {
          console.log('Tentando fallback para apenas áudio');
          const audioConstraints = getMediaConstraints(false);
          this.localStream = await navigator.mediaDevices.getUserMedia(audioConstraints);
          return this.localStream;
        } catch (audioError) {
          console.error('Erro ao obter áudio para fallback:', audioError);
          throw error; // Re-lançar o erro original
        }
      }
      throw error;
    }
  }
  
  // Iniciar uma chamada
  async initiateCall(userId, callType = 'video') {
    try {
      // Garantir que o socket está inicializado
      const socket = await initializeSocket();
      if (!socket) {
        throw new Error('Não foi possível conectar ao servidor');
      }
      
      // Gerar ID único para a chamada
      this.callId = Date.now().toString();
      this.remoteUserId = userId;
      
      // Registrar handlers para eventos de chamada
      this._setupCallEventHandlers();
      
      // Notificar servidor sobre nova chamada
      return new Promise((resolve, reject) => {
        emitSocketEvent('call:initiate', {
          targetUserId: userId,
          callerId: socket.auth?.userId || socket.id,
          callType: callType,
          callId: this.callId
        }, (response) => {
          if (response && response.success) {
            resolve(response);
          } else {
            reject(new Error((response && response.message) || 'Falha ao iniciar chamada'));
          }
        });
      });
    } catch (error) {
      console.error('Erro ao iniciar chamada:', error);
      throw error;
    }
  }
  
  // Aceitar uma chamada recebida
  async acceptCall(callerId, callId) {
    try {
      // Garantir que o socket está inicializado
      const socket = await initializeSocket();
      if (!socket) {
        throw new Error('Não foi possível conectar ao servidor');
      }
      
      this.callId = callId;
      this.remoteUserId = callerId;
      
      console.log(`Aceitando chamada ${callId} de ${callerId} (remoteUserId definido)`);
      
      // Registrar handlers para eventos de chamada
      this._setupCallEventHandlers();
      
      // Notificar servidor sobre aceitação da chamada
      return new Promise((resolve, reject) => {
        emitSocketEvent('call:accept', {
          callerId: callerId,
          calleeId: socket.auth?.userId || socket.id,
          callId: callId
        }, (response) => {
          if (response && response.success) {
            resolve(response);
          } else {
            reject(new Error((response && response.message) || 'Falha ao aceitar chamada'));
          }
        });
      });
    } catch (error) {
      console.error('Erro ao aceitar chamada:', error);
      throw error;
    }
  }

  // Rejeitar uma chamada recebida
  rejectCall(callerId, callId) {
    emitSocketEvent('call:reject', {
      callerId,
      calleeId: getSocket()?.auth?.userId || getSocket()?.id,
      callId
    });
  }
  
  // Encerrar a chamada atual
  endCurrentCall() {
    if (this.callId) {
      emitSocketEvent('call:end', {
        userId: getSocket()?.auth?.userId || getSocket()?.id,
        callId: this.callId
      });
      
      this._cleanupCall();
    }
  }
  
  // Iniciar a conexão WebRTC
  async startWebRTCConnection(isInitiator = true) {
    try {
      if (!this.localStream) {
        throw new Error('Stream local não disponível');
      }
      
      // Criar peer connection
      this._createPeerConnection();
      
      // Se for o iniciador, crie e envie a oferta
      if (isInitiator) {
        await this._createAndSendOffer();
      }
    } catch (error) {
      console.error('Erro ao iniciar conexão WebRTC:', error);
      throw error;
    }
  }
  
  // Configurar handlers para eventos de chamada
  _setupCallEventHandlers() {
    const socket = getSocket();
    if (!socket) return;
    
    // Remover handlers existentes
    socket.off('webrtc:offer');
    socket.off('webrtc:answer');
    socket.off('webrtc:ice-candidate');
    socket.off('call:ended');
    
    // Configurar novos handlers
    socket.on('webrtc:offer', this._handleOffer.bind(this));
    socket.on('webrtc:answer', this._handleAnswer.bind(this));
    socket.on('webrtc:ice-candidate', this._handleIceCandidate.bind(this));
    socket.on('call:ended', this._handleCallEnded.bind(this));
  }
  
  // Lidar com oferta recebida
  async _handleOffer(data) {
    try {
      console.log('Oferta WebRTC recebida:', data);
      
      // Verificar se a oferta é para nós
      if (!this.remoteUserId || data.from !== this.remoteUserId) {
        console.log('Ignorando oferta de usuário não relacionado:', data.from, 'Esperávamos:', this.remoteUserId);
        return;
      }
      
      // Criar peer connection se não existir
      if (!this.peerConnection) {
        console.log('Criando nova peer connection para responder à oferta');
        this._createPeerConnection();
      } else {
        console.log('Usando peer connection existente');
      }
      
      // Definir descrição remota
      console.log('Definindo descrição remota (oferta)...');
      const offerDesc = new RTCSessionDescription(data.offer);
      await this.peerConnection.setRemoteDescription(offerDesc);
      console.log('Descrição remota definida com sucesso');
      
      // Criar e enviar resposta
      console.log('Criando resposta...');
      const answer = await this.peerConnection.createAnswer();
      console.log('Definindo descrição local (resposta)...');
      await this.peerConnection.setLocalDescription(answer);
      console.log('Descrição local definida com sucesso');
      
      // Enviar resposta
      console.log('Enviando resposta para:', data.from);
      emitSocketEvent('webrtc:answer', {
        from: getSocket()?.auth?.userId || getSocket()?.id,
        to: data.from,
        answer
      });
      console.log('Resposta enviada com sucesso');
    } catch (error) {
      console.error('Erro ao processar oferta:', error);
    }
  }
  
  // Lidar com resposta recebida
  async _handleAnswer(data) {
    try {
      console.log('Resposta recebida:', data);
      
      // Verificar se a resposta é para nós
      if (!this.remoteUserId || data.from !== this.remoteUserId) {
        console.log('Ignorando resposta de usuário não relacionado:', data.from);
        return;
      }
      
      if (!this.peerConnection) {
        console.error('Recebida resposta, mas não há peer connection');
        return;
      }
      
      // Definir descrição remota
      const answerDesc = new RTCSessionDescription(data.answer);
      await this.peerConnection.setRemoteDescription(answerDesc);
    } catch (error) {
      console.error('Erro ao processar resposta:', error);
    }
  }
  
  // Lidar com candidato ICE recebido
  async _handleIceCandidate(data) {
    try {
      // Verificar se o candidato é para nós
      if (!this.remoteUserId || data.from !== this.remoteUserId) {
        return;
      }
      
      if (!this.peerConnection) {
        return;
      }
      
      // Adicionar candidato ICE
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch (error) {
      console.error('Erro ao adicionar candidato ICE:', error);
    }
  }
  
  // Lidar com chamada encerrada
  _handleCallEnded(data) {
    console.log('Chamada encerrada pelo outro usuário:', data);
    
    if (this.onCallEndedCallback) {
      this.onCallEndedCallback();
    }
    
    this._cleanupCall();
  }
  
  // Criar conexão peer
  _createPeerConnection() {
    // Configuração do WebRTC
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    };
    
    this.peerConnection = new RTCPeerConnection(configuration);
    
    // Adicionar trilhas locais
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });
    }
    
    // Configurar handlers de eventos
    this.peerConnection.onicecandidate = this._handleLocalIceCandidate.bind(this);
    this.peerConnection.ontrack = this._handleRemoteTrack.bind(this);
    this.peerConnection.oniceconnectionstatechange = this._handleIceConnectionStateChange.bind(this);
  }
  
  // Lidar com candidato ICE local
  _handleLocalIceCandidate(event) {
    if (event.candidate) {
      emitSocketEvent('webrtc:ice-candidate', {
        from: getSocket()?.auth?.userId || getSocket()?.id,
        to: this.remoteUserId,
        candidate: event.candidate
      });
    }
  }
  
  // Lidar com trilha remota
  _handleRemoteTrack(event) {
  console.log("Trilha remota recebida:", event.track.kind);
  
  if (event.streams && event.streams[0]) {
    console.log("Stream remoto recebido e configurando callback");
    
    // Às vezes o callback pode não estar configurado ainda quando a trilha é recebida,
    // então adicionamos um pequeno timeout se necessário
    if (this.onRemoteStreamCallback) {
      this.onRemoteStreamCallback(event.streams[0]);
    } else {
      setTimeout(() => {
        if (this.onRemoteStreamCallback) {
          console.log("Executando callback de stream remoto com atraso");
          this.onRemoteStreamCallback(event.streams[0]);
        }
      }, 500);
    }
  }
}
  
  // Lidar com mudança de estado da conexão ICE
  _handleIceConnectionStateChange() {
    const state = this.peerConnection.iceConnectionState;
    console.log('ICE Connection State:', state);
    
    if (state === 'failed' || state === 'closed') {
      this._cleanupCall();
    }
  }
  
  // Criar e enviar oferta
  async _createAndSendOffer() {
    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      
      emitSocketEvent('webrtc:offer', {
        from: getSocket()?.auth?.userId || getSocket()?.id,
        to: this.remoteUserId,
        offer
      });
    } catch (error) {
      console.error('Erro ao criar e enviar oferta:', error);
      throw error;
    }
  }
  
  // Limpar recursos da chamada
  _cleanupCall() {
    // Fechar peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    this.callId = null;
    this.remoteUserId = null;
  }
  
  // Definir callback para stream remoto
  setOnRemoteStream(callback) {
    this.onRemoteStreamCallback = callback;
  }
  
  // Definir callback para chamada encerrada
  setOnCallEnded(callback) {
    this.onCallEndedCallback = callback;
  }
}

export default new CallService();