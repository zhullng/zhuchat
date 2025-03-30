// components/AddGroupMembersModal.jsx (continuação)
import { useState, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";
import { X, Search, Check, UserPlus } from "lucide-react";
import toast from "react-hot-toast";

const AddGroupMembersModal = ({ isOpen, onClose }) => {
  const { users } = useChatStore();
  const { selectedGroup, addGroupMembers } = useGroupStore();
  
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Filtrar usuários que já são membros do grupo
  const nonMembers = users.filter(user => 
    !selectedGroup?.members?.some(member => member._id === user._id)
  );

  // Filtrar usuários com base na pesquisa
  const filteredUsers = nonMembers.filter(user => 
    user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Alternar seleção de membro
  const toggleMemberSelection = (userId) => {
    if (selectedMembers.includes(userId)) {
      setSelectedMembers(prev => prev.filter(id => id !== userId));
    } else {
      setSelectedMembers(prev => [...prev, userId]);
    }
  };

  // Adicionar membros ao grupo
  const handleAddMembers = async () => {
    if (selectedMembers.length === 0) {
      toast.error("Selecione pelo menos um membro para adicionar");
      return;
    }
    
    setIsLoading(true);
    
    try {
      await addGroupMembers(selectedGroup._id, selectedMembers);
      setSelectedMembers([]);
      onClose();
    } catch (error) {
      console.error("Erro ao adicionar membros:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Resetar seleção quando fechar o modal
  useEffect(() => {
    if (!isOpen) {
      setSelectedMembers([]);
      setSearchQuery("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
      <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-base-300 flex justify-between items-center">
          <h2 className="text-lg font-medium flex items-center gap-2">
            <UserPlus size={20} />
            Adicionar Membros
          </h2>
          <button 
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {/* Barra de pesquisa */}
          <div className="relative mb-4">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/60" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input input-bordered w-full pl-10"
              placeholder="Pesquisar contactos..."
              disabled={isLoading}
            />
          </div>
          
          {/* Contador de selecionados */}
          <div className="mb-2 text-sm">
            {selectedMembers.length} {selectedMembers.length === 1 ? 'contacto' : 'contactos'} selecionado
            {selectedMembers.length === 1 ? '' : 's'}
          </div>
          
          {/* Lista de usuários */}
          <div className="bg-base-200 rounded-lg max-h-96 overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-base-content/60">
                {nonMembers.length === 0 
                  ? "Todos os seus contactos já são membros deste grupo" 
                  : "Nenhum contacto encontrado"}
              </div>
            ) : (
              filteredUsers.map(user => (
                <div 
                  key={user._id}
                  onClick={() => toggleMemberSelection(user._id)}
                  className={`flex items-center p-2 hover:bg-base-300 cursor-pointer ${
                    selectedMembers.includes(user._id) ? 'bg-base-300' : ''
                  }`}
                >
                  <div className="flex items-center flex-1 gap-2">
                    <img 
                      src={user.profilePic || "/avatar.png"} 
                      alt={user.fullName}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div>
                      <div className="font-medium text-sm">{user.fullName}</div>
                      <div className="text-xs text-base-content/60">{user.email}</div>
                    </div>
                  </div>
                  
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    selectedMembers.includes(user._id) 
                      ? 'bg-primary text-white' 
                      : 'border border-base-content/40'
                  }`}>
                    {selectedMembers.includes(user._id) && <Check size={12} />}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="p-4 border-t border-base-300 flex justify-end gap-2">
          <button 
            type="button"
            onClick={onClose} 
            className="btn btn-ghost"
            disabled={isLoading}
          >
            Cancelar
          </button>
          <button 
            type="button"
            onClick={handleAddMembers} 
            className="btn btn-primary"
            disabled={isLoading || selectedMembers.length === 0}
          >
            {isLoading ? (
              <>
                <span className="loading loading-spinner loading-xs"></span>
                Adicionando...
              </>
            ) : (
              'Adicionar'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddGroupMembersModal;