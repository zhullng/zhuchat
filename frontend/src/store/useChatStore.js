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

  // Função para obter a lista de utilizadores
  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      // Verificar se a API de contactos existe, senão cair para a API de utilizadores
      try {
        console.log("Tentando obter contactos...");
        const contactsRes = await axiosInstance.get("/contacts");
        console.log("Contactos obtidos:", contactsRes.data);
        
        // Garantir que a resposta é um array
        const contactsData = Array.isArray(contactsRes.data) ? contactsRes.data : [];
        
        // Transformar os contactos no formato esperado pela UI
        const contactUsers = contactsData.map(contact => ({
          _id: contact.user?._id,
          fullName: contact.user?.fullName || "Utilizador desconhecido",
          email: contact.user?.email || "",
          profilePic: contact.user?.profilePic || "",
          note: contact.note || "",
          contactId: contact._id // Guardar o ID do contato para facilitar a remoção
        }));
        
        set({ users: contactUsers });
      } catch (contactError) {
        console.warn("Erro ao obter contactos, usando todos os utilizadores:", contactError);
        // Fallback: buscar todos os utilizadores se a API de contactos falhar
        const usersRes = await axiosInstance.get("/messages/users");
        const usersData = Array.isArray(usersRes.data) ? usersRes.data : [];
        set({ users: usersData });
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

  // Função para obter as conversas e ordená-las por recentes (versão corrigida)
  getConversations: async () => {
    try {
      const res = await axiosInstance.get("/messages/conversations");
      const conversations = res.data || []; // Garante que será um array
      
      // Verificar se a resposta é realmente um array
      if (!Array.isArray(conversations)) {
        console.error("Resposta de conversas não é um array:", conversations);
        set({ conversations: [], unreadCounts: {} });
        return;
      }
      
      // Resetar completamente unreadCounts com base nos dados do servidor
      const unreadCounts = {};
      const authUser = useAuthStore.getState().authUser;
      
      // Registrar todos os IDs de participantes para depuração
      const allParticipantIds = conversations.flatMap(conv => conv.participants || []);
      console.log("Todos os IDs de participantes:", allParticipantIds);
      
      conversations.forEach(conv => {
        if (!conv.participants || !Array.isArray(conv.participants)) {
          console.warn("Conversa sem participantes válidos:", conv);
          return;
        }
        
        // Encontrar o ID do outro participante
        const otherUserId = conv.participants.find(id => id !== authUser._id);
        if (!otherUserId) {
          console.warn("Não foi possível encontrar o outro participante:", conv.participants);
          return;
        }
        
        console.log(`Processando conversa com ${otherUserId}, mensagem lida:`, 
          conv.latestMessage ? conv.latestMessage.read : "sem mensagem");
        
        // Se a última mensagem não foi lida e não foi enviada pelo usuário atual
        if (conv.latestMessage && !conv.latestMessage.read && 
            conv.latestMessage.senderId !== authUser._id) {
          // Confiar na contagem do servidor ou usar 1 como mínimo
          unreadCounts[otherUserId] = conv.unreadCount || 1;
          console.log(`Definindo ${unreadCounts[otherUserId]} mensagens não lidas para ${otherUserId}`);
        } else {
          // Se a última mensagem foi lida ou foi enviada pelo usuário, zerar a contagem
          unreadCounts[otherUserId] = 0;
          console.log(`Zerando contagem de não lidas para ${otherUserId}`);
        }
      });
      
      console.log("Contagem final de não lidas:", unreadCounts);
      
      // Ordenar as conversas com base na data da última mensagem
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
      // Definir valores vazios em caso de erro
      set({ conversations: [], unreadCounts: {} });
    }
  },

  // Função de marcar conversa como lida - melhorada e corrigida
  markConversationAsRead: async (userId) => {
    // Não fazer nada se userId é inválido ou não tem mensagens não lidas
    if (!userId || userId === 'ai-assistant') return;
    
    const currentUnreadCount = get().unreadCounts[userId] || 0;
    console.log(`Tentando marcar como lidas ${currentUnreadCount} mensagens para ${userId}`);
    
    if (currentUnreadCount === 0) {
      console.log("Nenhuma mensagem não lida para marcar");
      return;
    }
    
    try {
      console.log("Atualizando estado local para marcação de leitura");
      
      // Importante: atualizar localmente primeiro para resposta imediata na UI
      set(state => {
        // Atualizar o contador de mensagens não lidas para 0
        const newUnreadCounts = {
          ...state.unreadCounts,
          [userId]: 0
        };
        
        // Atualizar a propriedade "read" na última mensagem da conversa
        const newConversations = state.conversations.map(conv => {
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
        });
        
        console.log(`Estado local atualizado: ${userId} agora tem 0 mensagens não lidas`);
        
        // Retornar o novo estado
        return { 
          unreadCounts: newUnreadCounts,
          conversations: newConversations
        };
      });
      
      // Depois atualizar no servidor
      console.log(`Enviando requisição para marcar mensagens como lidas para ${userId}`);
      await axiosInstance.patch(`/messages/read/${userId}`);
      console.log("Servidor atualizado com sucesso");
      
      // Forçar sincronização com o servidor após um curto atraso
      setTimeout(() => {
        console.log("Sincronizando estado com servidor após marcação de leitura");
        get().getConversations();
      }, 300);
    } catch (error) {
      console.error("Erro ao marcar conversa como lida:", error);
      // Restaurar estado anterior em caso de erro
      get().getConversations();
    }
  },

  // Função para obter as mensagens de um utilizador específico
  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      console.log(`Obtendo mensagens para ${userId}`);
      const res = await axiosInstance.get(`/messages/${userId}`);
      const messages = Array.isArray(res.data) ? res.data : [];
      console.log(`${messages.length} mensagens obtidas`);
      
      set({ messages });
      
      // CRÍTICO: Marcar mensagens como lidas quando abre a conversa
      console.log("Marcando mensagens como lidas após obter mensagens");
      await get().markConversationAsRead(userId);
    } catch (error) {
      console.error("Erro ao obter mensagens:", error);
      set({ messages: [] });
      toast.error(error.response?.data?.message || "Erro ao obter mensagens");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  // Função para enviar uma nova mensagem
  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      console.log(`Enviando mensagem para ${selectedUser._id}`);
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      const newMessage = res.data;
      console.log("Mensagem enviada com sucesso:", newMessage);
      
      // Adicionar mensagem à lista de mensagens
      set({ messages: [...messages, newMessage] });
      
      // Atualizar conversas com nova mensagem imediatamente para melhor resposta da UI
      set(state => {
        const authUser = useAuthStore.getState().authUser;
        const updatedConversations = [...state.conversations];
        
        // Encontrar conversa existente ou criar nova
        const existingConvIndex = updatedConversations.findIndex(
          c => c.participants && c.participants.includes(selectedUser._id)
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
      setTimeout(() => {
        console.log("Sincronizando conversas após envio de mensagem");
        get().getConversations();
      }, 300);
      
      return newMessage;
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      toast.error(error.response?.data?.message || "Erro ao enviar mensagem");
      throw error;
    }
  },

  // Função para se inscrever para notificações de novas mensagens por WebSocket (versão melhorada)
  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    
    // Desinscrever primeiro para evitar duplicação
    if (socket) {
      socket.off("newMessage");

      socket.on("newMessage", (newMessage) => {
        const authUser = useAuthStore.getState().authUser;
        const currentSelectedUser = get().selectedUser;
        
        console.log("Nova mensagem recebida:", newMessage);
        
        // Se a mensagem é do utilizador selecionado atualmente, adiciona à lista de mensagens
        if (currentSelectedUser && newMessage.senderId === currentSelectedUser._id) {
          console.log("Mensagem é do usuário atual selecionado, adicionando à conversa");
          
          set(state => ({
            messages: [...state.messages, newMessage],
          }));
          
          // Marca como lida já que o utilizador está a visualizar a conversa
          console.log("Usuário está visualizando a conversa, marcando como lida automaticamente");
          get().markConversationAsRead(currentSelectedUser._id);
        } 
        // Se a mensagem é para o utilizador atual mas de outro remetente
        else if (newMessage.receiverId === authUser._id) {
          console.log("Mensagem recebida de outro usuário, incrementando contagem não lida");
          
          // Tocar som de notificação aqui
          try {
            const notificationSound = new Audio('/notification.mp3');
            notificationSound.volume = 0.5;
            notificationSound.play().catch(err => console.log('Erro ao tocar som:', err));
          } catch (err) {
            console.log('Erro ao criar áudio:', err);
          }
          
          // Incrementar contador de não lidos de forma segura
          set(state => {
            const senderId = newMessage.senderId;
            const currentCount = state.unreadCounts[senderId] || 0;
            
            // Limitar a contagem máxima a 99 para evitar problemas visuais
            const newCount = Math.min(currentCount + 1, 99);
            console.log(`Incrementando contagem não lida para ${senderId}: ${currentCount} -> ${newCount}`);
            
            return {
              unreadCounts: {
                ...state.unreadCounts,
                [senderId]: newCount
              }
            };
          });
          
          // Atualizar imediatamente a conversa na UI
          set(state => {
            const updatedConversations = [...state.conversations];
            
            // Encontrar conversa existente ou criar nova
            const existingConvIndex = updatedConversations.findIndex(
              c => c.participants && c.participants.includes(newMessage.senderId)
            );
            
            if (existingConvIndex >= 0) {
              // Atualizar conversa existente
              const currentUnreadCount = updatedConversations[existingConvIndex].unreadCount || 0;
              const newUnreadCount = Math.min(currentUnreadCount + 1, 99);
              
              console.log(`Atualizando conversa existente, incrementando não lidas: ${currentUnreadCount} -> ${newUnreadCount}`);
              
              updatedConversations[existingConvIndex] = {
                ...updatedConversations[existingConvIndex],
                latestMessage: newMessage,
                unreadCount: newUnreadCount
              };
              
              // Mover para o topo da lista
              const updatedConv = updatedConversations.splice(existingConvIndex, 1)[0];
              updatedConversations.unshift(updatedConv);
            } else {
              // Criar nova conversa
              console.log("Criando nova conversa para mensagem recebida");
              
              updatedConversations.unshift({
                participants: [authUser._id, newMessage.senderId],
                latestMessage: newMessage,
                unreadCount: 1
              });
            }
            
            return { conversations: updatedConversations };
          });
        }
        
        // Sincronizar com o servidor depois de um curto atraso
        // para permitir que o servidor processe a mensagem
        setTimeout(() => {
          console.log("Sincronizando estado após receber nova mensagem");
          get().getConversations();
        }, 500);
      });
      
      console.log("Inscrito para notificações de novas mensagens");
    } else {
      console.warn("Socket não disponível para subscrever mensagens");
    }
  },

  // Função para se desinscrever das notificações de novas mensagens
  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (socket && socket.connected) {
      socket.off("newMessage");
      console.log("Desincrito de notificações de novas mensagens");
    }
  },

  // Função para definir o utilizador selecionado no chat
  setSelectedUser: (selectedUser) => {
    console.log("Selecionando usuário:", selectedUser?._id || "nenhum");
    set({ selectedUser });
    
    // Se houver um utilizador selecionado, buscar mensagens e marcar como lidas
    if (selectedUser && selectedUser._id !== 'ai-assistant') {
      console.log(`Usuário ${selectedUser._id} selecionado, obtendo mensagens`);
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
      
      console.log("Inscrito para notificações de transferências");
    } else {
      console.warn("Socket não disponível para subscrever transferências");
    }
  },

  // Função para se desinscrever das notificações de transferências
  unsubscribeFromTransfers: () => {
    const socket = useAuthStore.getState().socket;
    if (socket && socket.connected) {
      socket.off("transfer-update");
      console.log("Desinscrito de notificações de transferências");
    }
  },

  // Adicionar contacto (corrigido)
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
        console.log(`Removendo contato usando contactId: ${user.contactId}`);
        const res = await axiosInstance.delete(`/contacts/${user.contactId}`);
        toast.success("Contacto removido com sucesso");
        // Atualizar a lista de contactos
        get().getUsers();
        return res.data;
      } 
      // Caso contrário, usamos o ID do usuário diretamente
      else {
        console.log(`Removendo contato usando userId: ${userId}`);
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
  
  // Nova função para resetar o estado do chat (para usar no logout)
  resetChatState: () => {
    console.log("Resetando estado do chat");
    set({
      messages: [],
      users: [],
      selectedUser: null,
      isUsersLoading: false,
      isMessagesLoading: false,
      transfers: [],
      isTransfersLoading: false,
      conversations: [],
      unreadCounts: {}
    });
  }
}));