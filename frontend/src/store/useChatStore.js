import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import { useGroupStore } from "./useGroupStore";

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
  transfers: [], 
  isTransfersLoading: false, 
  conversations: [], 
  unreadCounts: {},
  viewedConversations: {}, 
  downloadingFiles: {}, 

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
        
        console.log("Usuários bloqueados obtidos:", blockedUserIds);
      } catch (blockedError) {
        console.warn("Erro ao obter usuários bloqueados:", blockedError);
      }

      try {
        console.log("Tentando obter contactos...");
        const contactsRes = await axiosInstance.get("/contacts");
        console.log("Contactos obtidos:", contactsRes.data);
        
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
      console.log("ENVIANDO MENSAGEM COMPLETA - DIAGNÓSTICO DETALHADO:", {
        text: messageData.text,
        hasFile: !!messageData.file,
        fileDetails: messageData.file ? {
          name: messageData.file.name,
          type: messageData.file.type,
          size: messageData.file.size
        } : null
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 minutos
      
      try {
        const res = await axiosInstance.post(
          `/messages/send/${selectedUser._id}`, 
          messageData,
          { 
            signal: controller.signal,
            timeout: 600000,
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
            headers: {
              'Content-Type': 'application/json',
            },
            onUploadProgress: (progressEvent) => {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              console.log(`Upload progress: ${percentCompleted}%`);
            }
          }
        );
        
        clearTimeout(timeoutId);
        
        const newMessage = res.data;
        
        set((state) => ({
          messages: [...state.messages, newMessage],
        }));

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
          } else {
            updatedConversations.unshift({
              participants: [selectedUser._id, newMessage.senderId],
              latestMessage: newMessage,
              unreadCount: 0
            });
          }
          
          return { conversations: updatedConversations };
        });
        
        await get().markConversationAsRead(selectedUser._id);

        return newMessage;
        
      } catch (axiosError) {
        console.error("ERRO DETALHADO DO AXIOS:", {
          name: axiosError.name,
          message: axiosError.message,
          response: axiosError.response?.data
        });

        throw axiosError;
      }
    } catch (error) {
      console.error("ERRO FINAL AO ENVIAR MENSAGEM:", error);
      
      toast.error(error.response?.data?.error || "Erro ao enviar mensagem. Tente novamente.");
      throw error;
    }
  },

  // Fazer download de arquivo
  downloadFile: async (messageId, fileName) => {
    try {
      if (!messageId || !fileName) {
        toast.error("Informações do ficheiro inválidas");
        return;
      }

      set(state => ({ 
        downloadingFiles: { 
          ...state.downloadingFiles, 
          [messageId]: true 
        } 
      }));

      const toastId = toast.loading("A iniciar download...");

      try {
        console.log("Iniciando download do ficheiro para mensagem:", messageId);

        const response = await axiosInstance.get(`/messages/file/${messageId}`, {
          responseType: 'blob',
          timeout: 300000,
        });
        
        if (!response || !response.data) {
          throw new Error(`Erro ao obter o ficheiro: Resposta vazia`);
        }
        
        const blob = response.data;
        
        const blobUrl = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
          document.body.removeChild(link);
        }, 100);
        
        toast.success("Download concluído", { id: toastId });
      } catch (error) {
        console.error("Erro ao fazer download:", error);
        toast.error(`Erro ao baixar ficheiro: ${error.message}`, { id: toastId });
      } finally {
        set(state => {
          const newDownloadingFiles = { ...state.downloadingFiles };
          delete newDownloadingFiles[messageId];
          return { downloadingFiles: newDownloadingFiles };
        });
      }
    } catch (error) {
      console.error("Erro ao processar download:", error);
      toast.error("Erro ao processar download");
    }
  },

  // Definir utilizador selecionado
  setSelectedUser: (selectedUser) => {
    const authUser = useAuthStore.getState().authUser;
    
    if (selectedUser) {
      try {
        const groupStore = useGroupStore.getState();
        if (groupStore && groupStore.selectGroup) {
          groupStore.selectGroup(null);
        }
      } catch (error) {
        console.warn("Não foi possível limpar o grupo selecionado:", error);
      }
    }
    
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

  // Outras funções já existentes no código original... 
  // (bloquear usuário, adicionar contato, etc.)

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
    transfers: [],
    isTransfersLoading: false,
    conversations: [],
    unreadCounts: {},
    viewedConversations: {}, // Limpar conversas visualizadas
    downloadingFiles: {} // Limpar estado de downloads
  });
},

// Histórico de transferências
getTransferHistory: async () => {
  const { authUser } = useAuthStore.getState();
  if (!authUser?._id) return;

  set({ isTransfersLoading: true });
  try {
    const res = await axiosInstance.get(`/transfers/history/${authUser._id}`);
    const transfers = Array.isArray(res.data) ? res.data : [];
    set({ transfers });
  } catch (error) {
    console.error("Erro ao carregar histórico de transferências:", error);
    set({ transfers: [] });
    toast.error(error.response?.data?.message || "Erro ao carregar histórico");
  } finally {
    set({ isTransfersLoading: false });
  }
},

// Atualizar nota/nickname do contacto
updateContactNote: async (contactId, note) => {
  try {
    const res = await axiosInstance.patch(`/contacts/${contactId}/note`, { note });
    toast.success("Nickname atualizado com sucesso");
    
    // Atualizar a lista de contactos para refletir a mudança
    get().getUsers();
    
    return { success: true, data: res.data };
  } catch (error) {
    console.error("Erro ao atualizar nickname:", error);
    toast.error(error.response?.data?.error || "Erro ao atualizar nickname");
    return { success: false };
  }
},

// Subscrever notificações de transferências por WebSocket
subscribeToTransfers: () => {
  const socket = useAuthStore.getState().socket;
  
  if (socket) {
    // Desinscrever primeiro para evitar duplicação
    socket.off("transfer-update");

    socket.on("transfer-update", (transferData) => {
      const { authUser } = useAuthStore.getState();
      if (transferData.senderId === authUser._id || transferData.receiverId === authUser._id) {
        set((state) => ({
          transfers: [...state.transfers, transferData],
        }));
      }
    });
  } else {
    console.warn("Socket não disponível para subscrever transferências");
  }
},

// Desinscrever notificações de transferências
unsubscribeFromTransfers: () => {
  const socket = useAuthStore.getState().socket;
  if (socket && socket.connected) {
    socket.off("transfer-update");
  }
},

// Adicionar contacto
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
removeContact: async (userId) => {
  try {
    // Primeiro, precisamos encontrar o contato que corresponde a este usuário
    const user = get().users.find(u => u._id === userId);
    
    // Se temos o ID do contato armazenado, usamos diretamente
    if (user && user.contactId) {
      const res = await axiosInstance.delete(`/contacts/${user.contactId}`);
      toast.success("Contacto removido com sucesso");
      // Atualizar a lista de contactos
      get().getUsers();
      return res.data;
    } 
    // Caso contrário, usamos o ID do usuário diretamente
    else {
      const res = await axiosInstance.delete(`/contacts/${userId}`);
      toast.success("Contacto removido com sucesso");
      // Atualizar a lista de contactos
      get().getUsers();
      return res.data;
    }
  } catch (error) {
    console.error("Erro ao remover contacto:", error);
    toast.error(error.response?.data?.error || "Erro ao remover contacto");
    throw error;
  }
},

// Bloquear utilizador
blockUser: async (userId) => {
  try {
    // Verificar se o userId é válido
    if (!userId) {
      toast.error("ID de utilizador inválido");
      return false;
    }

    await axiosInstance.post(`/contacts/block/${userId}`);
    
    // Atualizar a lista de utilizadores após o bloqueio bem-sucedido
    get().getUsers();
    
    toast.success("Utilizador bloqueado com sucesso");
    return true;
  } catch (error) {
    const errorMessage = 
      error.response?.data?.error || 
      "Não foi possível bloquear o utilizador. Tente novamente.";
    
    console.error("Erro ao bloquear utilizador:", errorMessage);
    toast.error(errorMessage);
    return false;
  }
},

// Excluir mensagem
deleteMessage: async (messageId) => {
  try {
    // Atualizar o estado local para feedback imediato
    set((state) => ({
      messages: state.messages.filter((message) => message._id !== messageId)
    }));

    // Chamada à API para excluir a mensagem no servidor
    const response = await axiosInstance.delete(`/messages/${messageId}`);
    
    // Atualize as conversas para refletir a alteração
    setTimeout(() => {
      get().getConversations();
    }, 300);
    
    return true;
  } catch (error) {
    console.error('Erro ao excluir mensagem:', error);
    
    // Em caso de erro, recarregue as mensagens para restaurar o estado
    const state = get();
    if (state.selectedUser?._id) {
      get().getMessages(state.selectedUser._id);
    }
    
    throw error;
  }
},

// Obter utilizadores bloqueados
getBlockedUsers: async () => {
  try {
    const response = await axiosInstance.get("/contacts/blocked");
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    const errorMessage = 
      error.response?.data?.error || 
      "Não foi possível carregar os utilizadores bloqueados";
    
    console.error("Erro ao carregar utilizadores bloqueados:", errorMessage);
    toast.error(errorMessage);
    return [];
  }
},

// Desbloquear utilizador
unblockUser: async (userId) => {
  try {
    await axiosInstance.delete(`/contacts/unblock/${userId}`);
    
    // Atualizar a lista de utilizadores após o desbloqueio bem-sucedido
    get().getUsers();
    
    toast.success("Utilizador desbloqueado com sucesso");
    return true;
  } catch (error) {
    const errorMessage = 
      error.response?.data?.error || 
      "Não foi possível desbloquear o utilizador";
    
    console.error("Erro ao desbloquear utilizador:", errorMessage);
    toast.error(errorMessage);
    return false;
  }
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
}
}));