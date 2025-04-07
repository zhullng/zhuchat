// components/AddGroupMembersModal.jsx
import { useState, useEffect, useRef } from "react";
import { X, Search, Check, Users, UserPlus } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";
import toast from "react-hot-toast";

const AddGroupMembersModal = ({ isOpen, onClose }) => {
  const { users } = useChatStore();
  const { selectedGroup, addGroupMembers } = useGroupStore();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const modalRef = useRef(null);
  
  // Resetar seleções quando o modal abre
  useEffect(() => {
    if (isOpen) {
      setSelectedUsers([]);
      setSearchQuery("");
    }
  }, [isOpen]);
  
  // Fechar o modal ao clicar fora dele
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target) && !isLoading) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose, isLoading]);
  
  if (!isOpen || !selectedGroup) return null;
  
  // Obter IDs de membros atuais
  const currentMemberIds = selectedGroup.members.map(member => 
    typeof member === 'object' ? member._id : member
  );
  
  // Filtrar usuários que não são membros e correspondem à pesquisa
  const filteredUsers = users.filter(user => 
    !currentMemberIds.includes(user._id) && 
    (user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
     user.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  // Alternar seleção de usuário
  const toggleUserSelection = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    } else {
      setSelectedUsers(prev => [...prev, userId]);
    }
  };
  
  // Adicionar membros ao grupo
  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) {
      toast.error("Selecione pelo menos um usuário para adicionar");
      return;
    }
    
    setIsLoading(true);
    
    try {      
      await addGroupMembers(selectedGroup._id, selectedUsers);
      onClose();
    } catch (error) {
      console.error("Erro ao adicionar membros:", error);
      toast.error("Erro ao adicionar membros ao grupo");
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
      <div ref={modalRef} className="bg-base-100 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-base-300 flex justify-between items-center">
          <h2 className="text-lg font-medium flex items-center gap-2">
            <UserPlus size={20} />
            Adicionar Membros
          </h2>
          <button 
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle"
            disabled={isLoading}
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4">
          <div className="flex flex-col gap-2 mb-4">
            <h3 className="font-medium text-sm flex gap-2 items-center">
              <Users size={16} />
              Grupo: {selectedGroup.name}
            </h3>
            <p className="text-xs text-base-content/70">
              Selecione os contatos que você deseja adicionar ao grupo
            </p>
          </div>
          
          {/* Barra de pesquisa */}
          <div className="relative mb-4">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/60" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input input-bordered w-full pl-10"
              placeholder="Pesquisar contatos..."
              disabled={isLoading}
            />
          </div>
          
          {/* Lista de usuários */}
          <div className="border border-base-300 rounded-lg overflow-hidden mb-4">
            <div className="max-h-64 overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <div className="p-4 text-center text-base-content/60">
                  {searchQuery ? "Nenhum contato encontrado" : "Todos os seus contatos já estão no grupo"}
                </div>
              ) : (
                filteredUsers.map(user => (
                  <div 
                    key={user._id}
                    onClick={() => toggleUserSelection(user._id)}
                    className={`flex items-center p-2 hover:bg-base-200 cursor-pointer border-b border-base-200 last:border-b-0 ${
                      selectedUsers.includes(user._id) ? 'bg-base-200' : ''
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
                      selectedUsers.includes(user._id) 
                        ? 'bg-primary text-white' 
                        : 'border border-base-content/40'
                    }`}>
                      {selectedUsers.includes(user._id) && <Check size={12} />}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          <div className="text-sm mb-4">
            <span className="font-medium">{selectedUsers.length}</span> contato(s) selecionado(s)
          </div>
        </div>
        
        <div className="p-4 border-t border-base-300 flex justify-end gap-2">
          <button 
            onClick={onClose}
            className="btn btn-ghost"
            disabled={isLoading}
          >
            Cancelar
          </button>
          <button 
            onClick={handleAddMembers}
            className="btn btn-primary"
            disabled={isLoading || selectedUsers.length === 0}
          >
            {isLoading ? (
              <>
                <span className="loading loading-spinner loading-xs"></span>
                Adicionando...
              </>
            ) : (
              'Adicionar ao Grupo'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddGroupMembersModal;