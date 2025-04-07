// components/GroupInfoModal.jsx
import { useState } from "react";
import { X, Users, LogOut, Trash2 } from "lucide-react";
import { useGroupStore } from "../store/useGroupStore";
import { useAuthStore } from "../store/useAuthStore";
import toast from "react-hot-toast";

const GroupInfoModal = ({ isOpen, onClose }) => {
  const { selectedGroup, leaveGroup, deleteGroup, removeGroupMember } = useGroupStore();
  const { authUser } = useAuthStore();
  
  // Verificar se o usuário logado é o criador do grupo
  const isCreator = selectedGroup?.createdBy === authUser._id;
  
  // Lista de membros formatada
  const members = selectedGroup?.members || [];

  // Função para lidar com saída do grupo
  // Função atualizada para lidar com saída do grupo no GroupInfoModal.jsx
const handleLeaveGroup = async () => {
  try {
    // Usar confirm para confirmar a ação
    if (confirm(`Tem certeza que deseja sair do grupo "${selectedGroup.name}"?`)) {
      // Mostrar um feedback visual
      const loadingToast = toast.loading("Saindo do grupo...");
      
      // Chamar a função de sair do grupo do store
      await leaveGroup(selectedGroup._id);
      
      // Fechar modal após sair
      onClose();
      
      // Mostrar mensagem de sucesso (já feito no leaveGroup, mas podemos garantir)
      toast.dismiss(loadingToast);
    }
  } catch (error) {
    console.error("Erro ao sair do grupo:", error);
    toast.error("Não foi possível sair do grupo. Tente novamente.");
  }
};

  // Função para lidar com exclusão do grupo
// Atualização dos handlers no GroupInfoModal.jsx

// Função para lidar com exclusão do grupo
const handleDeleteGroup = async () => {
  try {
    if (confirm(`Tem certeza que deseja excluir o grupo "${selectedGroup.name}"? Esta ação não pode ser desfeita e todas as mensagens serão perdidas.`)) {
      // Mostrar toast de carregamento
      const loadingToast = toast.loading("Excluindo grupo...");
      
      // Chamar a função do store
      await deleteGroup(selectedGroup._id);
      
      // Fechar modal após excluir
      onClose();
      
      // Toast de sucesso já é mostrado na função deleteGroup
      toast.dismiss(loadingToast);
    }
  } catch (error) {
    console.error("Erro ao excluir grupo:", error);
    toast.error("Não foi possível excluir o grupo. Tente novamente.");
  }
};

// Função para remover um membro
const handleRemoveMember = async (memberId, memberName) => {
  try {
    if (confirm(`Tem certeza que deseja remover ${memberName || 'este membro'} do grupo?`)) {
      // Mostrar toast de carregamento
      const loadingToast = toast.loading("Removendo membro...");
      
      // Chamar a função do store
      await removeGroupMember(selectedGroup._id, memberId);
      
      // Toast de sucesso já é mostrado na função removeGroupMember
      toast.dismiss(loadingToast);
    }
  } catch (error) {
    console.error("Erro ao remover membro:", error);
    toast.error("Não foi possível remover o membro. Tente novamente.");
  }
};

  if (!isOpen || !selectedGroup) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
      <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-base-300 flex justify-between items-center">
          <h2 className="text-lg font-medium">Informações do Grupo</h2>
          <button 
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {/* Avatar e nome do grupo */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-base-200 flex items-center justify-center">
              {selectedGroup.profilePic ? (
                <img
                  src={selectedGroup.profilePic}
                  alt={selectedGroup.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Users size={36} className="opacity-40" />
              )}
            </div>
            <h3 className="text-xl font-medium mt-3">{selectedGroup.name}</h3>
            {selectedGroup.description && (
              <p className="text-base-content/70 text-center mt-1">{selectedGroup.description}</p>
            )}
          </div>
          
          {/* Membros do grupo */}
          <div>
            <h4 className="text-md font-medium mb-2 flex items-center gap-2">
              <Users size={18} />
              Membros ({members.length})
            </h4>
            
            <div className="space-y-2 mt-3">
              {members.map((member) => (
                <div 
                  key={member._id}
                  className="flex items-center justify-between p-2 hover:bg-base-200 rounded-md"
                >
                  <div className="flex items-center gap-2">
                    <img 
                      src={member.profilePic || "/avatar.png"} 
                      alt={member.fullName}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div>
                      <div className="font-medium text-sm">
                        {member.fullName}
                        {member._id === selectedGroup.createdBy && (
                          <span className="ml-2 text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                            Admin
                          </span>
                        )}
                        {member._id === authUser._id && (
                          <span className="ml-2 text-xs bg-base-300 px-1.5 py-0.5 rounded">
                            Você
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-base-content/70">{member.email}</div>
                    </div>
                  </div>
                  
                  {/* Botão para remover (apenas para admin e não a si mesmo) */}
                  {isCreator && member._id !== authUser._id && member._id !== selectedGroup.createdBy && (
                    <button
                      onClick={() => handleRemoveMember(member._id)}
                      className="btn btn-ghost btn-xs text-error"
                      title="Remover do grupo"
                    >
                      Remover
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t border-base-300">
          {isCreator ? (
            <button
              onClick={handleDeleteGroup}
              className="btn btn-error w-full gap-2"
            >
              <Trash2 size={18} />
              Excluir Grupo
            </button>
          ) : (
            <button
              onClick={handleLeaveGroup}
              className="btn btn-outline btn-error w-full gap-2"
            >
              <LogOut size={18} />
              Sair do Grupo
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupInfoModal;