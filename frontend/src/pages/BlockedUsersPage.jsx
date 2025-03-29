import { useState, useEffect } from "react";
import { ArrowLeft, UserCheck, Loader, AlertTriangle, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useChatStore } from "../store/useChatStore";
import toast from "react-hot-toast";

const BlockedUsersPage = () => {
  const navigate = useNavigate();
  const { getBlockedUsers, unblockUser } = useChatStore();
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isUnblocking, setIsUnblocking] = useState(false);
  const [showUnblockModal, setShowUnblockModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    fetchBlockedUsers();
  }, []);

  const fetchBlockedUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Usa a função do store em vez de chamar a API diretamente
      const users = await getBlockedUsers();
      setBlockedUsers(users);
    } catch (err) {
      console.error("Erro ao carregar utilizadores bloqueados:", err);
      setError("Não foi possível carregar os utilizadores bloqueados. Por favor, tente novamente.");
      toast.error("Erro ao carregar utilizadores bloqueados");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnblock = async (userId) => {
    setIsUnblocking(true);
    try {
      // Usa a função do store em vez de chamar a API diretamente
      const success = await unblockUser(userId);
      
      if (success) {
        // Atualiza a lista local removendo o usuário desbloqueado
        setBlockedUsers(blockedUsers.filter(user => user._id !== userId));
        setShowUnblockModal(false);
        setSelectedUser(null);
      }
    } catch (err) {
      console.error("Erro ao desbloquear utilizador:", err);
      toast.error("Erro ao desbloquear utilizador");
    } finally {
      setIsUnblocking(false);
    }
  };

  const openUnblockModal = (user) => {
    setSelectedUser(user);
    setShowUnblockModal(true);
  };

  const filteredUsers = blockedUsers.filter(user => 
    user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-screen pl-16 sm:pl-20 overflow-auto bg-base-100">
      <div className="max-w-2xl mx-auto p-4 py-8">
        <button 
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2 text-base-content/70 hover:text-base-content mb-4"
        >
          <ArrowLeft className="size-5" />
          <span>Voltar</span>
        </button>
        
        <div className="bg-base-200 rounded-xl p-6 shadow-lg">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold">Utilizadores Bloqueados</h1>
            <p className="mt-2 text-base-content/70">Gerir utilizadores bloqueados</p>
          </div>

          {/* Barra de pesquisa */}
          <div className="relative mb-6">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="size-5 text-base-content/40" />
            </div>
            <input
              type="text"
              className="input input-bordered w-full pl-10"
              placeholder="Pesquisar utilizadores bloqueados..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Conteúdo principal */}
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader className="size-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="bg-error/10 text-error p-4 rounded-lg flex items-start gap-3">
              <AlertTriangle className="size-5 flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              {searchTerm ? (
                <p className="text-base-content/70">Nenhum utilizador bloqueado corresponde à pesquisa.</p>
              ) : (
                <p className="text-base-content/70">Não tem utilizadores bloqueados.</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map(user => (
                <div 
                  key={user._id} 
                  className="flex items-center justify-between p-4 bg-base-300 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <img 
                      src={user.profilePic || "/avatar.png"} 
                      alt={user.fullName}
                      className="size-10 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-medium">{user.fullName}</p>
                      <p className="text-sm text-base-content/70">{user.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => openUnblockModal(user)}
                    className="btn btn-sm btn-outline gap-1"
                  >
                    <UserCheck className="size-4" />
                    <span>Desbloquear</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de confirmação de desbloqueio */}
      {showUnblockModal && selectedUser && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowUnblockModal(false)}
        >
          <div 
            className="bg-base-100 p-4 rounded-lg w-80 max-w-full"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center mb-4">
              <div className="flex justify-center mb-3">
                <div className="p-3 bg-primary/10 rounded-full">
                  <UserCheck className="size-8 text-primary" />
                </div>
              </div>
              <h3 className="text-lg font-medium mb-2">Desbloquear Utilizador</h3>
              <p className="text-sm text-base-content/70">
                Tem a certeza que deseja desbloquear {selectedUser.fullName}? Este utilizador poderá enviar-lhe mensagens novamente.
              </p>
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowUnblockModal(false)}
                className="btn btn-ghost btn-sm"
                disabled={isUnblocking}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleUnblock(selectedUser._id)}
                className="btn btn-primary btn-sm"
                disabled={isUnblocking}
              >
                {isUnblocking ? "A desbloquear..." : "Desbloquear"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlockedUsersPage;