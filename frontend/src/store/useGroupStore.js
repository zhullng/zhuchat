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
  isSubscribed: false, // Controlar se já subscreveu eventos
  
  // Inicializar
  initializeGroups: async () => {
    set({ isGroupsLoading: true });
    try {
      const res = await axiosInstance.get("/groups");
      set({ groups: res.data || [] });
      
      // Calcular mensagens não lidas para cada grupo
      await get().calculateUnreadCounts();
      
      // Garantir que estamos subscritos a eventos
      if (!get().isSubscribed) {
        get().subscribeToGroupEvents();
      }
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
          
          // Contar mensagens não lidas (onde o Utilizador não está na lista de leitores)
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
      
      // Armazenar o ID do grupo criado em uma variável de estado temporária
      // para que possamos ignorar o evento de socket correspondente
      set(state => ({
        groups: [newGroup, ...state.groups],
        selectedGroup: newGroup,
        // Adicionar uma flag para ignorar o próximo evento addedToGroup para este grupo
        justCreatedGroupId: newGroup._id
      }));
      
      // Limpar qualquer chat selecionado quando um novo grupo é criado
      try {
        const chatStore = useChatStore.getState();
        if (chatStore && chatStore.setSelectedUser) {
          chatStore.setSelectedUser(null);
        }
      } catch (error) {
        console.warn("Não foi possível limpar o Utilizador selecionado:", error);
      }
      
      // Mostrar apenas o toast de criação, não de adição
      toast.success("Grupo criado com sucesso!");
      
      // Remover a flag após 3 segundos (tempo suficiente para o evento do socket chegar)
      setTimeout(() => {
        set({ justCreatedGroupId: null });
      }, 3000);
      
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
        console.warn("Não foi possível limpar o Utilizador selecionado:", error);
      }
      
      // ATUALIZADO: Garantir que estamos inscritos nos eventos antes de entrar no grupo
      const { isSubscribed } = get();
      if (!isSubscribed) {
        get().subscribeToGroupEvents();
      }
      
      // NOVO: Juntar-se à sala do grupo selecionado
      const socket = useAuthStore.getState().socket;
      if (socket && socket.connected) {
        // Primeiro saia de qualquer sala de grupo anterior
        const prevGroup = get().selectedGroup;
        if (prevGroup && prevGroup._id && prevGroup._id !== group._id) {
          socket.emit("leaveGroup", prevGroup._id);
        }
        
        // Então junte-se à nova sala
        console.log("Entrando na sala do grupo:", group._id);
        socket.emit("joinGroup", group._id);
        
        // Verificar se estamos realmente na sala (diagnóstico)
        setTimeout(() => {
          socket.emit("checkConnection");
        }, 500);
      } else {
        console.warn("Socket não está conectado ao selecionar grupo. Tentando reconectar...");
        useAuthStore.getState().reconnectSocket();
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
        
        // Se for o Utilizador atual
        if (senderId === authUser._id) {
          return {
            ...message,
            senderId: {
              _id: authUser._id,
              fullName: authUser.fullName || 'Eu',
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
      // Criar mensagem temporária
      const authUser = useAuthStore.getState().authUser;
      
      const tempMessage = {
        _id: `temp-${Date.now().toString()}`,
        text: messageData.text || "",
        image: messageData.image || null,
        file: messageData.file || null,
        senderId: {
          _id: authUser._id,
          fullName: authUser.fullName || "Eu",
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
              fullName: authUser.fullName || "Eu",
              profilePic: authUser.profilePic || "/avatar.png"
            }
          } : msg
        )
      }));
      
      return newMessage;
    } catch (error) {
      console.error("Erro ao enviar mensagem ao grupo:", error);
      
      // Remover mensagem temporária em caso de erro
      set(state => ({
        groupMessages: state.groupMessages.filter(msg => 
          !msg._id.toString().startsWith("temp-")
        )
      }));
      
      toast.error(error.response?.data?.error || "Erro ao enviar mensagem");
      throw error;
    }
  },

  
  subscribeToGroupEvents: () => {
    // Primeiro, verifique se já está subscrito para evitar duplicação
    if (get().isSubscribed) {
      console.log("Já está subscrito aos eventos de grupo, pulando...");
      return;
    }
    
    const socket = useAuthStore.getState().socket;
    if (!socket) {
      console.warn("Socket não disponível para subscrever eventos de grupo");
      // Tentar reconectar o socket
      const reconnectSuccess = useAuthStore.getState().reconnectSocket();
      if (!reconnectSuccess) {
        // Tentar novamente em 3 segundos
        setTimeout(() => get().subscribeToGroupEvents(), 3000);
        return;
      }
      return;
    }
    
    console.log("Subscrevendo aos eventos de grupo...");
    
    // Remover listeners existentes primeiro para evitar duplicação
    get().unsubscribeFromGroupEvents();
    
    // Novo grupo criado
    socket.on("newGroup", (group) => {
      console.log("Novo grupo recebido:", group.name);
      
      // Verificar se este é o grupo que acabamos de criar
      const justCreatedGroupId = get().justCreatedGroupId;
      if (justCreatedGroupId === group._id) {
        console.log("Ignorando evento newGroup para o grupo recém-criado:", group.name);
        return; // Ignorar o evento
      }
      
      set(state => ({
        groups: [group, ...state.groups]
      }));
      toast.success(`Eu foi adicionado ao grupo ${group.name}`);
    });
    
    // Mensagem de grupo eliminada
    socket.on("groupMessageDeleted", ({ messageId, groupId }) => {
      console.log("Mensagem de grupo eliminada:", messageId);
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
      console.log("Nova mensagem de grupo recebida:", message.text);
      const authUser = useAuthStore.getState().authUser;
      const currentGroup = get().selectedGroup;
      
      // Ignorar mensagens do próprio Utilizador
      if (message.senderId._id === authUser._id) {
        return;
      }
      
      // Formatar a mensagem
      const formattedMessage = {
        ...message,
        senderId: typeof message.senderId === 'object' 
          ? message.senderId 
          : {
              _id: message.senderId,
              fullName: message.senderName || 'Membro do grupo',
              profilePic: message.senderProfilePic || '/avatar.png'
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
      
      // Tocar som de notificação para grupos não selecionados
      if (!currentGroup || currentGroup._id !== message.groupId) {
        try {
          const notificationSound = new Audio('/notification.mp3');
          notificationSound.volume = 0.5;
          notificationSound.play().catch(err => console.log('Erro ao tocar som:', err));
        } catch (err) {
          console.log('Erro ao criar áudio:', err);
        }
      }
      
      // Atualizar lista de grupos
      setTimeout(() => {
        get().initializeGroups();
      }, 500);
     });
    
    // CORRIGIDO: Evento directGroupMessage simplificado para evitar duplicações
    socket.on("directGroupMessage", (message) => {
      console.log("Mensagem direta de grupo recebida:", message);
      
      // Ignorar mensagens próprias (já estão no estado)
      if (message.senderId === useAuthStore.getState().authUser._id) {
        return;
      }
      
      const currentGroup = get().selectedGroup;
      
      // Verificar se estamos no grupo correto
      if (currentGroup && currentGroup._id === message.groupId) {
        // IMPORTANTE: Não adicionar a mensagem diretamente aqui
        // O evento newGroupMessage já vai tratar isso para evitar duplicações
        console.log("Mensagem será processada pelo evento newGroupMessage para evitar duplicação");
      } else {
        // Apenas incrementar contagem não lida
        set(state => ({
          unreadGroupCounts: {
            ...state.unreadGroupCounts,
            [message.groupId]: (state.unreadGroupCounts[message.groupId] || 0) + 1
          }
        }));
      }
    });
    
    
    // Adicionado a um grupo
    socket.on("addedToGroup", (group) => {
      console.log("Adicionado ao grupo:", group.name);
      
      // Verificar se este é o grupo que acabamos de criar
      const justCreatedGroupId = get().justCreatedGroupId;
      if (justCreatedGroupId === group._id) {
        console.log("Ignorando evento addedToGroup para o grupo recém-criado:", group.name);
        return; // Ignorar o evento
      }
      
      set(state => ({
        groups: [group, ...state.groups]
      }));
      toast.success(`Eu foi adicionado ao grupo ${group.name}`);
      
      // Entrar automaticamente na sala de grupo
      socket.emit("joinGroup", group._id);
    });

    // Removido de um grupo
    socket.on("removedFromGroup", ({ groupId }) => {
      set(state => ({
        groups: state.groups.filter(g => g._id !== groupId),
        selectedGroup: state.selectedGroup?._id === groupId ? null : state.selectedGroup
      }));
      toast.info("Eu foi removido de um grupo");
      
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
    
    // Marcar como inscrito
    set({ isSubscribed: true });
    console.log("Subscrito com sucesso aos eventos de grupo");
    
    // NOVO: Verificar se há salas de grupo para entrar
    const currentGroup = get().selectedGroup;
    if (currentGroup) {
      console.log("Entrando na sala do grupo atual:", currentGroup._id);
      socket.emit("joinGroup", currentGroup._id);
    }
  },

  // Resto do código permanece igual, com as funções que estão abaixo

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
      return res.data;
    } catch (error) {
      console.error("Erro ao adicionar membros:", error);
      toast.error(error.response?.data?.error || "Erro ao adicionar membros");
      throw error;
    }
  },

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

  leaveGroup: async (groupId) => {
    try {
      await axiosInstance.delete(`/groups/${groupId}/leave`);
      
      // Remover o grupo da lista
      set(state => ({
        groups: state.groups.filter(g => g._id !== groupId),
        selectedGroup: state.selectedGroup?._id === groupId ? null : state.selectedGroup
      }));
      
      toast.success("Eu saiu do grupo com sucesso");
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
        console.log("Tentando Eliminar grupo (rota para grupos vazios)");
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
          
          // Remover o confirm e sempre manter a remoção do grupo localmente
          // Nenhuma decisão do Utilizador é necessária aqui
          toast.success("Grupo removido localmente");
        }
      }
    } catch (unexpectedError) {
      toast.error("Erro inesperado ao processar sua solicitação");
      console.error("Erro inesperado ao Eliminar grupo:", unexpectedError);
    }
  },

  updateGroupInfo: async (groupId, updateData) => {
    try {
      const loadingToast = toast.loading("Atualizando grupo...");
      
      // Log para depuração
      console.log("Dados enviados para atualização:", JSON.stringify(updateData));
      
      // Garantir que profilePic é enviado explicitamente como chave no objeto,
      // mesmo quando for uma string vazia
      if (Object.prototype.hasOwnProperty.call(updateData, 'profilePic')) {
        console.log(`Enviando profilePic: "${updateData.profilePic}"`);
      }
      
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
      
      // Log detalhado para ajudar na depuração
      if (error.response) {
        console.error("Resposta de erro:", {
          status: error.response.status,
          data: error.response.data
        });
      }
      
      toast.error(error.response?.data?.error || "Erro ao atualizar grupo");
      throw error;
    }
  },

  // Função para eliminar mensagem de grupo
  deleteGroupMessage: async (messageId) => {
    try {
      // Obter o grupo selecionado
      const selectedGroup = get().selectedGroup;
      if (!selectedGroup) {
        throw new Error("Nenhum grupo selecionado");
      }
      
      // Fazer chamada para Eliminar a mensagem
      const response = await axiosInstance.delete(`/groups/${selectedGroup._id}/messages/${messageId}`);
      
      // Atualizar estado removendo a mensagem local
      set(state => ({
        groupMessages: state.groupMessages.filter(msg => msg._id !== messageId)
      }));
      
      // Notificação de sucesso
      toast.success("Mensagem eliminada com sucesso");
      
      // Notificar outros membros via WebSocket (o backend já faz isso, mas mantemos por redundância)
      const socket = useAuthStore.getState().socket;
      if (socket && socket.connected) {
        socket.emit("groupMessageDeleted", {
          messageId,
          groupId: selectedGroup._id
        });
      }
      
      return response.data;
    } catch (error) {
      // Log detalhado do erro
      console.error("Erro ao eliminar mensagem de grupo:", error);
      
      // Notificação de erro para o Utilizador
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
    socket.off("directGroupMessage");
    socket.off("addedToGroup");
    socket.off("removedFromGroup");
    socket.off("groupDeleted");
    socket.off("groupMessageDeleted");
    socket.off("groupUpdated");
    
    set({ isSubscribed: false });
  },

  // Resetar estado (para logout)
  resetGroupState: () => {
    // Cancelar subscrições primeiro
    get().unsubscribeFromGroupEvents();
    
    set({
      groups: [],
      selectedGroup: null,
      groupMessages: [],
      isGroupsLoading: false,
      isGroupMessagesLoading: false,
      unreadGroupCounts: {},
      isSubscribed: false
    });
  }
}));