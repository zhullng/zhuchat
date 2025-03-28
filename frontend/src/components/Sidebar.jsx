import { useEffect, useState, useCallback } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { Users, Bot, UserPlus, X, Check, XCircle } from "lucide-react";
import { debounce } from "lodash";

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
    unsubscribeFromMessages
  } = useChatStore();
  const { onlineUsers, authUser } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [showContactMenu, setShowContactMenu] = useState(false);

  // Objeto do Assistente Virtual
  const aiAssistant = {
    _id: 'ai-assistant',
    fullName: 'Assistente Virtual',
    isAI: true,
  };

  // Subscrever e carregar dados ao montar o componente
  useEffect(() => {
    getUsers();
    subscribeToMessages(); // Importante: subscrever para eventos de novas mensagens
    
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      unsubscribeFromMessages(); // Limpar subscrição ao desmontar
    };
  }, [getUsers, subscribeToMessages, unsubscribeFromMessages]);

  // Importante: forçar atualização em mudanças em conversations ou unreadCounts
  const [forceUpdate, setForceUpdate] = useState(0);
  
  useEffect(() => {
    // Este efeito observa mudanças em conversations e unreadCounts
    setForceUpdate(prev => prev + 1);
  }, [conversations, unreadCounts]);

  const handleSearchChange = debounce((query) => {
    setSearchQuery(query);
  }, 300);

  // Função para atualizar contactos
  const refreshContacts = () => {
    getUsers();
  };

  // Função melhorada para ordenar utilizadores 
  const getSortedAndFilteredUsers = useCallback(() => {
    if (!users || !Array.isArray(users) || users.length === 0) return [];
    
    // Filtrar por pesquisa e estado online
    const filteredUsers = users.filter((user) => {
      if (!user || !user._id) return false; // Ignorar usuários inválidos
      
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

  // Função para lidar com clique no utilizador
  const handleUserClick = (user) => {
    if (!user) return;
    setSelectedUser(user);
    // Na função setSelectedUser do store já estamos a chamar markConversationAsRead
  };

  // Recalcular lista de utilizadores quando qualquer dependência mudar
  const sortedUsers = getSortedAndFilteredUsers();

  return (
    <aside className={`h-screen supports-[height:100cqh]:h-[100cqh] supports-[height:100svh]:h-[100svh] w-full lg:w-[30%] border-r border-base-300 flex flex-col transition-all duration-200
      ${isMobile && selectedUser ? 'hidden' : 'block'}`}>
      
      <div className="border-b border-base-300 w-full p-3 lg:p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="size-6" />
            <span className="font-medium">Contactos</span>
          </div>
          
          <button 
            onClick={() => setShowContactMenu(!showContactMenu)}
            className="btn btn-sm btn-ghost btn-circle"
            title={showContactMenu ? "Fechar menu" : "Gerir contactos"}
          >
            {showContactMenu ? <X size={18} /> : <UserPlus size={18} />}
          </button>
        </div>

        {/* Menu de Gestão de Contactos */}
        {showContactMenu && (
          <div className="mt-3 border-t border-base-300 pt-3">
            <AddContact onContactAdded={refreshContacts} />
            <PendingRequests onRequestResponded={refreshContacts} />
          </div>
        )}

        <div className="mt-2 lg:mt-3 space-y-2">
          <input
            type="text"
            placeholder="Pesquisar contactos..."
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

        {/* Separador */}
        <div classNameclassName="h-px bg-base-200 my-2" />

{/* Lista de Utilizadores */}
{sortedUsers.map((user) => {
  const hasUnread = unreadCounts && unreadCounts[user._id] > 0;
  const conv = conversations?.find(c => c?.participants?.includes(user._id));
  
  return (
    <button
      key={user._id}
      onClick={() => handleUserClick(user)}
      className={`
        w-full flex items-center gap-3 p-2 lg:p-3 rounded-lg
        transition-colors hover:bg-base-200 mb-1
        ${selectedUser?._id === user._id ? "bg-base-300 ring-1 ring-base-300" : ""} 
        ${hasUnread ? "bg-primary/10" : ""}
      `}
    >
      <div className="relative">
        <img
          src={user.profilePic || "/avatar.png"}
          alt={user.fullName || "Utilizador"}
          className="size-10 lg:size-12 object-cover rounded-full border"
        />
        {(onlineUsers || []).includes(user._id) && (
          <span className="absolute bottom-0 right-0 size-2.5 lg:size-3 bg-green-500 rounded-full border-2 border-base-100" />
        )}
      </div>

      <div className="flex-1 text-left">
        <div className="flex items-center justify-between">
          <span className="font-medium truncate text-sm lg:text-base">{user.fullName || "Utilizador"}</span>
          {hasUnread && (
            <span className="inline-flex items-center justify-center bg-primary text-primary-content rounded-full min-w-5 h-5 px-1.5 text-xs font-medium ml-2">
              {unreadCounts[user._id] > 9 ? '9+' : unreadCounts[user._id]}
            </span>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <span className={`text-xs ${(onlineUsers || []).includes(user._id) ? "text-green-500" : "text-base-content/60"}`}>
            {(onlineUsers || []).includes(user._id) ? "Online" : "Offline"}
          </span>
          
          {/* Horário da última mensagem, se existir */}
          {conv?.latestMessage && (
            <span className="text-xs text-base-content/60">
              {new Date(conv.latestMessage.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          )}
        </div>
        
        {/* Pré-visualização da última mensagem */}
        {conv?.latestMessage && (
          <div className={`text-xs ${hasUnread ? "font-medium text-base-content" : "text-base-content/70"} truncate mt-1 max-w-full`}>
            {conv.latestMessage.senderId === authUser?._id ? 'Você: ' : ''}
            {conv.latestMessage.text || (conv.latestMessage.img ? 'Imagem' : 'Mensagem')}
          </div>
        )}
      </div>
    </button>
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
</div>
</aside>
);
};

export default Sidebar;