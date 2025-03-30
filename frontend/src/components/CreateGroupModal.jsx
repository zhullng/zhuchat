// components/CreateGroupModal.jsx
import { useState, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";
import { X, Upload, Check, Users, Search } from "lucide-react";
import toast from "react-hot-toast";

const CreateGroupModal = ({ isOpen, onClose }) => {
  const { users } = useChatStore();
  const { createGroup } = useGroupStore();
  
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [profilePic, setProfilePic] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Filtrar usuários com base na pesquisa
  const filteredUsers = users.filter(user => 
    user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Lidar com upload de imagem de perfil do grupo
  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione um arquivo de imagem");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setProfilePicPreview(reader.result);
      setProfilePic(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Alternar seleção de membro
  const toggleMemberSelection = (userId) => {
    if (selectedMembers.includes(userId)) {
      setSelectedMembers(prev => prev.filter(id => id !== userId));
    } else {
      setSelectedMembers(prev => [...prev, userId]);
    }
  };

  // Criar o grupo
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    
    if (!groupName.trim()) {
      toast.error("O nome do grupo é obrigatório");
      return;
    }
    
    if (selectedMembers.length === 0) {
      toast.error("Selecione pelo menos um membro para o grupo");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const groupData = {
        name: groupName.trim(),
        description: description.trim(),
        members: selectedMembers,
        profilePic: profilePic
      };
      
      await createGroup(groupData);
      resetForm();
      onClose();
    } catch (error) {
      console.error("Erro ao criar grupo:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Resetar formulário
  const resetForm = () => {
    setGroupName("");
    setDescription("");
    setSelectedMembers([]);
    setSearchQuery("");
    setProfilePic(null);
    setProfilePicPreview(null);
  };

  // Limpar formulário ao fechar
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
      <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-base-300 flex justify-between items-center">
          <h2 className="text-lg font-medium flex items-center gap-2">
            <Users size={20} />
            Criar Novo Grupo
          </h2>
          <button 
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle"
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleCreateGroup} className="flex-1 overflow-y-auto p-4">
          {/* Imagem de perfil do grupo */}
          <div className="mb-4 flex justify-center">
            <div className="relative">
              <div className="w-24 h-24 rounded-full border flex items-center justify-center overflow-hidden bg-base-200">
                {profilePicPreview ? (
                  <img 
                    src={profilePicPreview} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Users size={32} className="opacity-40" />
                )}
              </div>
              
              <label className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-1.5 cursor-pointer">
                <Upload size={16} />
                <input 
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleProfilePicChange}
                  disabled={isLoading}
                />
              </label>
            </div>
          </div>
          
          {/* Nome do grupo */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Nome do grupo *</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="input input-bordered w-full"
              placeholder="Digite o nome do grupo"
              disabled={isLoading}
              required
            />
          </div>
          
          {/* Descrição */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="textarea textarea-bordered w-full"
              placeholder="Digite uma descrição para o grupo"
              rows="2"
              disabled={isLoading}
            ></textarea>
          </div>
          
          {/* Seleção de membros */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Membros ({selectedMembers.length} selecionados) *
            </label>
            
            {/* Barra de pesquisa */}
            <div className="relative mb-2">
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
            
            {/* Lista de membros */}
            <div className="bg-base-200 rounded-lg max-h-48 overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <div className="p-4 text-center text-base-content/60">
                  Nenhum contacto encontrado
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
        </form>
        
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
            onClick={handleCreateGroup} 
            className="btn btn-primary"
            disabled={isLoading || !groupName.trim() || selectedMembers.length === 0}
          >
            {isLoading ? (
              <>
                <span className="loading loading-spinner loading-xs"></span>
                Criando...
              </>
            ) : (
              'Criar Grupo'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupModal;