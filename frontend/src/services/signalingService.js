// src/services/signalingService.js
import { getSocket, initializeSocket } from "../socket";
import { v4 as uuidv4 } from 'uuid'; // Para gerar IDs de chamada, instale com: npm install uuid

/**
 * Implementação de um serviço de sinalização WebRTC usando
 * a infraestrutura socket.io existente
 */
class SignalingService {
  constructor() {
    this.listeners = {};
    this.userId = null;
    this.isConnected = false;
    this.socket = null;
    this.callId = null;
    this.peerUserId = null; // ID do peer da chamada atual
  }

  // Conectar ao serviço de sinalização
  connect(userId) {
    return new Promise((resolve, reject) => {
      if (this.isConnected && this.userId === userId) {
        console.log("Já conectado com mesmo userId:", userId);
        return resolve({ userId });
      }
      
      this.userId = userId;
      
      // Usar o socket existente ou inicializar um novo
      this.socket = getSocket();
      if (!this.socket) {
        this.socket = initializeSocket();
      }
      
      if (!this.socket) {
        return reject(new Error("Não foi possível conectar ao servidor de sinalização"));
      }
      
      // Verificar se já está conectado
      if (this.socket.connected) {
        this._setupSocketEvents();
        this.isConnected = true;
        return resolve({ userId });
      }
      
      // Caso contrário, aguardar a conexão
      const onConnect = () => {
        this._setupSocketEvents();
        this.isConnected = true;
        this.socket.off("connect", onConnect);
        resolve({ userId });
      };
      
      this.socket.on("connect", onConnect);
      
      const onConnectError = (error) => {
        console.error("Erro ao conectar:", error);
        this.socket.off("connect_error", onConnectError);
        reject(error);
      };
      
      this.socket.on("connect_error", onConnectError);
    });
  }

  // Configurar os eventos de sinalização WebRTC no socket
  _setupSocketEvents() {
    console.log("Configurando eventos de sinalização WebRTC");
    
    // Remover handlers existentes para evitar duplicação
    this.socket.off("webrtc:offer");
    this.socket.off("webrtc:answer");
    this.socket.off("webrtc:ice-candidate");
    this.socket.off("call:ended");
    this.socket.off("call:incoming");
    this.socket.off("call:accepted");
    this.socket.off("call:rejected");
    
    // Configurar novos handlers
    this.socket.on("webrtc:offer", (data) => {
      console.log("Recebida oferta WebRTC de:", data.from);
      this._triggerEvent("offer", data);
    });
    
    this.socket.on("webrtc:answer", (data) => {
      console.log("Recebida resposta WebRTC de:", data.from);
      this._triggerEvent("answer", data);
    });
    
    this.socket.on("webrtc:ice-candidate", (data) => {
      console.log("Recebido candidato ICE de:", data.from);
      this._triggerEvent("iceCandidate", data);
    });
    
    this.socket.on("call:ended", (data) => {
      console.log("Chamada encerrada:", data.callId);
      this._triggerEvent("callEnded", data);
      
      // Limpar dados da chamada
      if (this.callId === data.callId) {
        this.callId = null;
        this.peerUserId = null;
      }
    });
    
    // Compatibilidade com eventos do seu sistema atual
    this.socket.on("call:incoming", (data) => {
      console.log("Chamada recebida de:", data.callerId);
      this._triggerEvent("incomingCall", data);
    });
    
    this.socket.on("call:accepted", (data) => {
      console.log("Chamada aceita por:", data.calleeId);
      this._triggerEvent("callAccepted", data);
    });
    
    this.socket.on("call:rejected", (data) => {
      console.log("Chamada rejeitada por:", data.calleeId);
      this._triggerEvent("callRejected", data);
      
      // Limpar dados da chamada
      if (this.callId === data.callId) {
        this.callId = null;
        this.peerUserId = null;
      }
    });
  }

  // Desconectar do serviço de sinalização
  disconnect() {
    console.log("Desconectando do serviço de sinalização WebRTC");
    
    this.isConnected = false;
    this.userId = null;
    this.callId = null;
    this.peerUserId = null;
    
    this._triggerEvent("disconnected");
    
    // Não desconectamos o socket aqui, pois ele pode estar sendo usado
    // por outras partes da aplicação
  }

  // Iniciar uma chamada
  initiateCall(targetUserId, isVideo = true) {
    if (!this.isConnected || !this.socket) {
      console.error("Não conectado ao servidor");
      return Promise.reject(new Error("Não conectado ao servidor"));
    }
    
    if (this.callId) {
      console.warn("Já existe uma chamada ativa:", this.callId);
      return Promise.reject(new Error("Já existe uma chamada ativa"));
    }
    
    // Criar um ID de chamada único
    this.callId = uuidv4();
    this.peerUserId = targetUserId;
    
    console.log(`Iniciando chamada ${isVideo ? 'com vídeo' : 'de voz'} para ${targetUserId}`);
    
    return new Promise((resolve, reject) => {
      this.socket.emit("call:initiate", {
        targetUserId,
        callerId: this.userId,
        callType: isVideo ? "video" : "audio",
        callId: this.callId
      }, (response) => {
        if (response && response.success) {
          resolve({ callId: this.callId });
        } else {
          this.callId = null;
          this.peerUserId = null;
          reject(new Error((response && response.message) || "Falha ao iniciar chamada"));
        }
      });
    });
  }

  // Aceitar uma chamada recebida
  acceptCall(callerId, callId) {
    if (!this.isConnected || !this.socket) {
      console.error("Não conectado ao servidor");
      return Promise.reject(new Error("Não conectado ao servidor"));
    }
    
    console.log(`Aceitando chamada ${callId} de ${callerId}`);
    
    this.callId = callId;
    this.peerUserId = callerId;
    
    return new Promise((resolve, reject) => {
      this.socket.emit("call:accept", {
        callerId,
        calleeId: this.userId,
        callId
      }, (response) => {
        if (response && response.success) {
          resolve();
        } else {
          this.callId = null;
          this.peerUserId = null;
          reject(new Error((response && response.message) || "Falha ao aceitar chamada"));
        }
      });
    });
  }

  // Rejeitar uma chamada recebida
  rejectCall(callerId, callId) {
    if (!this.isConnected || !this.socket) {
      console.error("Não conectado ao servidor");
      return;
    }
    
    console.log(`Rejeitando chamada ${callId} de ${callerId}`);
    
    this.socket.emit("call:reject", {
      callerId,
      calleeId: this.userId,
      callId
    });
  }

  // Enviar uma oferta para um peer
  sendOffer(peerId, offer) {
    if (!this.isConnected || !this.socket) {
      console.error("Não conectado ao servidor");
      return Promise.reject(new Error("Não conectado ao servidor"));
    }

    console.log(`Enviando oferta WebRTC para: ${peerId}`);
    
    return new Promise((resolve) => {
      this.socket.emit("webrtc:offer", {
        from: this.userId,
        to: peerId,
        offer: offer
      });
      resolve();
    });
  }

  // Enviar uma resposta para um peer
  sendAnswer(peerId, answer) {
    if (!this.isConnected || !this.socket) {
      console.error("Não conectado ao servidor");
      return Promise.reject(new Error("Não conectado ao servidor"));
    }

    console.log(`Enviando resposta WebRTC para: ${peerId}`);
    
    return new Promise((resolve) => {
      this.socket.emit("webrtc:answer", {
        from: this.userId,
        to: peerId,
        answer: answer
      });
      resolve();
    });
  }

  // Enviar um candidato ICE para um peer
  sendIceCandidate(peerId, candidate) {
    if (!this.isConnected || !this.socket) {
      console.error("Não conectado ao servidor");
      return;
    }

    console.log(`Enviando candidato ICE para: ${peerId}`);
    
    this.socket.emit("webrtc:ice-candidate", {
      from: this.userId,
      to: peerId,
      candidate: candidate
    });
  }

  // Enviar sinal de compatibilidade com seu sistema atual
  sendSignal(targetUserId, signal) {
    if (!this.isConnected || !this.socket) {
      console.error("Não conectado ao servidor");
      return;
    }
    
    this.socket.emit("call:signal", {
      targetUserId,
      signal,
      callId: this.callId
    });
  }

  // Encerrar a chamada atual
  endCall() {
    if (!this.isConnected || !this.socket) {
      console.error("Não conectado ao servidor");
      return;
    }
    
    if (!this.callId) {
      console.warn("Não há chamada ativa para encerrar");
      return;
    }
    
    console.log(`Encerrando chamada ${this.callId}`);
    
    this.socket.emit("call:end", {
      userId: this.userId,
      callId: this.callId
    });
    
    // Limpar dados da chamada
    this.callId = null;
    this.peerUserId = null;
  }

  // Registrar um callback para um evento
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return this; // Para encadeamento de chamadas
  }

  // Remover um callback para um evento
  off(event, callback) {
    if (!this.listeners[event]) return this;
    
    if (callback) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    } else {
      // Se nenhum callback for especificado, remove todos os listeners para o evento
      delete this.listeners[event];
    }
    
    return this; // Para encadeamento de chamadas
  }

  // Disparar um evento para todos os callbacks registrados
  _triggerEvent(event, data) {
    if (!this.listeners[event]) return;
    
    try {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (err) {
          console.error(`Erro ao executar listener para evento '${event}':`, err);
        }
      });
    } catch (err) {
      console.error(`Erro ao disparar evento '${event}':`, err);
    }
  }
  
  // Obter o ID da chamada atual
  getCurrentCallId() {
    return this.callId;
  }
  
  // Verificar se há uma chamada ativa
  hasActiveCall() {
    return !!this.callId;
  }
}

export default new SignalingService();