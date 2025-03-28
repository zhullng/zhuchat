import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  // Estado do store
  messages: [], 
  users: [], 
  selectedUser: null, 
  isUsersLoading: false, 
  isMessagesLoading: false, 
  transfers: [], 
  isTransfersLoading: false, 
  conversations: [], 
  unreadCounts: {}, 

  // Função para obter a lista de users
  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
      
      // Após carregar utilizadores, buscar conversas para ordenação
      get().getConversations();
    } catch (error) {
      toast.error(error.response?.data?.message || "Erro ao obter utilizadores");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  // Função para obter as conversas e ordená-las por recentes
  getConversations: async () => {
    try {
      const res = await axiosInstance.get("/messages/conversations");
      const conversations = res.data;
      
      // CORREÇÃO: Preservar unreadCounts existentes e apenas atualizar com novos dados
      const currentUnreadCounts = get().unreadCounts || {};
      const unreadCounts = { ...currentUnreadCounts };
      const authUser = useAuthStore.getState().authUser;
      
      conversations.forEach(conv => {
        if (conv.latestMessage && !conv.latestMessage.read && 
            conv.latestMessage.senderId !== authUser._id) {
          // Encontrar o ID do outro participante
          const otherUserId = conv.participants.find(id => id !== authUser._id);
          
          // Usar o máximo entre o valor atual e o novo para evitar perda de contagem
          const currentCount = currentUnreadCounts[otherUserId] || 0;
          const serverCount = conv.unreadCount || 0;
          unreadCounts[otherUserId] = Math.max(currentCount, serverCount);
        }
      });
      
      // CORREÇÃO: Ordenar as conversas com base na data da última mensagem
      const sortedConversations = [...conversations].sort((a, b) => {
        if (a.latestMessage && b.latestMessage) {
          return new Date(b.latestMessage.createdAt) - new Date(a.latestMessage.createdAt);
        }
        return a.latestMessage ? -1 : b.latestMessage ? 1 : 0;
      });
      
      // Definir estado atualizado
      set({ 
        conversations: sortedConversations, 
        unreadCounts
      });
    } catch (error) {
      console.error("Erro ao obter conversas:", error);
    }
  },

  // Marcar conversa como lida
  markConversationAsRead: async (userId) => {
    // Não fazer nada se userId é inválido ou não tem mensagens não lidas
    if (!userId || userId === 'ai-assistant') return;
    
    const currentUnreadCount = get().unreadCounts[userId] || 0;
    if (currentUnreadCount === 0) return;
    
    try {
      // CORREÇÃO: Atualizar localmente primeiro para resposta imediata na UI
      set(state => ({
        unreadCounts: {
          ...state.unreadCounts,
          [userId]: 0
        },
        conversations: state.conversations.map(conv => {
          if (conv.participants.includes(userId)) {
            return {
              ...conv,
              latestMessage: conv.latestMessage ? {
                ...conv.latestMessage,
                read: true
              } : null,
              unreadCount: 0
            };
          }
          return conv;
        })
      }));
      
      // Depois atualizar no servidor
      await axiosInstance.patch(`/messages/read/${userId}`);
    } catch (error) {
      console.error("Erro ao marcar conversa como lida:", error);
      // Restaurar estado anterior em caso de erro
      get().getConversations();
    }
  },

  // Função para obter as mensagens de um user específico
  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
      
      // Marcar mensagens como lidas quando abre a conversa
      get().markConversationAsRead(userId);
    } catch (error) {
      toast.error(error.response?.data?.message || "Erro ao obter mensagens");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  // Função para enviar uma nova mensagem
  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      const newMessage = res.data;
      
      // Adicionar mensagem à lista de mensagens
      set({ messages: [...messages, newMessage] });
      
      // CORREÇÃO: Atualizar conversas com nova mensagem imediatamente para melhor resposta da UI
      set(state => {
        const authUser = useAuthStore.getState().authUser;
        const updatedConversations = [...state.conversations];
        
        // Encontrar conversa existente ou criar nova
        const existingConvIndex = updatedConversations.findIndex(
          c => c.participants.includes(selectedUser._id)
        );
        
        if (existingConvIndex >= 0) {
          // Atualizar conversa existente
          updatedConversations[existingConvIndex] = {
            ...updatedConversations[existingConvIndex],
            latestMessage: newMessage,
          };
          
          // Mover para o topo da lista
          const updatedConv = updatedConversations.splice(existingConvIndex, 1)[0];
          updatedConversations.unshift(updatedConv);
        } else {
          // Criar nova conversa
          updatedConversations.unshift({
            participants: [authUser._id, selectedUser._id],
            latestMessage: newMessage,
            unreadCount: 0
          });
        }
        
        return { conversations: updatedConversations };
      });
      
      // Ainda assim, sincronizar com o servidor depois
      get().getConversations();
      
      return newMessage;
    } catch (error) {
      toast.error(error.response?.data?.message || "Erro ao enviar mensagem");
      throw error;
    }
  },

  // Função para se inscrever para notificações de novas mensagens por WebSocket
  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    
    // CORREÇÃO: Desinscrever primeiro para evitar duplicação
    socket.off("newMessage");

    socket.on("newMessage", (newMessage) => {
      const authUser = useAuthStore.getState().authUser;
      const currentSelectedUser = get().selectedUser;
      
      console.log("Nova mensagem recebida:", newMessage);
      
      // Se a mensagem é do usuário selecionado atualmente, adiciona à lista de mensagens
      if (currentSelectedUser && newMessage.senderId === currentSelectedUser._id) {
        set(state => ({
          messages: [...state.messages, newMessage],
        }));
        
        // Marca como lida já que o usuário está visualizando a conversa
        get().markConversationAsRead(currentSelectedUser._id);
      } 
      // Se a mensagem é para o usuário atual mas de outro remetente
      else if (newMessage.receiverId === authUser._id) {
        // CORREÇÃO: Tocar som de notificação aqui
        try {
          const notificationSound = new Audio('/notification.mp3');
          notificationSound.volume = 0.5;
          notificationSound.play().catch(err => console.log('Erro ao tocar som:', err));
        } catch (err) {
          console.log('Erro ao criar áudio:', err);
        }
        
        // Incrementar contador de não lidos
        set(state => {
          const senderId = newMessage.senderId;
          const currentCount = state.unreadCounts[senderId] || 0;
          
          return {
            unreadCounts: {
              ...state.unreadCounts,
              [senderId]: currentCount + 1
            }
          };
        });
        
        // CORREÇÃO: Atualizar imediatamente a conversa na UI
        set(state => {
          const updatedConversations = [...state.conversations];
          
          // Encontrar conversa existente ou criar nova
          const existingConvIndex = updatedConversations.findIndex(
            c => c.participants.includes(newMessage.senderId)
          );
          
          if (existingConvIndex >= 0) {
            // Atualizar conversa existente
            const currentUnreadCount = updatedConversations[existingConvIndex].unreadCount || 0;
            
            updatedConversations[existingConvIndex] = {
              ...updatedConversations[existingConvIndex],
              latestMessage: newMessage,
              unreadCount: currentUnreadCount + 1
            };
            
            // Mover para o topo da lista
            const updatedConv = updatedConversations.splice(existingConvIndex, 1)[0];
            updatedConversations.unshift(updatedConv);
          } else {
            // Criar nova conversa
            updatedConversations.unshift({
              participants: [authUser._id, newMessage.senderId],
              latestMessage: newMessage,
              unreadCount: 1
            });
          }
          
          return { conversations: updatedConversations };
        });
      }
      
      // Sincronizar com o servidor depois
      get().getConversations();
    });
  },

  // Função para se desinscrever das notificações de novas mensagens
  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (socket && socket.connected) {
      socket.off("newMessage");
    }
  },

  // Função para definir o user selecionado no chat
  setSelectedUser: (selectedUser) => {
    set({ selectedUser });
    
    // Se houver um usuário selecionado, buscar mensagens e marcar como lidas
    if (selectedUser && selectedUser._id !== 'ai-assistant') {
      get().getMessages(selectedUser._id);
    }
  },

  // Função para buscar o histórico de transferências
  getTransferHistory: async () => {
    const { authUser } = useAuthStore.getState();
    if (!authUser?._id) return;

    set({ isTransfersLoading: true });
    try {
      const res = await axiosInstance.get(`/api/transfers/history/${authUser._id}`);
      set({ transfers: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Erro ao carregar histórico");
    } finally {
      set({ isTransfersLoading: false });
    }
  },

  // Função para se inscrever para notificações de novas transferências por WebSocket
  subscribeToTransfers: () => {
    const socket = useAuthStore.getState().socket;
    
    // CORREÇÃO: Desinscrever primeiro para evitar duplicação
    socket.off("transfer-update");

    socket.on("transfer-update", (transferData) => {
      const { authUser } = useAuthStore.getState();
      if (transferData.senderId === authUser._id || transferData.receiverId === authUser._id) {
        set((state) => ({
          transfers: [...state.transfers, transferData],
        }));
      }
    });
  },

  // Função para se desinscrever das notificações de transferências
  unsubscribeFromTransfers: () => {
    const socket = useAuthStore.getState().socket;
    if (socket && socket.connected) {
      socket.off("transfer-update");
    }
  },
}));