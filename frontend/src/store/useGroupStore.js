// store/useGroupStore.js
import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import { useChatStore } from "./useChatStore"; // Importação adicionada

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
  
  // Selecionar um grupo - MODIFICADA para limpar chat selecionado
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
  
  // Obter mensagens de um grupo - CORRIGIDA
  getGroupMessages: async (groupId) => {
    set({ isGroupMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/groups/${groupId}/messages`);
      const messages = res.data || [];
      const authUser = useAuthStore.getState().authUser;
      const selectedGroup = get().selectedGroup;
      
      // Processar mensagens para garantir que todas tenham os dados de remetente corretamente formatados
      const formattedMessages = messages.map(message => {
        // Se já for um objeto completo, não precisamos modificar
        if (typeof message.senderId === 'object' && 
            message.senderId && 
            message.senderId.fullName) {
          return message;
        }
        
        // Obter o ID do remetente
        const senderId = typeof message.senderId === 'object' 
          ? message.senderId?._id 
          : message.senderId;
        
        // Se for o usuário atual
        if (senderId === authUser._id) {
          return {
            ...message,
            senderId: {
              _id: authUser._id,
              fullName: authUser.fullName || 'Você',
              profilePic: authUser.profilePic || '/avatar.png'
            }
          };
        }
        
        // Tenta encontrar o membro no grupo selecionado
        if (selectedGroup && selectedGroup.members) {
          const member = selectedGroup.members.find(m => m._id === senderId);
          if (member) {
            return {
              ...message,
              senderId: {
                _id: member._id,
                fullName: member.fullName || 'Membro do grupo',
                profilePic: member.profilePic || '/avatar.png'
              }
            };
          }
        }
        
        // Se não conseguir encontrar, usa um valor padrão
        return {
          ...message,
          senderId: {
            _id: senderId || 'unknown',
            fullName: 'Membro do grupo',
            profilePic: '/avatar.png'
          }
        };
      });
      
      set({ groupMessages: formattedMessages });
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
  
  // Modificação na função sendGroupMessage do useGroupStore.js:

// Enviar mensagem para o grupo - CORRIGIDA para evitar refresh
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
        // Outros campos que podem ser necessários com valores padrão
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
          msg._id === tempMessage._id ? 
          {
            ...newMessage,
            senderId: {
              _id: authUser._id,
              fullName: authUser.fullName || "Você",
              profilePic: authUser.profilePic || "/avatar.png"
            }
          } : msg
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
  
  // Adicionar membros ao grupo
// Atualização da função addGroupMembers no useGroupStore.js
addGroupMembers: async (groupId, members) => {
  try {
    // Validação básica
    if (!Array.isArray(members) || members.length === 0) {
      toast.error("É necessário selecionar pelo menos um usuário");
      return false;
    }
    
    // Mostrar toast de carregamento
    const loadingToast = toast.loading("Adicionando membros...");
    
    const response = await axiosInstance.post(`/groups/${groupId}/members`, { members });
    
    // Verificar se temos um grupo atualizado na resposta
    const updatedGroup = response.data?.group;
    
    // Atualizar estado local
    set(state => {
      // Preparar o novo estado
      const newState = { ...state };
      
      if (updatedGroup) {
        // Atualizar na lista de grupos
        newState.groups = state.groups.map(g => 
          g._id === groupId ? updatedGroup : g
        );
        
        // Atualizar selectedGroup se for o mesmo
        if (state.selectedGroup?._id === groupId) {
          newState.selectedGroup = updatedGroup;
        }
      }
      
      return newState;
    });
    
    // Fechar toast de carregamento e mostrar sucesso
    toast.dismiss(loadingToast);
    toast.success(response.data?.message || "Membros adicionados com sucesso");
    
    return true;
  } catch (error) {
    console.error("Erro ao adicionar membros:", error);
    toast.error(error.response?.data?.error || "Erro ao adicionar membros");
    throw error;
  }
},
  
  // Remover membro do grupo
// Atualização da função removeGroupMember no useGroupStore.js
removeGroupMember: async (groupId, memberId) => {
  try {
    // Mostrar toast de carregamento
    const loadingToast = toast.loading("Removendo membro...");
    
    const response = await axiosInstance.delete(`/groups/${groupId}/members/${memberId}`);
    
    // Se o servidor retorna o grupo atualizado, use-o
    const updatedGroup = response.data?.updatedGroup;
    
    // Atualizar grupo na lista e selectedGroup se necessário
    set(state => {
      // Preparar o novo estado
      const newState = { ...state };
      
      // Se temos o grupo atualizado do servidor
      if (updatedGroup) {
        // Atualizar na lista de grupos
        newState.groups = state.groups.map(g => 
          g._id === groupId ? updatedGroup : g
        );
        
        // Atualizar selectedGroup se for o mesmo
        if (state.selectedGroup?._id === groupId) {
          newState.selectedGroup = updatedGroup;
        }
      } else {
        // Caso contrário, remover o membro localmente
        
        // Atualizar na lista de grupos
        newState.groups = state.groups.map(g => {
          if (g._id === groupId) {
            return {
              ...g,
              members: g.members.filter(m => 
                typeof m === 'object'
                  ? m._id !== memberId
                  : m.toString() !== memberId
              )
            };
          }
          return g;
        });
        
        // Atualizar selectedGroup se for o mesmo
        if (state.selectedGroup?._id === groupId) {
          newState.selectedGroup = {
            ...state.selectedGroup,
            members: state.selectedGroup.members.filter(m => 
              typeof m === 'object'
                ? m._id !== memberId
                : m.toString() !== memberId
            )
          };
        }
      }
      
      return newState;
    });
    
    // Fechar toast de carregamento e mostrar sucesso
    toast.dismiss(loadingToast);
    toast.success("Membro removido com sucesso");
    
    return true;
  } catch (error) {
    console.error("Erro ao remover membro:", error);
    toast.error(error.response?.data?.error || "Erro ao remover membro");
    throw error;
  }
},
  
 // Atualização da função leaveGroup no useGroupStore.js

// Sair de um grupo
leaveGroup: async (groupId) => {
  try {
    // Mostrar toast de carregamento
    const loadingToast = toast.loading("Saindo do grupo...");
    
    await axiosInstance.delete(`/groups/${groupId}/leave`);
    
    // Atualizar estado local
    set(state => ({
      groups: state.groups.filter(g => g._id !== groupId),
      selectedGroup: state.selectedGroup?._id === groupId ? null : state.selectedGroup,
      unreadGroupCounts: {
        ...state.unreadGroupCounts,
        [groupId]: undefined // Remove contadores para este grupo
      }
    }));
    
    // Fechar toast de carregamento e mostrar sucesso
    toast.dismiss(loadingToast);
    toast.success("Você saiu do grupo com sucesso");
    
    return true;
  } catch (error) {
    console.error("Erro ao sair do grupo:", error);
    toast.error(error.response?.data?.error || "Erro ao sair do grupo");
    throw error;
  }
},
  
  // Deletar um grupo
// Atualização da função deleteGroup no useGroupStore.js
deleteGroup: async (groupId) => {
  try {
    // Mostrar toast de carregamento
    const loadingToast = toast.loading("Excluindo grupo...");
    
    await axiosInstance.delete(`/groups/${groupId}`);
    
    // Atualizar estado local
    set(state => ({
      groups: state.groups.filter(g => g._id !== groupId),
      selectedGroup: state.selectedGroup?._id === groupId ? null : state.selectedGroup,
      unreadGroupCounts: {
        ...state.unreadGroupCounts,
        [groupId]: undefined // Remove contadores para este grupo
      }
    }));
    
    // Fechar toast de carregamento e mostrar sucesso
    toast.dismiss(loadingToast);
    toast.success("Grupo excluído com sucesso");
    
    return true;
  } catch (error) {
    console.error("Erro ao excluir grupo:", error);
    toast.error(error.response?.data?.error || "Erro ao excluir grupo");
    throw error;
  }
},
  
  // Subscrever a eventos de grupo via WebSocket
 // Adicionar ao método subscribeToGroupEvents no useGroupStore.js

// Subscrever a eventos de grupo via WebSocket
// Atualização completa do método subscribeToGroupEvents no useGroupStore.js
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
    const authUser = useAuthStore.getState().authUser;
    const currentGroup = get().selectedGroup;
    
    // Formatar a mensagem recebida via socket
    let formattedMessage = {...message};
    const senderId = typeof message.senderId === 'object' ? message.senderId._id : message.senderId;
    
    // Se a mensagem for do usuário atual
    if (senderId === authUser._id) {
      formattedMessage = {
        ...formattedMessage,
        senderId: {
          _id: authUser._id,
          fullName: authUser.fullName || 'Você',
          profilePic: authUser.profilePic || '/avatar.png'
        }
      };
    } 
    // Se for de outro usuário, use as informações disponíveis
    else if (typeof message.senderId === 'object' && message.senderId.fullName) {
      formattedMessage = {
        ...formattedMessage,
        senderId: message.senderId
      };
    }
    
    // Se o grupo da mensagem é o grupo atualmente selecionado
    if (currentGroup && currentGroup._id === message.groupId) {
      // Adicionar mensagem à lista e marcar como lida
      set(state => ({
        groupMessages: [...state.groupMessages, formattedMessage]
      }));
      get().markGroupAsRead(message.groupId);
      
      // Garantir que o scroll se mova para a nova mensagem
      setTimeout(() => {
        const messageEnd = document.getElementById('message-end-ref');
        if (messageEnd) {
          messageEnd.scrollIntoView({ behavior: 'smooth' });
        }
      }, 50);
    } else {
      // Caso contrário, incrementar contador de não lidas
      set(state => ({
        unreadGroupCounts: {
          ...state.unreadGroupCounts,
          [message.groupId]: (state.unreadGroupCounts[message.groupId] || 0) + 1
        }
      }));
      
      // Tocar som de notificação
      try {
        const notificationSound = new Audio('/notification.mp3');
        notificationSound.volume = 0.5;
        notificationSound.play().catch(err => console.log('Erro ao tocar som:', err));
      } catch (err) {
        console.log('Erro ao criar áudio:', err);
      }
      
      // Exibir notificação toast
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
  socket.on("groupMemberLeft", ({ groupId, userId, groupName }) => {
    const authUser = useAuthStore.getState().authUser;
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
    toast.info(`Um usuário saiu do grupo ${groupName || ''}`);
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
    
    // Adicionar notificação de sistema
    toast.info(message || `${removedUserName || 'Um usuário'} foi removido do grupo`);
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