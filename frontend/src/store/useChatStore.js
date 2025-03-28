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
      
      // Atualizar contadores de mensagens não lidas
      const unreadCounts = {};
      const authUser = useAuthStore.getState().authUser;
      
      conversations.forEach(conv => {
        if (conv.latestMessage && !conv.latestMessage.read && 
            conv.latestMessage.senderId !== authUser._id) {
          // Encontrar o ID do outro participante
          const otherUserId = conv.participants.find(id => id !== authUser._id);
          unreadCounts[otherUserId] = (unreadCounts[otherUserId] || 0) + conv.unreadCount;
        }
      });
      
      set({ conversations, unreadCounts });
    } catch (error) {
      console.error("Erro ao obter conversas:", error);
    }
  },

  // Marcar conversa como lida
  markConversationAsRead: async (userId) => {
    // Não fazer nada se já não tem mensagens não lidas
    if (!get().unreadCounts[userId]) return;
    
    try {
      await axiosInstance.patch(`/messages/read/${userId}`);
      
      // Atualizar estado local
      set(state => ({
        unreadCounts: {
          ...state.unreadCounts,
          [userId]: 0
        },
        conversations: state.conversations.map(conv => {
          if (conv.participants.includes(userId)) {
            return {
              ...conv,
              latestMessage: {
                ...conv.latestMessage,
                read: true
              },
              unreadCount: 0
            };
          }
          return conv;
        })
      }));
    } catch (error) {
      console.error("Erro ao marcar conversa como lida:", error);
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
      
      // Adicionar mensagem à lista de mensagens
      set({ messages: [...messages, res.data] });
      
      // Atualizar conversas para ordenação por mais recentes
      get().getConversations();
      
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Erro ao enviar mensagem");
      throw error;
    }
  },

  // Função para se inscrever para notificações de novas mensagens por WebSocket
  subscribeToMessages: () => {
    const { selectedUser } = get();
    const socket = useAuthStore.getState().socket;

    socket.on("newMessage", (newMessage) => {
      const authUser = useAuthStore.getState().authUser;
      const currentSelectedUser = get().selectedUser; // Obtém o valor mais atual
      
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
        // Tocar som de notificação aqui (opcional)
        // const notificationSound = new Audio('/notification.mp3');
        // notificationSound.play();
        
        // Incrementar contador de não lidos
        set(state => ({
          unreadCounts: {
            ...state.unreadCounts,
            [newMessage.senderId]: (state.unreadCounts[newMessage.senderId] || 0) + 1
          }
        }));
      }
      
      // Atualizar conversas para refletir a nova mensagem e ordenação
      get().getConversations();
    });
  },

  // Função para se desinscrever das notificações de novas mensagens
  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
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
    socket.off("transfer-update");
  },
}));