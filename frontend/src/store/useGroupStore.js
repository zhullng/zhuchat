// store/useGroupStore.js
import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import { useChatStore } from "./useChatStore";

export const useGroupStore = create((set, get) => ({
  // Estado
  groups: [],
  selectedGroup: null,
  groupMessages: [],
  isGroupsLoading: false,
  isGroupMessagesLoading: false,
  unreadGroupCounts: {}, // {groupId: count}
  
  // Inicializar
  initializeGroups: async () => {
    set({ isGroupsLoading: true });
    try {
      const res = await axiosInstance.get("/groups");
      set({ groups: res.data || [] });
      
      // Calcular mensagens não lidas para cada grupo
      await get().calculateUnreadCounts();
    } catch (error) {
      console.error("Erro ao inicializar grupos:", error);
      toast.error("Erro ao carregar grupos");
    } finally {
      set({ isGroupsLoading: false });
    }
  },
  
  // Calcular contadores de não lidos
  calculateUnreadCounts: async () => {
    const unreadCounts = {};
    const groups = get().groups;
    
    try {
      for (const group of groups) {
        const res = await axiosInstance.get(`/groups/${group._id}/messages`);
        const messages = res.data || [];
        const authUser = useAuthStore.getState().authUser;
        
        // Contar mensagens não lidas (onde o usuário não está na lista de leitores)
        const unreadCount = messages.filter(msg => 
          !msg.read.some(r => r.userId === authUser._id)
        ).length;
        
        unreadCounts[group._id] = unreadCount;
      }
      
      set({ unreadGroupCounts: unreadCounts });
    } catch (error) {
      console.error("Erro ao calcular contadores de não lidos:", error);
    }
  },
  
  // Criar um novo grupo
  createGroup: async (groupData) => {
    try {
      const res = await axiosInstance.post("/groups/create", groupData);
      const newGroup = res.data;
      
      set(state => ({
        groups: [newGroup, ...state.groups],
        selectedGroup: newGroup
      }));
      
      // Limpar qualquer chat selecionado quando um novo grupo é criado
      try {
        const chatStore = useChatStore.getState();
        if (chatStore && chatStore.setSelectedUser) {
          chatStore.setSelectedUser(null);
        }
      } catch (error) {
        console.warn("Não foi possível limpar o usuário selecionado:", error);
      }
      
      toast.success("Grupo criado com sucesso!");
      return newGroup;
    } catch (error) {
      console.error("Erro ao criar grupo:", error);
      toast.error(error.response?.data?.error || "Erro ao criar grupo");
      throw error;
    }
  },
  
  // Selecionar um grupo
  selectGroup: (group) => {
    // Definir o grupo selecionado
    set({ selectedGroup: group });
    
    // Se um grupo foi selecionado
    if (group) {
      // Limpar qualquer chat selecionado quando um grupo é selecionado
      try {
        const chatStore = useChatStore.getState();
        if (chatStore && chatStore.setSelectedUser) {
          chatStore.setSelectedUser(null);
        }
      } catch (error) {
        console.warn("Não foi possível limpar o usuário selecionado:", error);
      }
      
      // Carregar mensagens e marcar como lidas
      get().getGroupMessages(group._id);
      get().markGroupAsRead(group._id);
    }
  },
  
  // Obter mensagens de um grupo
  getGroupMessages: async (groupId) => {
    set({ isGroupMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/groups/${groupId}/messages`);
      set({ groupMessages: res.data || [] });
    } catch (error) {
      console.error("Erro ao obter mensagens do grupo:", error);
      toast.error("Erro ao carregar mensagens do grupo");
      set({ groupMessages: [] });
    } finally {
      set({ isGroupMessagesLoading: false });
    }
  },
  
  // Marcar mensagens de grupo como lidas
  markGroupAsRead: async (groupId) => {
    try {
      await axiosInstance.patch(`/groups/${groupId}/read`);
      
      // Atualizar contador localmente
      set(state => ({
        unreadGroupCounts: {
          ...state.unreadGroupCounts,
          [groupId]: 0
        }
      }));
    } catch (error) {
      console.error("Erro ao marcar mensagens como lidas:", error);
    }
  },
  
  // Enviar mensagem para o grupo
  sendGroupMessage: async (groupId, messageData) => {
    try {
      const authUser = useAuthStore.getState().authUser;
      
      // Criar uma mensagem temporária para mostrar imediatamente, antes da resposta do servidor
      const tempMessage = {
        _id: Date.now().toString(), // ID temporário
        text: messageData.text || "",
        image: messageData.image || null,
        file: messageData.file || null,
        senderId: {
          _id: authUser._id,
          fullName: authUser.fullName || "Você",
          profilePic: authUser.profilePic || "/avatar.png"
        },
        createdAt: new Date().toISOString(),
        groupId: groupId,
        read: []
      };
      
      // Adicionar a mensagem temporária ao estado ANTES da chamada API
      set(state => ({
        groupMessages: [...state.groupMessages, tempMessage]
      }));
      
      // Garantir scroll imediato para a nova mensagem
      setTimeout(() => {
        const messageEnd = document.getElementById('message-end-ref');
        if (messageEnd) {
          messageEnd.scrollIntoView({ behavior: 'smooth' });
        }
      }, 50);
  
      // Fazer a chamada API em segundo plano
      const res = await axiosInstance.post(`/groups/${groupId}/message`, messageData);
      const newMessage = res.data;
      
      // Substituir silenciosamente a mensagem temporária pela versão do servidor
      set(state => ({
        groupMessages: state.groupMessages.map(msg => 
          msg._id === tempMessage._id ? newMessage : msg
        )
      }));
      
      return newMessage;
    } catch (error) {
      console.error("Erro ao enviar mensagem ao grupo:", error);
      toast.error("Erro ao enviar mensagem");
      
      // Remover a mensagem temporária em caso de erro
      set(state => ({
        groupMessages: state.groupMessages.filter(msg => 
          !msg._id.toString().startsWith(Date.now().toString().substring(0, 8))
        )
      }));
      
      throw error;
    }
  },
  
  // Subscrever a eventos de grupo via WebSocket
  subscribeToGroupEvents: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    
    // Remover listeners existentes primeiro
    socket.off("newGroup");
    socket.off("newGroupMessage");
    socket.off("addedToGroup");
    socket.off("removedFromGroup");
    socket.off("groupDeleted");
    socket.off("groupMemberLeft");
    socket.off("memberRemovedFromGroup");
    
    // Novo grupo criado
    socket.on("newGroup", (group) => {
      set(state => ({
        groups: [group, ...state.groups],
        unreadGroupCounts: {
          ...state.unreadGroupCounts,
          [group._id]: 0
        }
      }));
      toast.success(`Você foi adicionado ao grupo ${group.name}`);
    });
    
    // Nova mensagem no grupo
    socket.on("newGroupMessage", ({ message, group }) => {
      console.log("Socket: Nova mensagem de grupo recebida", message);
      
      const authUser = useAuthStore.getState().authUser;
      const currentGroup = get().selectedGroup;
      
      // Validar mensagem e remetente
      if (!message || !message.senderId) {
        console.warn("Mensagem inválida recebida", message);
        return;
      }
      
      // Determinar ID do remetente
      const senderId = typeof message.senderId === 'object' 
        ? message.senderId._id 
        : message.senderId;
      
      // Ignorar mensagens enviadas pelo usuário atual
      if (senderId === authUser._id) {
        console.log("Ignorando mensagem enviada pelo usuário atual");
        return;
      }
      
      // Verificar se a mensagem já existe para evitar duplicação
      const isDuplicateMessage = get().groupMessages.some(
        existingMsg => existingMsg._id === message._id
      );
      
      if (isDuplicateMessage) {
        console.log("Mensagem já existe, ignorando duplicata");
        return;
      }
      
      // Verificar se a mensagem é para o grupo atualmente selecionado
      if (currentGroup && currentGroup._id === message.groupId) {
        // Adicionar mensagem às mensagens do grupo
        set(state => ({
          groupMessages: [...state.groupMessages, message]
        }));
        
        // Marcar grupo como lido
        get().markGroupAsRead(message.groupId);
        
        // Garantir rolagem para o final
        setTimeout(() => {
          const messageEnd = document.getElementById('message-end-ref');
          if (messageEnd) {
            messageEnd.scrollIntoView({ behavior: 'smooth' });
          }
        }, 50);
      } else {
        // Atualizar contador de não lidos para outros grupos
        set(state => ({
          unreadGroupCounts: {
            ...state.unreadGroupCounts,
            [message.groupId]: (state.unreadGroupCounts[message.groupId] || 0) + 1
          }
        }));
        
        // Som de notificação
        try {
          const notificationSound = new Audio('/notification.mp3');
          notificationSound.volume = 0.5;
          notificationSound.play().catch(err => console.log('Erro ao reproduzir som:', err));
        } catch (err) {
          console.log('Erro na criação de áudio:', err);
        }
        
        // Notificação toast
        toast.success(`Nova mensagem no grupo ${group.name}`);
      }
    });
    
    // Adicionado a um grupo
    socket.on("addedToGroup", ({ group, message }) => {
      // Verificar se o grupo já existe na lista
      const existingGroup = get().groups.find(g => g._id === group._id);
      
      if (!existingGroup) {
        set(state => ({
          groups: [group, ...state.groups],
          unreadGroupCounts: {
            ...state.unreadGroupCounts,
            [group._id]: 0
          }
        }));
      }
      
      toast.success(message || `Você foi adicionado ao grupo ${group.name}`);
    });
    
    // Removido de um grupo
    socket.on("removedFromGroup", ({ groupId, groupName, message }) => {
      set(state => ({
        groups: state.groups.filter(g => g._id !== groupId),
        selectedGroup: state.selectedGroup?._id === groupId ? null : state.selectedGroup,
        unreadGroupCounts: {
          ...state.unreadGroupCounts,
          [groupId]: undefined // Remove contadores
        }
      }));
      toast.info(message || "Você foi removido de um grupo");
    });
    
    // Grupo excluído
    socket.on("groupDeleted", ({ groupId, groupName, message }) => {
      set(state => ({
        groups: state.groups.filter(g => g._id !== groupId),
        selectedGroup: state.selectedGroup?._id === groupId ? null : state.selectedGroup,
        unreadGroupCounts: {
          ...state.unreadGroupCounts,
          [groupId]: undefined // Remove contadores
        }
      }));
      toast.info(message || `O grupo "${groupName || 'selecionado'}" foi excluído`);
    });
    
    // Membro saiu do grupo
    socket.on("groupMemberLeft", ({ groupId, userId, userName, groupName }) => {
      const currentGroup = get().selectedGroup;
      
      // Atualizar o grupo localmente
      if (currentGroup && currentGroup._id === groupId) {
        // Atualizar o grupo no estado, removendo o membro
        set(state => ({
          selectedGroup: {
            ...state.selectedGroup,
            members: state.selectedGroup.members.filter(m => 
              typeof m === 'object' 
                ? m._id !== userId 
                : m.toString() !== userId.toString()
            )
          }
        }));
      }
      
      // Se necessário, também atualize a lista de grupos
      set(state => ({
        groups: state.groups.map(g => {
          if (g._id === groupId) {
            return {
              ...g,
              members: g.members.filter(m => 
                typeof m === 'object' 
                  ? m._id !== userId 
                  : m.toString() !== userId.toString()
              )
            };
          }
          return g;
        })
      }));
      
      // Adicionar notificação de sistema
      toast.info(`${userName || 'Um usuário'} saiu do grupo ${groupName || ''}`);
    });
    
    // Membro removido do grupo pelo admin
    socket.on("memberRemovedFromGroup", ({ groupId, removedUserId, removedUserName, message }) => {
      const currentGroup = get().selectedGroup;
      
      // Atualizar o grupo localmente
      if (currentGroup && currentGroup._id === groupId) {
        // Atualizar o grupo no estado, removendo o membro
        set(state => ({
          selectedGroup: {
            ...state.selectedGroup,
            members: state.selectedGroup.members.filter(m => 
              typeof m === 'object' 
                ? m._id !== removedUserId 
                : m.toString() !== removedUserId.toString()
            )
          }
        }));
      }
      
      // Se necessário, também atualize a lista de grupos
      set(state => ({
        groups: state.groups.map(g => {
          if (g._id === groupId) {
            return {
              ...g,
              members: g.members.filter(m => 
                typeof m === 'object' 
                  ? m._id !== removedUserId 
                  : m.toString() !== removedUserId.toString()
              )
            };
          }
          return g;
        })
      }));
      
      // Adicionar notificação de sistematoast.info(message || `${removedUserName || 'Um usuário'} foi removido do grupo`);
    });
  },
  
  // Cancelar subscrição de eventos
  unsubscribeFromGroupEvents: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    
    socket.off("newGroup");
    socket.off("newGroupMessage");
    socket.off("addedToGroup");
    socket.off("removedFromGroup");
    socket.off("groupDeleted");
    socket.off("groupMemberLeft");
    socket.off("memberRemovedFromGroup");
  },
  
  // Resetar estado (para logout)
  resetGroupState: () => {
    set({
      groups: [],
      selectedGroup: null,
      groupMessages: [],
      isGroupsLoading: false,
      isGroupMessagesLoading: false,
      unreadGroupCounts: {}
    });
  }
}));