// components/Sidebar.jsx (atualizado)
import { useEffect, useState, useCallback, useRef } from "react";
import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";
import { useAuthStore } from "../store/useAuthStore";
import { Users, Bot, UserPlus, UserGroup, X, Radio } from "lucide-react";
import { debounce } from "lodash";
import UserItem from "./UserItem";
import GroupTab from "./GroupTab";
import CreateGroupModal from "./CreateGroupModal";

// Componente para o Sidebar
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
    viewedConversations
  } = useChatStore();
  
  const { 
    selectedGroup,
    selectGroup,
    initializeGroups,
    subscribeToGroupEvents,
    unsubscribeFromGroupEvents
  } = useGroupStore();
  
  const { onlineUsers, authUser } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [showContactMenu, setShowContactMenu] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [activeTab, setActiveTab] = useState("chats"); // "chats" ou "groups"
  
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
    getUsers();
    initializeGroups();
    subscribeToMessages();
    subscribeToGroupEvents();
    
    // Configurar atualização periódica
    updateIntervalRef.current = setInterval(() => {
      getConversations();
    }, 10000);
    
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      unsubscribeFromMessages();
      unsubscribeFromGroupEvents();
      
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
    };
  }, []);

  // Importante: forçar atualização em mudanças
  const [forceUpdate, setForceUpdate] = useState(0);
  
  useEffect(() => {
    setForceUpdate(prev => prev + 1);
  }, [conversations, unreadCounts]);

  const handleSearchChange = debounce((query) => {
    setSearchQuery(query);
  }, 300);

  // Função para atualizar contactos
  const refreshContacts = () => {
    getUsers();
  };

  // Função para lidar com a remoção de contacto
  const handleRemoveContact = async (userId) => {
    try {
      await removeContact(userId);
      // A função removeContact já chama getUsers() internamente
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
    
    // Limpar seleção de grupo
    if (selectedGroup) {
      selectGroup(null);
    }
    
    // Definir o usuário selecionado
    setSelectedUser(user);
    
    // Forçar marcação como lida imediatamente se houver mensagens não lidas
    if (user._id !== 'ai-assistant' && unreadCounts[user._id] > 0) {
      markConversationAsRead(user._id);
    }
  };

  // Função para obter usuários ordenados e filtrados
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

  // Recalcular listas
  const sortedUsers = getSortedAndFilteredUsers();

  return (
    <aside className="h-full overflow-auto w-full border-r border-base-300 flex flex-col">
      <div className="border-b border-base-300 w-full p-3 lg:p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="size-6" />
            <span className="font-medium">WeChat</span>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => setShowCreateGroupModal(true)}
              className="btn btn-sm btn-ghost btn-circle"
              title="Criar novo grupo"
            >
              <UserGroup size={18} />
            </button>
            
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
            {/* Seus componentes AddContact e PendingRequests aqui */}
          </div>
        )}

        {/* Abas Chats/Grupos */}
        <div className="mt-4 flex">
          <button
            onClick={() => setActiveTab("chats")}
            className={`flex-1 py-2 font-medium text-sm border-b-2 transition-colors
              ${activeTab === "chats" 
                ? "border-primary text-primary" 
                : "border-transparent hover:border-base-300"}
            `}
          >
            Chats
          </button>
          <button
            onClick={() => setActiveTab("groups")}
            className={`flex-1 py-2 font-medium text-sm border-b-2 transition-colors
              ${activeTab === "groups" 
                ? "border-primary text-primary" 
                : "border-transparent hover:border-base-300"}
            `}
          >
            Grupos
          </button>
        </div>

        <div className="mt-2 lg:mt-3 space-y-2">
          <input
            type="text"
            placeholder={`Pesquisar ${activeTab === "chats" ? "contactos" : "grupos"}...`}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="input input-bordered input-sm w-full"
          />

          {activeTab === "chats" && (
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
          )}
        </div>
      </div>

      <div className="overflow-y-auto flex-1 p-1 lg:p-2">
        {activeTab === "chats" ? (
          <>
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

            {/* Separador */}
            <div className="h-px bg-base-200 my-2" />

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
                  isSelected={selectedUser?._id === user._id}
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

            {(!sortedUsers || sortedUsers.length === 0) && (
              <div className="text-center text-base-content/60 p-4">
                {showOnlineOnly 
                  ? "Nenhum contacto online" 
                  : showContactMenu 
                    ? "Adicione contactos para começar a conversar" 
                    : "Nenhum contacto encontrado"
                }
              </div>
            )}
          </>
        ) : (
          // Usar o componente GroupTab para a aba de grupos
          <GroupTab 
            searchQuery={searchQuery} 
            onCreateGroup={() => setShowCreateGroupModal(true)}
          />
        )}
      </div>
      
      {/* Modal de criação de grupo */}
      <CreateGroupModal 
        isOpen={showCreateGroupModal} 
        onClose={() => setShowCreateGroupModal(false)} 
      />
    </aside>
  );
};

export default Sidebar;