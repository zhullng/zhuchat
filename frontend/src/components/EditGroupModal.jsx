// components/EditGroupModal.jsx
import { useState, useRef } from "react";
import { X, Upload, Trash2, Camera } from "lucide-react";
import { useGroupStore } from "../store/useGroupStore";
import toast from "react-hot-toast";

const EditGroupModal = ({ isOpen, onClose }) => {
  const { selectedGroup, updateGroupInfo } = useGroupStore();
  const [name, setName] = useState(selectedGroup?.name || "");
  const [description, setDescription] = useState(selectedGroup?.description || "");
  const [profilePic, setProfilePic] = useState(selectedGroup?.profilePic || "");
  const [newProfilePic, setNewProfilePic] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione um arquivo de imagem");
      return;
    }

    // Verificar tamanho (limite de 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setNewProfilePic(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setNewProfilePic("");
    setProfilePic("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("O nome do grupo é obrigatório");
      return;
    }
    
    try {
      setIsLoading(true);
      
      const updateData = {
        name: name.trim(),
        description: description.trim(),
        profilePic: newProfilePic !== null ? newProfilePic : profilePic
      };
      
      await updateGroupInfo(selectedGroup._id, updateData);
      onClose();
    } catch (error) {
      console.error("Erro ao atualizar grupo:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !selectedGroup) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
      <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-md">
        <div className="p-4 border-b border-base-300 flex justify-between items-center">
          <h2 className="text-lg font-medium">Editar Grupo</h2>
          <button 
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle"
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4">
          {/* Imagem de perfil */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative w-24 h-24 rounded-full overflow-hidden bg-base-200 mb-3">
              {newProfilePic ? (
                <img
                  src={newProfilePic}
                  alt="Nova foto de perfil"
                  className="w-full h-full object-cover"
                />
              ) : profilePic ? (
                <img
                  src={profilePic}
                  alt="Foto de perfil atual"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Camera size={36} className="opacity-40" />
                </div>
              )}
              
              <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 flex items-center justify-center transition-all duration-200">
                <div className="opacity-0 hover:opacity-100 flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-primary text-primary-content p-1.5 rounded-full"
                    title="Alterar foto"
                  >
                    <Upload size={16} />
                  </button>
                  
                  {(profilePic || newProfilePic) && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="bg-error text-error-content p-1.5 rounded-full"
                      title="Remover foto"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleImageChange}
            />
          </div>
          
          {/* Campo de nome */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Nome do grupo</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input input-bordered w-full"
              placeholder="Digite o nome do grupo"
              required
            />
          </div>
          
          {/* Campo de descrição */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-1">Descrição (opcional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="textarea textarea-bordered w-full h-20"
              placeholder="Digite uma descrição para o grupo"
            />
          </div>
          
          {/* Botões de ação */}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline"
              disabled={isLoading}
            >
              Cancelar
            </button>
            
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditGroupModal;