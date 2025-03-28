import { useEffect, useState, useCallback } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { Users, Bot } from "lucide-react";
import { debounce } from "lodash";

const Sidebar = () => {
  const { 
    getUsers, 
    users, 
    selectedUser, 
    setSelectedUser,
    isUsersLoading,
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

  // AI Assistant object
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

  // Função melhorada para ordenar usuários 
  const getSortedAndFilteredUsers = useCallback(() => {
    if (!users || users.length === 0) return [];
    
    // Filtrar por pesquisa e status online
    const filteredUsers = users.filter((user) => {
      const matchesSearch = user.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          user.username?.toLowerCase().includes(searchQuery.toLowerCase());
      const isOnline = showOnlineOnly ? onlineUsers.includes(user._id) : true;
      return matchesSearch && isOnline;
    });

    // Debug
    console.log('Filtrando e ordenando usuários:');
    console.log('unreadCounts:', unreadCounts);
    console.log('conversations:', conversations);

    // Ordenar por não lidos primeiro, depois por mensagens mais recentes
    return filteredUsers.sort((a, b) => {
      // Verificar se há mensagens não lidas (prioridade mais alta)
      const unreadA = unreadCounts[a._id] > 0;
      const unreadB = unreadCounts[b._id] > 0;
      
      // Mensagens não lidas têm prioridade
      if (unreadA && !unreadB) return -1;
      if (!unreadA && unreadB) return 1;
      
      // Encontrar conversas para os usuários
      const convA = conversations?.find(c => c.participants.includes(a._id));
      const convB = conversations?.find(c => c.participants.includes(b._id));
      
      // Se ambos têm ou não têm mensagens não lidas, ordene por mais recente
      if (convA?.latestMessage && convB?.latestMessage) {
        return new Date(convB.latestMessage.createdAt) - new Date(convA.latestMessage.createdAt);
      }
      
      // Se apenas um tiver mensagem, ele vem primeiro
      if (convA?.latestMessage) return -1;
      if (convB?.latestMessage) return 1;
      
      // Se nenhum tiver mensagens, mantenha a ordem alfabética
      return a.fullName.localeCompare(b.fullName);
    });
  }, [users, conversations, unreadCounts, searchQuery, showOnlineOnly, onlineUsers]);

  // Função para lidar com clique no usuário
  const handleUserClick = (user) => {
    setSelectedUser(user);
    // Na função setSelectedUser do store já estamos chamando markConversationAsRead
  };

  // Recalcular lista de usuários quando qualquer dependência mudar
  const sortedUsers = getSortedAndFilteredUsers();

  return (
    <aside className={`h-screen supports-[height:100cqh]:h-[100cqh] supports-[height:100svh]:h-[100svh] w-full lg:w-[30%] border-r border-base-300 flex flex-col transition-all duration-200
      ${isMobile && selectedUser ? 'hidden' : 'block'}`}>
      
      <div className="border-b border-base-300 w-full p-3 lg:p-4">
        <div className="flex items-center gap-2">
          <Users className="size-6" />
          <span className="font-medium">Contactos</span>
        </div>

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
              {onlineUsers.length - 1} online
            </span>
          </div>
        </div>
      </div>

      <div className="overflow-y-auto flex-1 p-1 lg:p-2">
        {/* AI Assistant */}
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

        {/* Separator */}
        <div className="h-px bg-base-200 my-2" />

        {/* User List */}
        {sortedUsers.map((user) => {
          const hasUnread = unreadCounts && unreadCounts[user._id] > 0;
          const conv = conversations?.find(c => c.participants.includes(user._id));
          
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
                  alt={user.fullName}
                  className="size-10 lg:size-12 object-cover rounded-full border"
                />
                {onlineUsers.includes(user._id) && (
                  <span className="absolute bottom-0 right-0 size-2.5 lg:size-3 bg-green-500 rounded-full border-2 border-base-100" />
                )}
              </div>

              <div className="flex-1 text-left">
                <div className="flex items-center justify-between">
                  <span className="font-medium truncate text-sm lg:text-base">{user.fullName}</span>
                  {hasUnread && (
                    <span className="inline-flex items-center justify-center bg-primary text-primary-content rounded-full min-w-5 h-5 px-1.5 text-xs font-medium ml-2">
                      {unreadCounts[user._id] > 9 ? '9+' : unreadCounts[user._id]}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center justify-between">
                  <span className={`text-xs ${onlineUsers.includes(user._id) ? "text-green-500" : "text-base-content/60"}`}>
                    {onlineUsers.includes(user._id) ? "Online" : "Offline"}
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
                
                {/* Preview da última mensagem */}
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

        {sortedUsers.length === 0 && (
          <div className="text-center text-base-content/60 p-4">
            {showOnlineOnly ? "Nenhum utilizador online" : "Nenhum contacto encontrado"}
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;