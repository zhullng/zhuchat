import { useState } from "react";
import { Users, X, Check, Search } from "lucide-react";
import { useChatStore } from "../store/useChatStore";

const CreateGroup = ({ onClose, onGroupCreated }) => {
  const { users, createGroup } = useChatStore();
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Filtra utilizadores com base na pesquisa
  const filteredUsers = users.filter(user => 
    user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleMember = (userId) => {
    if (selectedMembers.includes(userId)) {
      setSelectedMembers(prev => prev.filter(id => id !== userId));
    } else {
      setSelectedMembers(prev => [...prev, userId]);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedMembers.length === 0) {
      return;
    }

    setIsLoading(true);
    try {
      await createGroup(groupName, selectedMembers);
      onGroupCreated();
    } catch (error) {
      console.error("Erro ao criar grupo:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 bg-base-100 rounded-lg border border-base-300">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Criar Novo Grupo</h3>
        <button 
          onClick={onClose} 
          className="btn btn-sm btn-ghost btn-circle"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nome do grupo */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Nome do Grupo</label>
        <input
          type="text"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="Ex: Amigos, Família, Trabalho..."
          className="input input-bordered w-full"
        />
      </div>

      {/* Seleção de membros */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Adicionar Membros ({selectedMembers.length} selecionados)
        </label>
        
        <div className="relative mb-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar contactos..."
            className="input input-bordered w-full pl-9"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/60" size={16} />
        </div>

        <div className="max-h-48 overflow-y-auto border border-base-200 rounded-lg">
          {filteredUsers.length > 0 ? (
            filteredUsers.map(user => (
              <div 
                key={user._id}
                onClick={() => handleToggleMember(user._id)}
                className={`
                  flex items-center gap-3 p-2 hover:bg-base-200 cursor-pointer
                  ${selectedMembers.includes(user._id) ? 'bg-base-200' : ''}
                `}
              >
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full overflow-hidden">
                    <img 
                      src={user.profilePic || "/avatar.png"}
                      alt={user.fullName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{user.fullName}</div>
                  <div className="text-xs text-base-content/70 truncate">{user.email}</div>
                </div>
                
                <div className="flex-shrink-0">
                  {selectedMembers.includes(user._id) ? (
                    <div className="w-5 h-5 bg-primary text-primary-content rounded-full flex items-center justify-center">
                      <Check size={12} />
                    </div>
                  ) : (
                    <div className="w-5 h-5 border border-base-300 rounded-full"></div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="p-3 text-center text-base-content/60 text-sm">
              Nenhum contacto encontrado
            </div>
          )}
        </div>
      </div>

      {/* Mostrar membros selecionados */}
      {selectedMembers.length > 0 && (
        <div className="mt-3">
          <div className="text-sm font-medium mb-1">Membros Selecionados:</div>
          <div className="flex flex-wrap gap-1">
            {selectedMembers.map(memberId => {
              const member = users.find(u => u._id === memberId);
              return (
                <div 
                  key={memberId}
                  className="bg-base-200 text-xs rounded-full px-2 py-1 flex items-center gap-1"
                >
                  <span className="truncate max-w-[100px]">{member?.fullName}</span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleMember(memberId);
                    }}
                    className="hover:text-error"
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Botões de ação */}
      <div className="mt-4 flex justify-end gap-2">
        <button 
          onClick={onClose}
          className="btn btn-sm btn-ghost"
        >
          Cancelar
        </button>
        
        <button 
          onClick={handleCreateGroup}
          className="btn btn-sm btn-primary"
          disabled={!groupName.trim() || selectedMembers.length === 0 || isLoading}
        >
          {isLoading ? (
            <>
              <span className="loading loading-spinner loading-xs"></span>
              Criando...
            </>
          ) : 'Criar Grupo'}
        </button>
      </div>
    </div>
  );
};

export default CreateGroup;