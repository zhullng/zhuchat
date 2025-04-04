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
  viewedConversations: {}, // Nova propriedade para rastrear conversas visualizadas
  
  // Função para inicializar conversas visualizadas (chamada durante login)
  initializeViewedConversations: () => {
    const authUser = useAuthStore.getState().authUser;
    if (authUser?._id) {
      const savedViewedConversations = loadViewedConversations(authUser._id);
      set({ viewedConversations: savedViewedConversations });
    }
  },

  // Função getUsers atualizada para filtrar usuários bloqueados
  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      // Primeiro, buscar a lista de usuários bloqueados para filtrá-los depois
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

      // Verificar se a API de contactos existe, senão cair para a API de utilizadores
      try {
        console.log("Tentando obter contactos...");
        const contactsRes = await axiosInstance.get("/contacts");
        console.log("Contactos obtidos:", contactsRes.data);
        
        // Garantir que a resposta é um array
        const contactsData = Array.isArray(contactsRes.data) ? contactsRes.data : [];
        
        // Transformar os contactos no formato esperado pela UI e filtrar usuários bloqueados
        const contactUsers = contactsData
          .map(contact => ({
            _id: contact.user?._id,
            fullName: contact.user?.fullName || "Utilizador desconhecido",
            email: contact.user?.email || "",
            profilePic: contact.user?.profilePic || "",
            note: contact.note || "",
            contactId: contact._id // Guardar o ID do contato para facilitar a remoção
          }))
          .filter(user => !blockedUserIds.includes(user._id)); // Filtrar usuários bloqueados
        
        set({ users: contactUsers });
      } catch (contactError) {
        console.warn("Erro ao obter contactos, usando todos os utilizadores:", contactError);
        // Fallback: buscar todos os utilizadores se a API de contactos falhar
        const usersRes = await axiosInstance.get("/messages/users");
        const usersData = Array.isArray(usersRes.data) ? usersRes.data : [];
        
        // Filtrar usuários bloqueados aqui também
        const filteredUsers = usersData.filter(user => !blockedUserIds.includes(user._id));
        set({ users: filteredUsers });
      }
      
      // Após carregar utilizadores, buscar conversas para ordenação
      get().getConversations();
    } catch (error) {
      console.error("Erro completo:", error);
      set({ users: [] }); // Definir um array vazio em caso de erro
      toast.error(error.response?.data?.error || "Erro ao obter utilizadores");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  // Função para obter as conversas e ordená-las por recentes
  getConversations: async () => {
    try {
      const res = await axiosInstance.get("/messages/conversations");
      const conversations = res.data || [];
      
      if (!Array.isArray(conversations)) {
        console.error("Resposta de conversas não é um array:", conversations);
        set({ conversations: [], unreadCounts: {} });
        return;
      }
      
      // Resetar unreadCounts com base nos dados do servidor
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
      
      // Ordenar as conversas com base na data da última mensagem
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

  // Função de marcar conversa como lida
  markConversationAsRead: async (userId) => {
    if (!userId || userId === 'ai-assistant') return;
    
    try {
      const authUser = useAuthStore.getState().authUser;
      
      // Atualizar localmente primeiro para resposta imediata na UI
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
      
      // Depois atualizar no servidor
      await axiosInstance.patch(`/messages/read/${userId}`);
      
      // Forçar sincronização com o servidor após atualização
      setTimeout(() => {
        get().getConversations();
      }, 300);
    } catch (error) {
      console.error("Erro ao marcar conversa como lida:", error);
    }
  },

  // Função para obter as mensagens de um utilizador específico
  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      const messages = Array.isArray(res.data) ? res.data : [];
      
      // Obter o ID do usuário autenticado
      const authUser = useAuthStore.getState().authUser;
      
      // Adiciona o usuário à lista de conversas visualizadas
      set(state => {
        const updatedViewedConversations = {
          ...state.viewedConversations,
          [userId]: true // Marcar como já visualizada
        };
        
        // Persistir no localStorage se o usuário estiver autenticado
        if (authUser?._id) {
          saveViewedConversations(authUser._id, updatedViewedConversations);
        }
        
        return {
          messages,
          viewedConversations: updatedViewedConversations
        };
      });
      
      // Marcar como lidas imediatamente ao obter mensagens
      await get().markConversationAsRead(userId);
    } catch (error) {
      console.error("Erro ao obter mensagens:", error);
      set({ messages: [] });
      toast.error(error.response?.data?.message || "Erro ao obter mensagens");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  // Função otimizada para enviar uma nova mensagem com suporte a ficheiros grandes
  sendMessage: async (messageData) => {
    const { selectedUser } = get();
    
    if (!selectedUser || !selectedUser._id) {
      toast.error("Nenhum destinatário selecionado");
      return null;
    }
    
    try {
      // Validações de entrada
      if (!messageData.text && !messageData.image && !messageData.file) {
        toast.error("Por favor, adicione conteúdo à mensagem");
        return null;
      }
  
      // Validação de arquivo
      if (messageData.file) {
        const isBase64 = messageData.file.data.startsWith('data:');
        const dataLength = isBase64 ? messageData.file.data.length : 0;
        const fileSize = parseInt(messageData.file.size || '0');
  
        const isEmptyOrInvalid = 
          !isBase64 || 
          dataLength <= 0 || 
          fileSize === 0 || 
          (messageData.file.type === 'text/plain' && (!messageData.file.data || messageData.file.data.trim() === ''));
  
        if (isEmptyOrInvalid) {
          console.warn("Tentativa de enviar arquivo inválido ou vazio", {
            isBase64,
            dataLength,
            fileSize,
            fileType: messageData.file.type
          });
          toast.error("Arquivo inválido ou vazio. Selecione um arquivo válido.");
          return null;
        }
      }
  
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 minutos
      
      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`, 
        messageData,
        { 
          signal: controller.signal,
          timeout: 600000,
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            console.log(`Upload progress: ${percentCompleted}%`);
          }
        }
      );
      
      clearTimeout(timeoutId);
      
      const newMessage = res.data;
      console.log("Mensagem enviada com sucesso:", newMessage);
      
      // Resto do código permanece igual
      // ...
    } catch (error) {
      // Tratamento de erro
      // ...
    }
  },

  // Função para se inscrever para notificações de novas mensagens por WebSocket
  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    
    // Desinscrever primeiro para evitar duplicação
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
            
            // Persistir no localStorage se o usuário estiver autenticado
            if (authUser?._id) {
              saveViewedConversations(authUser._id, updatedViewedConversations);
            }
            
            return {
              messages: [...state.messages, newMessage],
              viewedConversations: updatedViewedConversations
            };
          });
          
          // Marca como lida já que o utilizador está a visualizar a conversa
          get().markConversationAsRead(currentSelectedUser._id);
          
          // Atualiza a conversa com a mensagem como lida
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
              
              // Mover para o topo da lista
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
        // Se a mensagem é para o utilizador atual mas de outro remetente
        else if (newMessage.receiverId === authUser._id) {
          // Verificar se o ID do remetente está nas conversas já visualizadas
          const isConversationPreviouslyViewed = viewedConversations[newMessage.senderId];
          
          // Verificar se a última mensagem da conversa é mais antiga que a nova mensagem
          const existingConv = get().conversations.find(
            c => c.participants && c.participants.includes(newMessage.senderId)
          );
          
          let isNewConversation = false;
          
          // Se não existe conversa ou a última mensagem é mais antiga que a nova
          if (!existingConv || !existingConv.latestMessage || 
              (new Date(existingConv.latestMessage.createdAt) < new Date(newMessage.createdAt))) {
            isNewConversation = true;
          }
          
          // Só incrementa contadores e toca som se for uma nova conversa
          // E se a conversa não foi visualizada anteriormente
          if (isNewConversation && !isConversationPreviouslyViewed) {
            // Tocar som de notificação aqui
            try {
              const notificationSound = new Audio('/notification.mp3');
              notificationSound.volume = 0.5;
              notificationSound.play().catch(err => console.log('Erro ao tocar som:', err));
            } catch (err) {
              console.log('Erro ao criar áudio:', err);
            }
            
            // Incrementar contador de não lidas apenas para conversas não visualizadas
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
          
          // Sempre atualiza a conversa na UI, mas sem incrementar contadores se já foi visualizada
          set(state => {
            const updatedConversations = [...state.conversations];
            
            // Encontrar conversa existente ou criar nova
            const existingConvIndex = updatedConversations.findIndex(
              c => c.participants && c.participants.includes(newMessage.senderId)
            );
            
            if (existingConvIndex >= 0) {
              // Se conversa já foi visualizada, não incrementa contador
              const currentUnreadCount = isConversationPreviouslyViewed ? 
                0 : (updatedConversations[existingConvIndex].unreadCount || 0) + 1;
              
              updatedConversations[existingConvIndex] = {
                ...updatedConversations[existingConvIndex],
                latestMessage: {
                  ...newMessage,
                  read: isConversationPreviouslyViewed // Marca como lida se já foi visualizada
                },
                unreadCount: currentUnreadCount
              };
              
              // Mover para o topo da lista
              const updatedConv = updatedConversations.splice(existingConvIndex, 1)[0];
              updatedConversations.unshift(updatedConv);
            } else {
              // Criar nova conversa - se for nova e não visualizada, começa com unreadCount=1
              updatedConversations.unshift({
                participants: [authUser._id, newMessage.senderId],
                latestMessage: newMessage,
                unreadCount: isConversationPreviouslyViewed ? 0 : 1
              });
            }
            
            // Atualizar o estado de unreadCounts também
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
        
        // Sincronizar com o servidor depois de um curto atraso
        setTimeout(() => {
          get().getConversations();
        }, 500);
      });

      // Inscrever-se para eventos de exclusão de mensagens
      socket.on("messageDeleted", (messageId) => {
        // Remover a mensagem da lista se existir
        set(state => ({
          messages: state.messages.filter(msg => msg._id !== messageId)
        }));
        
        // Atualizar conversas após um curto atraso
        setTimeout(() => {
          get().getConversations();
        }, 300);
      });
    } else {
      console.warn("Socket não disponível para subscrever mensagens");
    }
  },

  // Função para se desinscrever das notificações de novas mensagens
  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (socket && socket.connected) {
      socket.off("newMessage");
      socket.off("messageDeleted");
    }
  },

  // Função para definir o utilizador selecionado no chat - MODIFICADA PARA LIMPAR GRUPO SELECIONADO
  setSelectedUser: (selectedUser) => {
    const authUser = useAuthStore.getState().authUser;
    
    // Limpar qualquer grupo selecionado quando um usuário é selecionado
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
      // Se houver um usuário selecionado que não é o assistente
      if (selectedUser && selectedUser._id !== 'ai-assistant') {
        const updatedViewedConversations = {
          ...state.viewedConversations,
          [selectedUser._id]: true
        };
        
        // Persistir no localStorage se o usuário estiver autenticado
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
    
    // Se houver um utilizador selecionado, marcar como lida antes de buscar mensagens
    if (selectedUser && selectedUser._id !== 'ai-assistant') {
      // Marcar como lida ANTES de buscar mensagens para resposta mais rápida da UI
      get().markConversationAsRead(selectedUser._id);
      get().getMessages(selectedUser._id);
    }
  },

  // Função para buscar o histórico de transferências
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
  
  // Função para se inscrever para notificações de novas transferências por WebSocket
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

  // Função para se desinscrever das notificações de transferências
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

  // Remover contacto (versão melhorada)
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

  // Nova função para bloquear utilizador
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

  // Função melhorada para excluir mensagens com suporte a ficheiros
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
  
 // Função para desbloquear um utilizador
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

// Nova função para resetar o estado do chat (para usar no logout)
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
    viewedConversations: {} // Limpar conversas visualizadas
  });
}
}));