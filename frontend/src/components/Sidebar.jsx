import { useEffect, useState, useCallback, useRef } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
// Remover UserGroup completamente
import { Users, Bot, UserPlus, X, Check, XCircle, Plus } from "lucide-react";
import { debounce } from "lodash";
import UserItem from "./UserItem";
import CreateGroup from "./CreateGroup";

// Componente para adicionar contactos
const AddContact = ({ onContactAdded }) => {
  const { addContact } = useChatStore();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      await addContact(email);
      setEmail("");
      if (onContactAdded) {
        onContactAdded();
      }
    } catch (error) {
      // Erro já tratado no store
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mb-3">
      <h3 className="text-sm font-medium mb-2">Adicionar Contacto</h3>
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email do contacto"
          className="input input-bordered input-sm flex-grow"
          disabled={isLoading}
        />
        
        <button 
          type="submit" 
          className="btn btn-primary btn-sm"
          disabled={isLoading}
        >
          {isLoading ? "A adicionar..." : "Adicionar"}
        </button>
      </form>
    </div>
  );
};

// Componente para pedidos pendentes
const PendingRequests = ({ onRequestResponded }) => {
  const { getPendingRequests, respondToRequest } = useChatStore();
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPendingRequests = async () => {
    setIsLoading(true);
    try {
      const requests = await getPendingRequests();
      setPendingRequests(Array.isArray(requests) ? requests : []);
    } catch (error) {
      console.error("Erro ao obter pedidos pendentes:", error);
      setPendingRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingRequests();
    
    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchPendingRequests, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleResponse = async (contactId, status) => {
    try {
      await respondToRequest(contactId, status);
      fetchPendingRequests();
      
      if (onRequestResponded) {
        onRequestResponded();
      }
    } catch (error) {
      // Erro já tratado no store
    }
  };

  if (!pendingRequests || pendingRequests.length === 0) {
    return null;
  }

  return (
    <div className="mb-3">
      <h3 className="text-sm font-medium mb-2">Pedidos de Contacto ({pendingRequests.length})</h3>
      
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {pendingRequests.map(request => (
          <div key={request._id} className="flex items-center justify-between bg-base-200 p-2 rounded-lg">
            <div className="flex items-center gap-2">
              <img 
                src={request.userId?.profilePic || "/avatar.png"} 
                alt={request.userId?.fullName || "Utilizador"}
                className="w-8 h-8 rounded-full object-cover"
              />
              <div>
                <div className="font-medium text-sm">{request.userId?.fullName || "Utilizador"}</div>
                <div className="text-xs text-base-content/70">{request.userId?.email || ""}</div>
              </div>
            </div>
            
            <div className="flex gap-1">
              <button 
                onClick={() => handleResponse(request._id, "accepted")}
                className="btn btn-xs btn-success"
                title="Aceitar"
              >
                <Check size={14} />
              </button>
              
              <button 
                onClick={() => handleResponse(request._id, "rejected")}
                className="btn btn-xs btn-error"
                title="Rejeitar"
              >
                <XCircle size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Componente principal da barra lateral
const Sidebar = () => {
  const { 
    getUsers, 
    users, 
    selectedUser, 
    setSelectedUser,
    conversations,
    unreadCounts, 
    markConversationAsRead, 
    subscribeToMessages,
    unsubscribeFromMessages,
    removeContact,
    getConversations,
    blockUser,
    updateContactNote,
    viewedConversations,
    groups,        // Nova propriedade para grupos
    getGroups      // Nova função para buscar grupos
  } = useChatStore();
  const { onlineUsers, authUser } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [showContactMenu, setShowContactMenu] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showGroups, setShowGroups] = useState(true);
  
  // Referência para o intervalos de atualização
  const updateIntervalRef = useRef(null);

  // Objeto do Assistente Virtual
  const aiAssistant = {
    _id: 'ai-assistant',
    fullName: 'Assistente Virtual',
    isAI: true,
  };

  // Subscrever e carregar dados ao montar o componente
  useEffect(() => {
    console.log("A carregar utilizadores e a subscrever mensagens");
    getUsers();
    getGroups(); // Buscar grupos
    subscribeToMessages();
    
    // Configurar atualização periódica
    updateIntervalRef.current = setInterval(() => {
      getConversations();
      getGroups(); // Atualizar grupos periodicamente
    }, 10000);
    
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      unsubscribeFromMessages();
      
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
    };
  }, [getUsers, getGroups, subscribeToMessages, unsubscribeFromMessages, getConversations]);

  // Forçar atualização em mudanças em conversations ou unreadCounts
  const [forceUpdate, setForceUpdate] = useState(0);
  
  useEffect(() => {
    setForceUpdate(prev => prev + 1);
  }, [conversations, unreadCounts, groups]); // Adicionar grupos às dependências

  const handleSearchChange = debounce((query) => {
    setSearchQuery(query);
  }, 300);

  // Função para atualizar contactos e grupos
  const refreshContacts = () => {
    getUsers();
    getGroups();
  };

  // Função para lidar com a criação de grupo
  const handleGroupCreated = () => {
    getGroups();
    setShowCreateGroup(false);
  };

  // Função para lidar com a remoção de contacto
  const handleRemoveContact = async (userId) => {
    try {
      await removeContact(userId);
    } catch (error) {
      // Erro já é tratado no store
    }
  };
  
  // Função para lidar com o bloqueio de utilizadores
  const handleBlockUser = async (userId) => {
    try {
      const success = await blockUser(userId);
      if (success && selectedUser?._id === userId) {
        setSelectedUser(null);
      }
    } catch (error) {
      // Erro já é tratado na função blockUser
    }
  };

  // Função para lidar com a edição de apelido
  const handleEditNick = async (contactId, newNick) => {
    try {
      await updateContactNote(contactId, newNick);
    } catch (error) {
      // Erro já é tratado no store
    }
  };

  // Função para lidar com clique no utilizador
  const handleUserClick = (user) => {
    if (!user) return;
    
    // Fechar menu de opções se estiver aberto
    setShowContactMenu(false);
    
    // Definir o usuário selecionado
    setSelectedUser(user);
    
    // Forçar marcação como lida imediatamente se houver mensagens não lidas
    if (user._id !== 'ai-assistant' && unreadCounts[user._id] > 0) {
      markConversationAsRead(user._id);
    }
  };

  // Função para lidar com clique no grupo
  const handleGroupClick = (group) => {
    if (!group) return;
    
    // Fechar menu de opções se estiver aberto
    setShowContactMenu(false);
    
    // Definir o grupo selecionado com flag isGroup para diferenciar
    setSelectedUser({...group, isGroup: true});
    
    // Marcar como lida se houver mensagens não lidas
    if (unreadCounts[group._id] > 0) {
      markConversationAsRead(group._id);
    }
  };

  // Função melhorada para ordenar utilizadores 
  const getSortedAndFilteredUsers = useCallback(() => {
    if (!users || !Array.isArray(users) || users.length === 0) return [];
    
    // Filtrar por pesquisa e estado online
    const filteredUsers = users.filter((user) => {
      if (!user || !user._id) return false; // Ignorar utilizadores inválidos
      
      const matchesSearch = (user.fullName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (user.email || "").toLowerCase().includes(searchQuery.toLowerCase());
      const isOnline = showOnlineOnly ? (onlineUsers || []).includes(user._id) : true;
      return matchesSearch && isOnline;
    });

    // Ordenar por não lidas primeiro, depois por mensagens mais recentes
    return filteredUsers.sort((a, b) => {
      if (!a || !b) return 0;
      
      // Verificar se há mensagens não lidas (prioridade mais alta)
      const unreadA = unreadCounts && unreadCounts[a._id] > 0;
      const unreadB = unreadCounts && unreadCounts[b._id] > 0;
      
      // Mensagens não lidas têm prioridade
      if (unreadA && !unreadB) return -1;
      if (!unreadA && unreadB) return 1;
      
      // Encontrar conversas para os utilizadores
      const convA = conversations?.find(c => c?.participants?.includes(a._id));
      const convB = conversations?.find(c => c?.participants?.includes(b._id));
      
      // Se ambos têm ou não têm mensagens não lidas, ordena por mais recente
      if (convA?.latestMessage && convB?.latestMessage) {
        return new Date(convB.latestMessage.createdAt) - new Date(convA.latestMessage.createdAt);
      }
      
      // Se apenas um tiver mensagem, ele vem primeiro
      if (convA?.latestMessage) return -1;
      if (convB?.latestMessage) return 1;
      
      // Se nenhum tiver mensagens, mantém a ordem alfabética
      return (a.fullName || "").localeCompare(b.fullName || "");
    });
  }, [users, conversations, unreadCounts, searchQuery, showOnlineOnly, onlineUsers]);

  // Função para filtrar e ordenar grupos
  const getSortedAndFilteredGroups = useCallback(() => {
    if (!groups || !Array.isArray(groups) || groups.length === 0) return [];
    
    // Filtrar grupos por pesquisa
    const filteredGroups = groups.filter((group) => {
      if (!group || !group._id) return false;
      
      const matchesSearch = (group.name || "").toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });

    // Ordenar grupos (não lidos primeiro, depois por mensagens mais recentes)
    return filteredGroups.sort((a, b) => {
      if (!a || !b) return 0;
      
      // Verificar se há mensagens não lidas (prioridade mais alta)
      const unreadA = unreadCounts && unreadCounts[a._id] > 0;
      const unreadB = unreadCounts && unreadCounts[b._id] > 0;
      
      if (unreadA && !unreadB) return -1;
      if (!unreadA && unreadB) return 1;
      
      // Encontrar conversas para os grupos
      const convA = conversations?.find(c => c.groupId === a._id);
      const convB = conversations?.find(c => c.groupId === b._id);
      
      // Se ambos têm conversas com mensagens, ordena por mais recente
      if (convA?.latestMessage && convB?.latestMessage) {
        return new Date(convB.latestMessage.createdAt) - new Date(convA.latestMessage.createdAt);
      }
      
      // Se apenas um tiver mensagem, ele vem primeiro
      if (convA?.latestMessage) return -1;
      if (convB?.latestMessage) return 1;
      
      // Ordem alfabética como último critério
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [groups, conversations, unreadCounts, searchQuery]);

  // Recalcular listas quando dependências mudarem
  const sortedUsers = getSortedAndFilteredUsers();
  const sortedGroups = getSortedAndFilteredGroups();

  return (
    <aside className={`h-screen supports-[height:100cqh]:h-[100cqh] supports-[height:100svh]:h-[100svh] w-full lg:w-[30%] border-r border-base-300 flex flex-col transition-all duration-200
      ${isMobile && selectedUser ? 'hidden' : 'block'}`}>
      
      <div className="border-b border-base-300 w-full p-3 lg:p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="size-6" />
            <span className="font-medium">Contactos e Grupos</span>
          </div>
          
          <div className="flex gap-1">
            {/* Botão para criar grupo - versão simplificada */}
            <button 
              onClick={() => setShowCreateGroup(true)}
              className="btn btn-sm btn-ghost btn-circle"
              title="Criar novo grupo"
            >
              <div className="relative">
                <Users size={18} />
                <span className="absolute -top-1 -right-1 bg-primary text-primary-content rounded-full w-4 h-4 flex items-center justify-center text-xs font-medium">
                  +
                </span>
              </div>
            </button>
            
            {/* Botão para gerir contactos */}
            <button 
              onClick={() => setShowContactMenu(!showContactMenu)}
              className="btn btn-sm btn-ghost btn-circle"
              title={showContactMenu ? "Fechar menu" : "Gerir contactos"}
            >
              {showContactMenu ? <X size={18} /> : <UserPlus size={18} />}
            </button>
          </div>
        </div>

        {/* Menu de Gestão de Contactos */}
        {showContactMenu && (
          <div className="mt-3 border-t border-base-300 pt-3">
            <AddContact onContactAdded={refreshContacts} />
            <PendingRequests onRequestResponded={refreshContacts} />
          </div>
        )}

        {/* Menu de Criação de Grupo */}
        {showCreateGroup && (
          <div className="mt-3 border-t border-base-300 pt-3">
            <CreateGroup 
              onClose={() => setShowCreateGroup(false)} 
              onGroupCreated={handleGroupCreated}
            />
          </div>
        )}

        <div className="mt-2 lg:mt-3 space-y-2">
          <input
            type="text"
            placeholder="Pesquisar contactos e grupos..."
            onChange={(e) => handleSearchChange(e.target.value)}
            className="input input-bordered input-sm w-full"
          />

          <div className="flex items-center justify-between">
            <label className="cursor-pointer flex items-center gap-3">
              <input
                type="checkbox"
                checked={showOnlineOnly}
                onChange={(e) => setShowOnlineOnly(e.target.checked)}
                className="toggle toggle-sm lg:toggle-md"
              />
              <span className="text-sm lg:text-base">Apenas online</span>
            </label>
            <span className="text-xs lg:text-md text-base-content/60">
              {(onlineUsers || []).length - 1} online
            </span>
          </div>
          
          {/* Botão para alternar exibição de grupos - simplificado */}
          <button
            onClick={() => setShowGroups(!showGroups)}
            className="btn btn-sm btn-ghost btn-block justify-between"
          >
            <div className="flex items-center gap-2">
              <Users size={16} />
              <span>Grupos</span>
            </div>
            <span>{showGroups ? '▼' : '►'}</span>
          </button>
        </div>
      </div>

      <div className="overflow-y-auto flex-1 p-1 lg:p-2">
        {/* Assistente Virtual */}
        <button
          onClick={() => handleUserClick(aiAssistant)}
          className={`
            w-full flex items-center gap-3 p-2 lg:p-3 rounded-lg
            transition-colors hover:bg-base-200 mb-2
            ${selectedUser?.isAI ? "bg-base-300 ring-1 ring-base-300" : "hover:bg-base-200"}
          `}
        >
          <div className="relative">
            <div className="w-10 h-10 lg:w-12 lg:h-12 flex items-center justify-center rounded-full border border-base-300">
              <Bot className="size-6" />
            </div>
            <span className="absolute bottom-0 right-0 size-2.5 lg:size-3 bg-green-500 rounded-full border-2 border-base-100" />
          </div>

          <div className="flex-1 text-left">
            <div className="font-medium truncate text-sm lg:text-base">
              Assistente Virtual
            </div>
            <div className="text-xs text-green-500">
              Sempre Online
            </div>
          </div>
        </button>

        {/* Grupos (Expandido/Contraído) */}
        {showGroups && sortedGroups.length > 0 && (
          <>
            <div className="mt-2 mb-1">
              <div className="text-xs font-medium uppercase text-base-content/60 px-2">
                Grupos ({sortedGroups.length})
              </div>
            </div>
            
            {sortedGroups.map((group) => {
              const hasUnread = unreadCounts && unreadCounts[group._id] > 0;
              const conv = conversations?.find(c => c.groupId === group._id);
              
              return (
                <button
                  key={group._id}
                  onClick={() => handleGroupClick(group)}
                  className={`
                    w-full flex items-center gap-3 p-2 lg:p-3 rounded-lg mb-1
                    transition-colors hover:bg-base-200
                    ${selectedUser?._id === group._id ? "bg-base-300 ring-1 ring-base-300" : ""}
                  `}
                >
                  <div className="relative">
                    {/* Simplificar o ícone do grupo para evitar problemas */}
                    <div className="w-10 h-10 lg:w-12 lg:h-12 flex items-center justify-center bg-primary/10 rounded-full overflow-hidden border border-base-300">
                      <span className="font-bold text-primary">G</span>
                    </div>
                    {hasUnread && (
                      <div className="absolute -top-1 -right-1 bg-error text-error-content rounded-full min-w-5 h-5 flex items-center justify-center text-xs font-medium px-1">
                        {unreadCounts[group._id]}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 text-left overflow-hidden">
                    <div className="font-medium truncate text-sm lg:text-base">
                      {group.name}
                    </div>
                    <div className="text-xs text-base-content/70 truncate">
                      {group.members?.length || 0} membros
                    </div>
                  </div>
                  
                  {conv?.latestMessage && (
                    <div className="text-xs text-base-content/60">
                      {new Date(conv.latestMessage.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  )}
                </button>
              );
            })}
            
            {/* Separador entre grupos e contactos */}
            <div className="h-px bg-base-200 my-2"></div>
          </>
        )}

        {/* Contactos */}
        <div className="mt-2 mb-1">
          <div className="text-xs font-medium uppercase text-base-content/60 px-2">
            Contactos ({sortedUsers.length})
          </div>
        </div>

        {/* Lista de Utilizadores */}
        {sortedUsers.map((user) => {
          const hasUnread = unreadCounts && unreadCounts[user._id] > 0;
          const conv = conversations?.find(c => c?.participants?.includes(user._id));
          const isOnline = (onlineUsers || []).includes(user._id);
          
          return (
            <UserItem 
              key={user._id}
              user={user}
              onUserClick={handleUserClick}
              isSelected={selectedUser?._id === user._id && !selectedUser?.isGroup}
              hasUnread={hasUnread}
              unreadCount={unreadCounts[user._id] || 0}
              conv={conv}
              isOnline={isOnline}
              authUser={authUser}
              onRemove={handleRemoveContact}
              onBlock={handleBlockUser}
              onEditNick={handleEditNick}
              viewedConversations={viewedConversations}
            />
          );
        })}

        {(!sortedUsers || sortedUsers.length === 0) && !sortedGroups.length && (
          <div className="text-center text-base-content/60 p-4">
            {showOnlineOnly 
              ? "Nenhum contacto online" 
              : showContactMenu 
                ? "Adicione contactos para começar a conversar" 
                : "Nenhum contacto ou grupo encontrado"
            }
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;