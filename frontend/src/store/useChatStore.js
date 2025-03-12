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

  // Função para obter a lista de users
  getUsers: async () => {
    set({ isUsersLoading: true }); // Início do carregamento dos users
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data }); // Armazena os users retornados
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false }); // carregamento finalizado
    }
  },

  // Função para obter as mensagens de um user específico
  getMessages: async (userId) => {
    set({ isMessagesLoading: true }); // Início do carregamento das mensagens
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data }); // Armazena as mensagens do user
    } catch (error) {
      toast.error(error.response.data.message); 
    } finally {
      set({ isMessagesLoading: false }); // Finalizado
    }
  },

  // Função para enviar uma nova mensagem
  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get(); // Recebe o user selecionado e as mensagens atuais
    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      set({ messages: [...messages, res.data] }); // Adiciona a nova mensagem ao estado das mensagens
    } catch (error) {
      toast.error(error.response.data.message); 
    }
  },

  // Função para se inscrever para notificações de novas mensagens por WebSocket
  subscribeToMessages: () => {
    const { selectedUser } = get(); // Recebe o user selecionado
    if (!selectedUser) return; // Se não houver user selecionado, não faz nada

    const socket = useAuthStore.getState().socket; // Recebe a instância do socket da store de autenticação

    // Executa o evento 'newMessage' que recebe uma nova mensagem
    socket.on("newMessage", (newMessage) => {
      const isMessageSentFromSelectedUser = newMessage.senderId === selectedUser._id;
      if (!isMessageSentFromSelectedUser) return; // Só adiciona a mensagem se for do user selecionado

      set({
        messages: [...get().messages, newMessage], // Adiciona a nova mensagem à lista de mensagens
      });
    });
  },

  // Função para se desinscrever das notificações de novas mensagens
  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket; // Recebe a instância do socket
    socket.off("newMessage"); // Remove o user do evento 'newMessage'
  },

  // Função para definir o user selecionado no chat
  setSelectedUser: (selectedUser) => set({ selectedUser }),

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
        // Atualiza o saldo
        if (transferData.senderId === authUser._id) {
          set({
            transfers: [...get().transfers, transferData], // Adiciona a transferência ao histórico
          });
        }
      }
    });
  },
  

  // Função para se desinscrever das notificações de transferências
  unsubscribeFromTransfers: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("transfer-update"); // Remove a inscrição do evento 'transfer-update'
  },
}));
