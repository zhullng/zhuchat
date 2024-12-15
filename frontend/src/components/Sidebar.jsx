import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users } from "lucide-react";

// Hook para gerenciar a conexão com WebSocket
const useWebSocket = (onMessageReceived) => {
  useEffect(() => {
    // Conectar ao WebSocket (substitua a URL pelo seu servidor WebSocket)
    const socket = new WebSocket("ws://localhost:4000"); // Exemplo de WebSocket

    socket.onopen = () => {
      console.log("Conectado ao WebSocket");
    };

    socket.onmessage = (event) => {
      // Chama a função de callback com a mensagem recebida
      onMessageReceived(JSON.parse(event.data));
    };

    socket.onerror = (error) => {
      console.log("Erro no WebSocket:", error);
    };

    socket.onclose = () => {
      console.log("WebSocket fechado");
    };

    return () => {
      socket.close();
    };
  }, [onMessageReceived]);
};

const Sidebar = () => {
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading, updateUsers } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);

  // Função chamada quando uma nova mensagem (alteração) é recebida via WebSocket
  const handleWebSocketMessage = (message) => {
    if (message.type === "USER_LIST_UPDATED") {
      // Atualiza a lista de usuários no store
      updateUsers(message.users);
    } else if (message.type === "USER_STATUS_CHANGED") {
      // Atualiza o status de um usuário (online/offline)
      updateUsers(message.user);
    }
  };

  // Conectar ao WebSocket
  useWebSocket(handleWebSocketMessage);

  // Filtra os usuários online, se necessário
  const filteredUsers = showOnlineOnly
    ? users.filter((user) => onlineUsers.includes(user._id))
    : users;

  if (isUsersLoading) return <SidebarSkeleton />;

  return (
    <aside className="h-full w-20 lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200">
      <div className="border-b border-base-300 w-full p-5">
        <div className="flex items-center gap-2">
          <Users className="size-6" />
          <span className="font-medium hidden lg:block">Contacts</span>
        </div>
        {/* Filtro para exibir apenas online */}
        <div className="mt-3 hidden lg:flex items-center gap-2">
          <label className="cursor-pointer flex items-center gap-2">
            <input
              type="checkbox"
              checked={showOnlineOnly}
              onChange={(e) => setShowOnlineOnly(e.target.checked)}
              className="checkbox checkbox-sm"
            />
            <span className="text-sm">Show online only</span>
          </label>
          <span className="text-xs text-zinc-500">({onlineUsers.length - 1} online)</span>
        </div>
      </div>

      <div className="overflow-y-auto w-full py-3">
        {filteredUsers.map((user) => (
          <button
            key={user._id}
            onClick={() => setSelectedUser(user)}
            className={`
              w-full p-3 flex items-center gap-3
              hover:bg-base-300 transition-colors
              ${selectedUser?._id === user._id ? "bg-base-300 ring-1 ring-base-300" : ""}
            `}
          >
            <div className="relative mx-auto lg:mx-0">
              <img
                src={user.profilePic || "/avatar.png"}
                alt={user.name}
                className="size-12 object-cover rounded-full"
              />
              {onlineUsers.includes(user._id) && (
                <span
                  className="absolute bottom-0 right-0 size-3 bg-green-500 
                  rounded-full ring-2 ring-zinc-900"
                />
              )}
            </div>

            {/* Informações do usuário - visíveis apenas em telas grandes */}
            <div className="hidden lg:block text-left min-w-0">
              <div className="font-medium truncate">{user.fullName}</div>
              <div className="text-sm text-zinc-400">
                {onlineUsers.includes(user._id) ? "Online" : "Offline"}
              </div>
            </div>
          </button>
        ))}

        {filteredUsers.length === 0 && (
          <div className="text-center text-zinc-500 py-4">No online users</div>
        )}
      </div>
    </aside>
  );
};
export default Sidebar;
