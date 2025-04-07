import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

// Função auxiliar para carregar conversas visualizadas do localStorage
const loadViewedConversations = (userId) => {
  try {
    const storedData = localStorage.getItem(`viewed_conversations_${userId}`);
    return storedData ? JSON.parse(storedData) : {};
  } catch (error) {
    console.error("Erro ao carregar conversas visualizadas:", error);
    return {};
  }
};

// Função auxiliar para salvar conversas visualizadas no localStorage
const saveViewedConversations = (userId, viewedConversations) => {
  try {
    localStorage.setItem(`viewed_conversations_${userId}`, JSON.stringify(viewedConversations));
  } catch (error) {
    console.error("Erro ao salvar conversas visualizadas:", error);
  }
};

export const useChatStore = create((set, get) => ({
  messages: [], 
  users: [], 
  selectedUser: null, 
  isUsersLoading: false, 
  isMessagesLoading: false, 
  conversations: [], 
  unreadCounts: {},
  viewedConversations: {}, 

  // Função para eliminar mensagem com tratamento de erros e atualização de estado
  deleteMessage: async (messageId) => {
    try {
      // Chamada para o endpoint de exclusão de mensagem
      const response = await axiosInstance.delete(`/messages/${messageId}`);
      
      // Atualizar estado removendo a mensagem local
      set(state => ({
        messages: state.messages.filter(msg => msg._id !== messageId)
      }));
      
      // Notificação de sucesso
      toast.success("Mensagem eliminada com sucesso");
      
      // Atualizar conversas após exclusão
      get().getConversations();
      
      return response.data;
    } catch (error) {
      // Log detalhado do erro
      console.error("Erro ao eliminar mensagem:", error);
      
      // Notificação de erro para o usuário
      toast.error(error.response?.data?.error || "Erro ao eliminar mensagem");
      
      // Propagar o erro para tratamento adicional, se necessário
      throw error;
    }
  },

  // Função para inicializar conversas visualizadas
  initializeViewedConversations: () => {
    const authUser = useAuthStore.getState().authUser;
    if (authUser?._id) {
      const savedViewedConversations = loadViewedConversations(authUser._id);
      set({ viewedConversations: savedViewedConversations });
    }
  },

  // Obter lista de utilizadores
  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      let blockedUserIds = [];
      try {
        const blockedRes = await axiosInstance.get("/contacts/blocked");
        blockedUserIds = Array.isArray(blockedRes.data) 
          ? blockedRes.data.map(user => user._id)
          : [];
      } catch (blockedError) {
        console.warn("Erro ao obter usuários bloqueados:", blockedError);
      }

      try {
        const contactsRes = await axiosInstance.get("/contacts");
        const contactsData = Array.isArray(contactsRes.data) ? contactsRes.data : [];
        
        const contactUsers = contactsData
          .map(contact => ({
            _id: contact.user?._id,
            fullName: contact.user?.fullName || "Utilizador desconhecido",
            email: contact.user?.email || "",
            profilePic: contact.user?.profilePic || "",
            note: contact.note || "",
            contactId: contact._id
          }))
          .filter(user => !blockedUserIds.includes(user._id));
        
        set({ users: contactUsers });
      } catch (contactError) {
        console.warn("Erro ao obter contactos, usando todos os utilizadores:", contactError);
        const usersRes = await axiosInstance.get("/messages/users");
        const usersData = Array.isArray(usersRes.data) ? usersRes.data : [];
        
        const filteredUsers = usersData.filter(user => !blockedUserIds.includes(user._id));
        set({ users: filteredUsers });
      }
      
      get().getConversations();
    } catch (error) {
      console.error("Erro completo:", error);
      set({ users: [] });
      toast.error(error.response?.data?.error || "Erro ao obter utilizadores");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  // Obter conversas
  getConversations: async () => {
    try {
      const res = await axiosInstance.get("/messages/conversations");
      const conversations = res.data || [];
      
      if (!Array.isArray(conversations)) {
        console.error("Resposta de conversas não é um array:", conversations);
        set({ conversations: [], unreadCounts: {} });
        return;
      }
      
      const unreadCounts = {};
      const authUser = useAuthStore.getState().authUser;
      const viewedConversations = get().viewedConversations;
      
      conversations.forEach(conv => {
        if (!conv.participants || !Array.isArray(conv.participants)) return;
        
        const otherUserId = conv.participants.find(id => id !== authUser._id);
        if (!otherUserId) return;
        
        if (conv.latestMessage && !conv.latestMessage.read && 
            conv.latestMessage.senderId !== authUser._id) {
          
          if (viewedConversations[otherUserId]) {
            unreadCounts[otherUserId] = 0;
          } else {
            unreadCounts[otherUserId] = conv.unreadCount || 1;
          }
        } else {
          unreadCounts[otherUserId] = 0;
        }
      });
      
      const sortedConversations = [...conversations].sort((a, b) => {
        if (a.latestMessage && b.latestMessage) {
          return new Date(b.latestMessage.createdAt) - new Date(a.latestMessage.createdAt);
        }
        return a.latestMessage ? -1 : b.latestMessage ? 1 : 0;
      });
      
      set({ conversations: sortedConversations, unreadCounts });
    } catch (error) {
      console.error("Erro ao obter conversas:", error);
      set({ conversations: [], unreadCounts: {} });
    }
  },

  // Marcar conversa como lida
  markConversationAsRead: async (userId) => {
    if (!userId || userId === 'ai-assistant') return;
    
    try {
      const authUser = useAuthStore.getState().authUser;
      
      set(state => {
        const updatedViewedConversations = {
          ...state.viewedConversations,
          [userId]: true
        };
        
        if (authUser?._id) {
          saveViewedConversations(authUser._id, updatedViewedConversations);
        }
        
        return {
          viewedConversations: updatedViewedConversations,
          unreadCounts: {
            ...state.unreadCounts,
            [userId]: 0
          },
          conversations: state.conversations.map(conv => {
            if (conv.participants && conv.participants.includes(userId)) {
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
        };
      });
      
      await axiosInstance.patch(`/messages/read/${userId}`);
      
      setTimeout(() => {
        get().getConversations();
      }, 300);
    } catch (error) {
      console.error("Erro ao marcar conversa como lida:", error);
    }
  },

  // Obter mensagens de um utilizador
  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      const messages = Array.isArray(res.data) ? res.data : [];
      
      const authUser = useAuthStore.getState().authUser;
      
      set(state => {
        const updatedViewedConversations = {
          ...state.viewedConversations,
          [userId]: true
        };
        
        if (authUser?._id) {
          saveViewedConversations(authUser._id, updatedViewedConversations);
        }
        
        return {
          messages,
          viewedConversations: updatedViewedConversations
        };
      });
      
      await get().markConversationAsRead(userId);
    } catch (error) {
      console.error("Erro ao obter mensagens:", error);
      set({ messages: [] });
      toast.error(error.response?.data?.message || "Erro ao obter mensagens");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  // Enviar mensagem
  sendMessage: async (messageData) => {
    const { selectedUser } = get();
    
    if (!selectedUser || !selectedUser._id) {
      toast.error("Nenhum destinatário selecionado");
      return null;
    }
    
    try {
      console.log("Enviando mensagem com dados:", {
        temTexto: !!messageData.text,
        temImagem: !!messageData.image,
        temArquivo: !!messageData.file
      });
      
      // Se estiver enviando arquivo, processar de forma especial
      if (messageData.file) {
        // Enviando a mensagem com o arquivo incluído
        console.log("Enviando arquivo:", messageData.file.name);
      }
      
      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`, 
        messageData,
        { 
          timeout: 600000, // 10 minutos
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      const newMessage = res.data;
      
      set((state) => ({
        messages: [...state.messages, newMessage],
      }));
      
      // Atualizar a conversa com a nova mensagem
      set(state => {
        const updatedConversations = [...state.conversations];
        
        const existingConvIndex = updatedConversations.findIndex(
          c => c.participants && c.participants.includes(selectedUser._id)
        );
        
        if (existingConvIndex >= 0) {
          updatedConversations[existingConvIndex] = {
            ...updatedConversations[existingConvIndex],
            latestMessage: newMessage,
            unreadCount: 0
          };
          
          // Mover para o topo
          const updatedConv = updatedConversations.splice(existingConvIndex, 1)[0];
          updatedConversations.unshift(updatedConv);
        } else {
          // Criar nova conversa
          updatedConversations.unshift({
            participants: [selectedUser._id, newMessage.senderId],
            latestMessage: newMessage,
            unreadCount: 0
          });
        }
        
        return { conversations: updatedConversations };
      });
      
      return newMessage;
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      throw error;
    }
  },

  // Definir utilizador selecionado
  setSelectedUser: (selectedUser) => {
    const authUser = useAuthStore.getState().authUser;
    
    set(state => {
      if (selectedUser && selectedUser._id !== 'ai-assistant') {
        const updatedViewedConversations = {
          ...state.viewedConversations,
          [selectedUser._id]: true
        };
        
        if (authUser?._id) {
          saveViewedConversations(authUser._id, updatedViewedConversations);
        }
        
        return {
          selectedUser,
          viewedConversations: updatedViewedConversations
        };
      }
      
      return { selectedUser };
    });
    
    if (selectedUser && selectedUser._id !== 'ai-assistant') {
      get().markConversationAsRead(selectedUser._id);
      get().getMessages(selectedUser._id);
    }
  },

  // Função para resetar o estado do chat
  resetChatState: () => {
    const authUser = useAuthStore.getState().authUser;
    
    // Limpar localStorage ao fazer logout
    if (authUser?._id) {
      try {
        localStorage.removeItem(`viewed_conversations_${authUser._id}`);
      } catch (error) {
        console.error("Erro ao limpar conversas visualizadas:", error);
      }
    }
    
    set({
      messages: [],
      users: [],
      selectedUser: null,
      isUsersLoading: false,
      isMessagesLoading: false,
      conversations: [],
      unreadCounts: {},
      viewedConversations: {}, // Limpar conversas visualizadas
    });
  },

  // Subscrever mensagens por WebSocket
  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    
    if (socket) {
      socket.off("newMessage");

      socket.on("newMessage", (newMessage) => {
        const authUser = useAuthStore.getState().authUser;
        const currentSelectedUser = get().selectedUser;
        const viewedConversations = get().viewedConversations;
        
        // Se a mensagem é do utilizador selecionado atualmente, adiciona à lista de mensagens
        if (currentSelectedUser && newMessage.senderId === currentSelectedUser._id) {
          set(state => {
            const updatedViewedConversations = {
              ...state.viewedConversations,
              [newMessage.senderId]: true
            };
            
            if (authUser?._id) {
              saveViewedConversations(authUser._id, updatedViewedConversations);
            }
            
            return {
              messages: [...state.messages, newMessage],
              viewedConversations: updatedViewedConversations
            };
          });
          
          get().markConversationAsRead(currentSelectedUser._id);
          
          set(state => {
            const updatedConversations = [...state.conversations];
            
            const existingConvIndex = updatedConversations.findIndex(
              c => c.participants && c.participants.includes(newMessage.senderId)
            );
            
            if (existingConvIndex >= 0) {
              updatedConversations[existingConvIndex] = {
                ...updatedConversations[existingConvIndex],
                latestMessage: {
                  ...newMessage,
                  read: true
                },
                unreadCount: 0
              };
              
              const updatedConv = updatedConversations.splice(existingConvIndex, 1)[0];
              updatedConversations.unshift(updatedConv);
            }
            
            return { 
              conversations: updatedConversations,
              unreadCounts: {
                ...state.unreadCounts,
                [newMessage.senderId]: 0
              }
            };
          });
        } 
        else if (newMessage.receiverId === authUser._id) {
          const isConversationPreviouslyViewed = viewedConversations[newMessage.senderId];
          
          const existingConv = get().conversations.find(
            c => c.participants && c.participants.includes(newMessage.senderId)
          );
          
          let isNewConversation = false;
          
          if (!existingConv || !existingConv.latestMessage || 
              (new Date(existingConv.latestMessage.createdAt) < new Date(newMessage.createdAt))) {
            isNewConversation = true;
          }
          
          if (isNewConversation && !isConversationPreviouslyViewed) {
            try {
              const notificationSound = new Audio('/notification.mp3');
              notificationSound.volume = 0.5;
              notificationSound.play().catch(err => console.log('Erro ao tocar som:', err));
            } catch (err) {
              console.log('Erro ao criar áudio:', err);
            }
            
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
          }
          
          set(state => {
            const updatedConversations = [...state.conversations];
            
            const existingConvIndex = updatedConversations.findIndex(
              c => c.participants && c.participants.includes(newMessage.senderId)
            );
            
            if (existingConvIndex >= 0) {
              const currentUnreadCount = isConversationPreviouslyViewed ? 
                0 : (updatedConversations[existingConvIndex].unreadCount || 0) + 1;
              
              updatedConversations[existingConvIndex] = {
                ...updatedConversations[existingConvIndex],
                latestMessage: {
                  ...newMessage,
                  read: isConversationPreviouslyViewed
                },
                unreadCount: currentUnreadCount
              };
              
              const updatedConv = updatedConversations.splice(existingConvIndex, 1)[0];
              updatedConversations.unshift(updatedConv);
            } else {
              updatedConversations.unshift({
                participants: [authUser._id, newMessage.senderId],
                latestMessage: newMessage,
                unreadCount: isConversationPreviouslyViewed ? 0 : 1
              });
            }
            
            const updatedUnreadCounts = {...state.unreadCounts};
            if (isConversationPreviouslyViewed) {
              updatedUnreadCounts[newMessage.senderId] = 0;
            }
            
            return { 
              conversations: updatedConversations,
              unreadCounts: updatedUnreadCounts
            };
          });
        }
        
        setTimeout(() => {
          get().getConversations();
        }, 500);
      });

      socket.on("messageDeleted", (messageId) => {
        set(state => ({
          messages: state.messages.filter(msg => msg._id !== messageId)
        }));
        
        setTimeout(() => {
          get().getConversations();
        }, 300);
      });
    } else {
      console.warn("Socket não disponível para subscrever mensagens");
    }
  },

  // Desinscrever mensagens por WebSocket
  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (socket && socket.connected) {
      socket.off("newMessage");
      socket.off("messageDeleted");
    }
  },
  addContact: async (email) => {
    try {
      const res = await axiosInstance.post("/contacts/add", { email });
      toast.success("Pedido de contacto enviado com sucesso");
      return res.data;
    } catch (error) {
      console.error("Erro ao adicionar contacto:", error);
      toast.error(error.response?.data?.error || "Erro ao adicionar contacto");
      throw error;
    }
  },
  
  // Obter pedidos de contacto pendentes
  getPendingRequests: async () => {
    try {
      const res = await axiosInstance.get("/contacts/pending");
      return Array.isArray(res.data) ? res.data : [];
    } catch (error) {
      console.error("Erro ao obter pedidos pendentes:", error);
      return [];
    }
  },
  
  // Responder a um pedido de contacto
  respondToRequest: async (contactId, status) => {
    try {
      const res = await axiosInstance.patch(`/contacts/${contactId}/respond`, { status });
      toast.success(status === "accepted" 
        ? "Pedido de contacto aceite" 
        : "Pedido de contacto rejeitado"
      );
      // Atualizar a lista de contactos
      get().getUsers();
      return res.data;
    } catch (error) {
      console.error("Erro ao processar pedido:", error);
      toast.error("Erro ao processar o pedido de contacto");
      throw error;
    }
  },
  
  // Remover contacto
  removeContact: async (contactId) => {
    try {
      const res = await axiosInstance.delete(`/contacts/${contactId}`);
      toast.success("Contacto removido com sucesso");
      // Atualizar a lista de contactos
      get().getUsers();
      return res.data;
    } catch (error) {
      console.error("Erro ao remover contacto:", error);
      toast.error("Erro ao remover contacto");
      throw error;
    }
  },
  
  // Bloquear utilizador
  blockUser: async (userId) => {
    try {
      await axiosInstance.post(`/contacts/block/${userId}`);
      toast.success("Utilizador bloqueado com sucesso");
      // Atualizar a lista de contactos
      get().getUsers();
      return true;
    } catch (error) {
      console.error("Erro ao bloquear utilizador:", error);
      toast.error(error.response?.data?.error || "Erro ao bloquear utilizador");
      return false;
    }
  },

  // Obter utilizadores bloqueados
  getBlockedUsers: async () => {
    try {
      const res = await axiosInstance.get("/contacts/blocked");
      return Array.isArray(res.data) ? res.data : [];
    } catch (error) {
      console.error("Erro ao obter utilizadores bloqueados:", error);
      toast.error("Erro ao carregar utilizadores bloqueados");
      return [];
    }
  },

  // Desbloquear utilizador
  unblockUser: async (userId) => {
    try {
      await axiosInstance.delete(`/contacts/unblock/${userId}`);
      toast.success("Utilizador desbloqueado com sucesso");
      return true;
    } catch (error) {
      console.error("Erro ao desbloquear utilizador:", error);
      toast.error("Erro ao desbloquear utilizador");
      return false;
    }
  },

  // Atualizar nota do contacto
  updateContactNote: async (contactId, note) => {
    try {
      const res = await axiosInstance.patch(`/contacts/${contactId}/note`, { note });
      toast.success("Nota atualizada com sucesso");
      // Atualizar a lista de contactos
      get().getUsers();
      return res.data;
    } catch (error) {
      console.error("Erro ao atualizar nota:", error);
      toast.error("Erro ao atualizar nota");
      throw error;
    }
  }
}));
