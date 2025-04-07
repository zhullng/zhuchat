// components/GroupInfoModal.jsx
import { useState } from "react";
import { X, Users, LogOut, Trash2 } from "lucide-react";
import { useGroupStore } from "../store/useGroupStore";
import { useAuthStore } from "../store/useAuthStore";
import ConfirmationModal from "./ConfirmationModal";

const GroupInfoModal = ({ isOpen, onClose }) => {
  const { selectedGroup, leaveGroup, deleteGroup, removeGroupMember } = useGroupStore();
  const { authUser } = useAuthStore();
  
  // Estados para o modal de confirmação
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmConfig, setConfirmConfig] = useState({
    title: "",
    message: "",
    confirmText: "Confirmar",
    variant: "primary"
  });
  
  // Estado para armazenar o ID do membro a ser removido
  const [currentMemberId, setCurrentMemberId] = useState(null);
  
  // Verificar se o usuário logado é o criador do grupo
  const isCreator = selectedGroup?.createdBy === authUser._id;
  
  // Lista de membros formatada
  const members = selectedGroup?.members || [];

  const handleLeaveGroup = async () => {
    try {
      if (showConfirmation) {
        setShowConfirmation(false);
        await leaveGroup(selectedGroup._id);
        onClose(); // Fechar modal após sair
      } else {
        setConfirmConfig({
          title: "Sair do grupo",
          message: `Tem certeza que deseja sair do grupo "${selectedGroup.name}"?`,
          confirmText: "Sair",
          variant: "warning"
        });
        
        setConfirmAction(() => () => handleLeaveGroup());
        setShowConfirmation(true);
      }
    } catch (error) {
      console.error("Erro ao sair do grupo:", error);
    }
  };

  // Função para lidar com exclusão do grupo
  const handleDeleteGroup = async () => {
    try {
      if (showConfirmation) {
        setShowConfirmation(false);
        await deleteGroup(selectedGroup._id);
        onClose(); // Fechar modal após excluir
      } else {
        setConfirmConfig({
          title: "Excluir grupo",
          message: `Tem certeza que deseja excluir o grupo "${selectedGroup.name}"? Esta ação não pode ser desfeita e todas as mensagens serão perdidas.`,
          confirmText: "Excluir",
          variant: "error"
        });
        
        setConfirmAction(() => () => handleDeleteGroup());
        setShowConfirmation(true);
      }
    } catch (error) {
      console.error("Erro ao excluir grupo:", error);
    }
  };

  // Função para remover um membro
  const handleRemoveMember = async (memberId, memberName) => {
    try {
      if (showConfirmation) {
        setShowConfirmation(false);
        await removeGroupMember(selectedGroup._id, currentMemberId);
      } else {
        setCurrentMemberId(memberId);
        
        setConfirmConfig({
          title: "Remover membro",
          message: `Tem certeza que deseja remover ${memberName || 'este membro'} do grupo?`,
          confirmText: "Remover",
          variant: "warning"
        });
        
        setConfirmAction(() => () => handleRemoveMember());
        setShowConfirmation(true);
      }
    } catch (error) {
      console.error("Erro ao remover membro:", error);
    }
  };

  if (!isOpen || !selectedGroup) return null;

  return (
    <>
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
                        onClick={() => handleRemoveMember(member._id, member.fullName)}
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
      
      {/* Modal de confirmação */}
      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={confirmAction}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        variant={confirmConfig.variant}
      />
    </>
  );
};

export default GroupInfoModal;