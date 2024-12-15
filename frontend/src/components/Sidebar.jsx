import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton"; // Exemplo de esqueleto de carregamento
// Não vamos usar o 'Users' do Lucide React, então removemos essa importação.

const Sidebar = () => {
  // Pegando os dados e funções do store
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading } = useChatStore();
  const { onlineUsers } = useAuthStore();  // Pega os usuários online
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);  // Estado para filtrar por online

  // Carrega os usuários inicialmente e se inscreve para ouvir mudanças em tempo real
  useEffect(() => {
    getUsers();  // Chama a função para pegar os usuários

    // Configuração do WebSocket para escutar novos usuários
    const socket = new WebSocket("ws://your-websocket-server-url");

    // Escuta por mensagens do WebSocket
    socket.addEventListener("message", (event) => {
      const data = JSON.parse(event.data); // Converte a mensagem recebida

      // Verifica o tipo de mensagem e chama 'getUsers' para atualizar a lista
      if (data.type === "NEW_USER" || data.type === "USER_UPDATE") {
        getUsers();  // Recarrega a lista de usuários
      }
    });

    // Limpeza do WebSocket quando o componente for desmontado
    return () => {
      socket.close();
    };
  }, [getUsers]);

  // Filtrando os usuários, caso o filtro de online-only esteja ativo
  const filteredUsers = showOnlineOnly
    ? users.filter((user) => onlineUsers.includes(user._id))  // Só mostra os online
    : users;  // Se não, mostra todos os usuários

  // Se os usuários estão carregando, exibe o esqueleto de carregamento
  if (isUsersLoading) return <SidebarSkeleton />;

  return (
    <div className="sidebar">
      <h2>Contacts</h2>

      {/* Filtro para mostrar apenas os usuários online */}
      <div className="flex items-center">
        <input
          type="checkbox"
          checked={showOnlineOnly}
          onChange={(e) => setShowOnlineOnly(e.target.checked)}  // Atualiza o estado do filtro
          className="checkbox checkbox-sm"
        />
        <span>Show online only</span>
        <span>({onlineUsers.length - 1} online)</span>
      </div>

      {/* Lista de usuários filtrados */}
      <div className="user-list">
        {filteredUsers.map((user) => (
          <div
            key={user._id}  // Chave única para cada usuário
            onClick={() => setSelectedUser(user)}  // Altera o usuário selecionado ao clicar
            className={`
              w-full p-3 flex items-center gap-3
              hover:bg-base-300 transition-colors
              ${selectedUser?._id === user._id ? "bg-base-300 ring-1 ring-base-300" : ""}
            `}
          >
            {/* Mostrar um ponto verde se o usuário estiver online */}
            {onlineUsers.includes(user._id) && <span className="status-dot online"></span>}

            {/* Exibe o nome do usuário e o status */}
            <div className="user-info">
              <p className="user-name">{user.fullName}</p>
              <span className="user-status">
                {onlineUsers.includes(user._id) ? "Online" : "Offline"}
              </span>
            </div>
          </div>
        ))}

        {/* Caso não haja usuários online */}
        {filteredUsers.length === 0 && (
          <div>No online users</div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
