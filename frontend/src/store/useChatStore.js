import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

// Cria o store para gerir o estado de mensagens, users e agora as transferências
export const useChatStore = create((set, get) => ({
  // Estado do store
  messages: [], // Lista de mensagens 
  users: [], // Lista de users
  selectedUser: null, // user selecionado
  isUsersLoading: false, // Para carregar os users
  isMessagesLoading: false, // Para carregar as mensagens
  transfers: [], // Histórico de transferências
  isTransfersLoading: false, // Para carregar as transferências
  conversations: [], // Lista de conversas com última mensagem (para ordenação)
  unreadCounts: {}, // Contador de mensagens não lidas por usuário

  // Função para obter a lista de users
  getUsers: async () => {
    set({ isUsersLoading: true }); // Início do carregamento dos users
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data }); // Armazena os users retornados
      
      // Após carregar utilizadores, buscar conversas para ordenação
      get().getConversations();
    } catch (error) {
      toast.error(error.response?.data?.message || "Erro ao obter utilizadores");
    } finally {
      set({ isUsersLoading: false }); // carregamento finalizado
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
      
      set({ 
        conversations, 
        unreadCounts
      });
    } catch (error) {
      console.error("Erro ao obter conversas:", error);
    }
  },

  // Marcar conversa como lida
  markConversationAsRead: async (userId) => {
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
    set({ isMessagesLoading: true }); // Início do carregamento das mensagens
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data }); // Armazena as mensagens do user
      
      // Marcar mensagens como lidas quando abre a conversa
      get().markConversationAsRead(userId);
    } catch (error) {
      toast.error(error.response?.data?.message || "Erro ao obter mensagens");
    } finally {
      set({ isMessagesLoading: false }); // Finalizado
    }
  },

  // Função para enviar uma nova mensagem
  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get(); // Recebe o user selecionado e as mensagens atuais
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
    const { selectedUser } = get(); // Recebe o user selecionado
    const socket = useAuthStore.getState().socket; // Recebe a instância do socket da store de autenticação

    // Executa o evento 'newMessage' que recebe uma nova mensagem
    socket.on("newMessage", (newMessage) => {
      const authUser = useAuthStore.getState().authUser;
      
      // Se a mensagem é do usuário selecionado atualmente, adiciona à lista de mensagens
      if (selectedUser && newMessage.senderId === selectedUser._id) {
        set({
          messages: [...get().messages, newMessage],
        });
        
        // Marca como lida já que o usuário está visualizando a conversa
        get().markConversationAsRead(selectedUser._id);
      } 
      // Se a mensagem é para o usuário atual mas de outro remetente
      else if (newMessage.receiverId === authUser._id) {
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
    const socket = useAuthStore.getState().socket; // Recebe a instância do socket
    socket.off("newMessage"); // Remove o user do evento 'newMessage'
  },

  // Função para definir o user selecionado no chat
  setSelectedUser: (selectedUser) => {
    set({ selectedUser });
    
    // Se houver um usuário selecionado, marcar mensagens como lidas
    if (selectedUser && selectedUser._id !== 'ai-assistant') {
      get().markConversationAsRead(selectedUser._id);
      get().getMessages(selectedUser._id);
    }
  },

  // Função para buscar o histórico de transferências
  getTransferHistory: async () => {
    const { authUser } = useAuthStore.getState(); // Obter user autenticado
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
    const socket = useAuthStore.getState().socket; // Recebe a instância do socket da store de autenticação

    socket.on("transfer-update", (transferData) => {
      const { authUser } = useAuthStore.getState(); // Obter user autenticado
      if (transferData.senderId === authUser._id || transferData.receiverId === authUser._id) {
        set((state) => ({
          transfers: [...state.transfers, transferData], // Adiciona a transferência ao histórico
        }));
      }
    });
  },

  // Função para se desinscrever das notificações de transferências
  unsubscribeFromTransfers: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("transfer-update"); // Remove a inscrição do evento 'transfer-update'
  },
}));