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
        try {
          const res = await axiosInstance.get(`/groups/${group._id}/messages`);
          const messages = res.data || [];
          const authUser = useAuthStore.getState().authUser;
          
          // Contar mensagens não lidas (onde o usuário não está na lista de leitores)
          const unreadCount = messages.filter(msg => 
            !msg.read.some(r => r.userId === authUser._id)
          ).length;
          
          unreadCounts[group._id] = unreadCount;
        } catch (groupError) {
          console.warn(`Erro ao acessar mensagens do grupo ${group.name || group._id}:`, groupError.message);
          
          // Se receber um 403 (Forbidden) ou 404 (Not Found), assume que o grupo não está mais disponível
          if (groupError.response && (groupError.response.status === 403 || groupError.response.status === 404)) {
            console.log(`Grupo possivelmente indisponível: ${group.name || group._id}`);
            unreadCounts[group._id] = 0;
          } else {
            // Para outros erros, mantém o contador anterior se existir
            unreadCounts[group._id] = get().unreadGroupCounts[group._id] || 0;
          }
        }
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
  
  // Selecionar um grupo - ATUALIZADO
  selectGroup: (group) => {
    // Código existente
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
      
      // NOVO: Juntar-se à sala do grupo selecionado
      const socket = useAuthStore.getState().socket;
      if (socket) {
        // Primeiro saia de qualquer sala de grupo anterior
        const prevGroup = get().selectedGroup;
        if (prevGroup && prevGroup._id !== group._id) {
          socket.emit("leaveGroup", prevGroup._id);
        }
        
        // Então junte-se à nova sala
        socket.emit("joinGroup", group._id);
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
  
  sendGroupMessage: async (groupId, messageData) => {
    try {
      const authUser = useAuthStore.getState().authUser;
      const socket = useAuthStore.getState().socket;
      
      // Criar mensagem temporária
      const tempMessage = {
        _id: `backup-${Date.now().toString()}`,
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
      
      // Adicionar mensagem temporária
      set(state => ({
        groupMessages: [...state.groupMessages, tempMessage]
      }));
      
      // Enviar via API
      const res = await axiosInstance.post(`/groups/${groupId}/message`, messageData);
      const newMessage = res.data;
      
      // Substituir mensagem temporária
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
      
      // Remover mensagem temporária em caso de erro
      set(state => ({
        groupMessages: state.groupMessages.filter(msg => 
          !msg._id.toString().startsWith("backup-")
        )
      }));
      
      throw error;
    }
  },

  subscribeToGroupEvents: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    
    // Remover listeners existentes primeiro
    socket.off("newGroup");
    socket.off("newGroupMessage");
    socket.off("addedToGroup");
    socket.off("removedFromGroup");
    socket.off("groupDeleted");
    socket.off("groupMessageDeleted");
    socket.off("groupUpdated");
    
    // Novo grupo criado
    socket.on("newGroup", (group) => {
      set(state => ({
        groups: [group, ...state.groups]
      }));
      toast.success(`Você foi adicionado ao grupo ${group.name}`);
    });
    
    // Mensagem de grupo eliminada
    socket.on("groupMessageDeleted", ({ messageId, groupId }) => {
      const currentGroup = get().selectedGroup;
      
      if (currentGroup && currentGroup._id === groupId) {
        set(state => ({
          groupMessages: state.groupMessages.filter(msg => msg._id !== messageId)
        }));
      }
      
      // Atualizar contadores e conversas
      get().initializeGroups();
    });
    
    socket.on("newGroupMessage", ({ message, group }) => {
      const authUser = useAuthStore.getState().authUser;
      const currentGroup = get().selectedGroup;
    
      // Formatar a mensagem
      const formattedMessage = {
        ...message,
        senderId: {
          _id: message.senderId._id || message.senderId,
          fullName: message.senderId.fullName || 'Membro do grupo',
          profilePic: message.senderId.profilePic || '/avatar.png'
        }
      };
    
      // Adicionar a mensagem independente do grupo selecionado
      set(state => {
        // Se o grupo da mensagem é o grupo atualmente selecionado
        if (currentGroup && currentGroup._id === message.groupId) {
          return {
            groupMessages: [...state.groupMessages, formattedMessage],
            unreadGroupCounts: {
              ...state.unreadGroupCounts,
              [message.groupId]: 0
            }
          };
        }
        
        // Para grupos não selecionados, incrementar contador de não lidas
        return {
          unreadGroupCounts: {
            ...state.unreadGroupCounts,
            [message.groupId]: (state.unreadGroupCounts[message.groupId] || 0) + 1
          }
        };
      });
      
      // Atualizar lista de grupos
      setTimeout(() => {
        get().initializeGroups();
      }, 500);
    });
    
    // Adicionado a um grupo
    socket.on("addedToGroup", (group) => {
      set(state => ({
        groups: [group, ...state.groups]
      }));
      toast.success(`Você foi adicionado ao grupo ${group.name}`);
      
      // Entrar automaticamente na sala de grupo
      socket.emit("joinGroup", group._id);
    });

    // Removido de um grupo
    socket.on("removedFromGroup", ({ groupId }) => {
      set(state => ({
        groups: state.groups.filter(g => g._id !== groupId),
        selectedGroup: state.selectedGroup?._id === groupId ? null : state.selectedGroup
      }));
      toast.info("Você foi removido de um grupo");
      
      // Sair da sala de grupo
      socket.emit("leaveGroup", groupId);
    });

    // Grupo excluído
    socket.on("groupDeleted", ({ groupId }) => {
      set(state => ({
        groups: state.groups.filter(g => g._id !== groupId),
        selectedGroup: state.selectedGroup?._id === groupId ? null : state.selectedGroup
      }));
      toast.info("Um grupo foi excluído");
      
      // Sair da sala de grupo
      socket.emit("leaveGroup", groupId);
    });

    // Grupo atualizado
    socket.on("groupUpdated", (updatedGroup) => {
      set(state => ({
        groups: state.groups.map(g => 
          g._id === updatedGroup._id ? updatedGroup : g
        ),
        selectedGroup: state.selectedGroup?._id === updatedGroup._id ? updatedGroup : state.selectedGroup
      }));
      
      toast.info(`O grupo "${updatedGroup.name}" foi atualizado`);
    });
  },

  // Restante das funções permanece igual...
  // [Todo o código anterior permanece o mesmo, e continua a partir daqui]

  addGroupMembers: async (groupId, members) => {
    try {
      const res = await axiosInstance.post(`/groups/${groupId}/members`, { members });
      
      // Atualizar a lista de grupos
      set(state => ({
        groups: state.groups.map(g => 
          g._id === groupId ? res.data : g
        ),
        // Se o grupo selecionado é este, atualizá-lo também
        selectedGroup: state.selectedGroup?._id === groupId ? res.data : state.selectedGroup
      }));
      
      toast.success("Membros adicionados com sucesso!");
      return res.data;
    } catch (error) {
      console.error("Erro ao adicionar membros:", error);
      toast.error(error.response?.data?.error || "Erro ao adicionar membros");
      throw error;
    }
  },

  // Remover membro do grupo
  removeGroupMember: async (groupId, memberId) => {
    try {
      console.log("Tentando remover membro:", { groupId, memberId });
      
      // Mostrar toast de carregamento
      const loadingToast = toast.loading("Removendo membro...");
      
      // Garantir que temos o formato correto dos IDs
      const url = `/groups/${groupId}/members/${memberId}`;
      console.log("URL da requisição:", url);
      
      await axiosInstance.delete(url);
      
      // Dismissar toast de carregamento
      toast.dismiss(loadingToast);
      
      // Atualizar o grupo localmente primeiro para uma UI responsiva
      set(state => {
        // Buscar o grupo nos groups
        const group = state.groups.find(g => g._id === groupId);
        
        if (group) {
          // Criar uma cópia atualizada do grupo sem o membro
          const updatedGroup = {
            ...group,
            members: group.members.filter(m => 
              m._id !== memberId || 
              (typeof m === 'string' && m !== memberId)
            )
          };
          
          // Atualizar os groups e selectedGroup se necessário
          return {
            groups: state.groups.map(g => g._id === groupId ? updatedGroup : g),
            selectedGroup: state.selectedGroup?._id === groupId ? updatedGroup : state.selectedGroup
          };
        }
        
        return state; // Se o grupo não foi encontrado, retorna o estado sem mudanças
      });
      
      // Em segundo plano, buscar o grupo atualizado do servidor
      try {
        const updatedGroup = await axiosInstance.get(`/groups/${groupId}`);
        
        // Atualizar com os dados do servidor
        set(state => ({
          groups: state.groups.map(g => 
            g._id === groupId ? updatedGroup.data : g
          ),
          selectedGroup: state.selectedGroup?._id === groupId ? updatedGroup.data : state.selectedGroup
        }));
      } catch (fetchError) {
        console.warn("Não foi possível buscar grupo atualizado:", fetchError);
        // Já temos uma versão local atualizada, então não vamos mostrar erro
      }
      
      toast.success("Membro removido com sucesso!");
    } catch (error) {
      console.error("Erro ao remover membro:", error);
      
      // Extrair a mensagem de erro mais específica
      const errorMsg = error.response?.data?.error || 
                      error.message || 
                      "Erro ao remover membro";
      
      toast.error(errorMsg);
      throw error;
    }
  },

  // Sair de um grupo
  leaveGroup: async (groupId) => {
    try {
      await axiosInstance.delete(`/groups/${groupId}/leave`);
      
      // Remover o grupo da lista
      set(state => ({
        groups: state.groups.filter(g => g._id !== groupId),
        selectedGroup: state.selectedGroup?._id === groupId ? null : state.selectedGroup
      }));
      
      toast.success("Você saiu do grupo com sucesso");
    } catch (error) {
      console.error("Erro ao sair do grupo:", error);
      toast.error(error.response?.data?.error || "Erro ao sair do grupo");
      throw error;
    }
  },

  getGroupById: async (groupId) => {
    try {
      const res = await axiosInstance.get(`/groups/${groupId}`);
      
      // Atualizar o grupo selecionado
      set(state => ({
        selectedGroup: res.data
      }));
      
      return res.data;
    } catch (error) {
      console.error("Erro ao buscar detalhes do grupo:", error);
      toast.error("Não foi possível carregar as informações do grupo");
      throw error;
    }
  },

  // Versão final da função deleteGroup
  deleteGroup: async (groupId) => {
    try {
      const loadingToast = toast.loading("Excluindo grupo...");
      
      // Primeiro, vamos remover o grupo localmente para garantir uma UI responsiva
      const removedGroup = get().groups.find(g => g._id === groupId);
      
      // Armazenar o estado atual para eventual recuperação
      const previousGroups = get().groups;
      const previousSelected = get().selectedGroup;
      
      // Atualizar o estado imediatamente (mesmo antes de ouvir do servidor)
      set(state => ({
        groups: state.groups.filter(g => g._id !== groupId),
        selectedGroup: state.selectedGroup?._id === groupId ? null : state.selectedGroup
      }));
      
      // Tentativa principal: rota de grupo vazio
      try {
        console.log("Tentando excluir grupo (rota para grupos vazios)");
        await axiosInstance.delete(`/groups/${groupId}/empty-delete`);
        
        toast.dismiss(loadingToast);
        toast.success("Grupo excluído com sucesso");
        return;
      } catch (emptyError) {
        console.log("Falha na rota de grupos vazios:", emptyError.message);
        
        // Se a primeira tentativa falhar, tente a rota padrão
        try {
          console.log("Tentando rota normal de exclusão");
          await axiosInstance.delete(`/groups/${groupId}`);
          
          toast.dismiss(loadingToast);
          toast.success("Grupo excluído com sucesso");
          return;
        } catch (normalError) {
          console.error("Ambas as rotas falharam:", normalError);
          toast.dismiss(loadingToast);
          
          // Perguntar se deseja remover apenas localmente
          const removeLocally = window.confirm(
            "Não foi possível excluir o grupo no servidor. Deseja manter o grupo removido da sua lista local?"
          );
          
          if (removeLocally) {
            // O estado já foi atualizado no início
            toast.success("Grupo removido localmente");
          } else {
            // Restaurar o grupo na lista
            set({ 
              groups: previousGroups,
              selectedGroup: previousSelected
            });
            toast.error("Operação cancelada");
          }
        }
      }
    } catch (unexpectedError) {
      toast.error("Erro inesperado ao processar sua solicitação");
      console.error("Erro inesperado ao excluir grupo:", unexpectedError);
    }
  },

  updateGroupInfo: async (groupId, updateData) => {
    try {
      const loadingToast = toast.loading("Atualizando grupo...");
      
      // Fazer solicitação para atualizar o grupo
      const res = await axiosInstance.patch(`/groups/${groupId}/update`, updateData);
      
      // Atualizar o grupo no estado
      set(state => ({
        groups: state.groups.map(g => 
          g._id === groupId ? res.data : g
        ),
        selectedGroup: state.selectedGroup?._id === groupId ? res.data : state.selectedGroup
      }));
      
      toast.dismiss(loadingToast);
      toast.success("Grupo atualizado com sucesso!");
      
      return res.data;
    } catch (error) {
      console.error("Erro ao atualizar grupo:", error);
      toast.error(error.response?.data?.error || "Erro ao atualizar grupo");
      throw error;
    }
  },

  // Função para eliminar mensagem de grupo - CORRIGIDA
  deleteGroupMessage: async (messageId) => {
    try {
      // Obter o grupo selecionado
      const selectedGroup = get().selectedGroup;
      if (!selectedGroup) {
        throw new Error("Nenhum grupo selecionado");
      }
      
      // Fazer chamada para excluir a mensagem - ROTA CORRIGIDA
      const response = await axiosInstance.delete(`/groups/${selectedGroup._id}/messages/${messageId}`);
      
      // Atualizar estado removendo a mensagem local
      set(state => ({
        groupMessages: state.groupMessages.filter(msg => msg._id !== messageId)
      }));
      
      // Notificação de sucesso
      toast.success("Mensagem eliminada com sucesso");
      
      // Notificar outros membros via WebSocket (o backend já faz isso, mas mantemos por redundância)
      const socket = useAuthStore.getState().socket;
      if (socket) {
        socket.emit("groupMessageDeleted", {
          messageId,
          groupId: selectedGroup._id
        });
      }
      
      return response.data;
    } catch (error) {
      // Log detalhado do erro
      console.error("Erro ao eliminar mensagem de grupo:", error);
      
      // Notificação de erro para o usuário
      toast.error(error.response?.data?.error || "Erro ao eliminar mensagem");
      
      // Propagar o erro para tratamento adicional, se necessário
      throw error;
    }
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
    socket.off("groupMessageDeleted");
    socket.off("groupUpdated");
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