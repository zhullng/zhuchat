// components/GroupItem.jsx
import { useState } from "react";
import { Users, MoreVertical, Settings, LogOut, Trash2 } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useGroupStore } from "../store/useGroupStore";
import { useChatStore } from "../store/useChatStore";
import ConfirmationModal from "./ConfirmationModal";

const GroupItem = ({ group, isSelected, hasUnread, unreadCount, onSelect }) => {
  const { authUser } = useAuthStore();
  const { selectGroup, leaveGroup, deleteGroup } = useGroupStore();
  const { selectedUser, setSelectedUser } = useChatStore();
  const [showMenu, setShowMenu] = useState(false);
  
  // Estados para o modal de confirmação
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmConfig, setConfirmConfig] = useState({
    title: "",
    message: "",
    confirmText: "Confirmar",
    variant: "primary"
  });

  // Verificar se o usuário logado é o criador do grupo
  const isCreator = group.createdBy === authUser._id;

  // Manipular clique no grupo
  const handleGroupClick = () => {
    // Limpar qualquer usuário selecionado
    if (selectedUser) {
      setSelectedUser(null);
    }
    
    // Selecionar o grupo
    selectGroup(group);
    
    // Chamar callback adicional se fornecido
    if (onSelect) {
      onSelect(group);
    }
  };

  // Manipular saída do grupo
  const handleLeaveGroup = async (e) => {
    e.stopPropagation(); // Impedir que o clique propague para o item do grupo
    setShowMenu(false); // Fechar o menu dropdown
    
    try {
      if (showConfirmation) {
        setShowConfirmation(false);
        await leaveGroup(group._id);
      } else {
        setConfirmConfig({
          title: "Sair do grupo",
          message: `Tem certeza que deseja sair do grupo "${group.name}"?`,
          confirmText: "Sair",
          variant: "warning"
        });
        
        setConfirmAction(() => () => handleLeaveGroup(e));
        setShowConfirmation(true);
      }
    } catch (error) {
      console.error("Erro ao sair do grupo:", error);
    }
  };

  // Manipular exclusão do grupo
  const handleDeleteGroup = async (e) => {
    e?.stopPropagation(); // Impedir que o clique propague
    setShowMenu(false); // Fechar o menu dropdown
    
    try {
      if (showConfirmation) {
        setShowConfirmation(false);
        await deleteGroup(group._id);
      } else {
        setConfirmConfig({
          title: "Excluir grupo",
          message: `Tem certeza que deseja excluir o grupo "${group.name}"? Esta ação não pode ser desfeita e todas as mensagens serão perdidas.`,
          confirmText: "Excluir",
          variant: "error"
        });
        
        setConfirmAction(() => () => handleDeleteGroup(e));
        setShowConfirmation(true);
      }
    } catch (error) {
      console.error("Erro ao excluir grupo:", error);
    }
  };

  return (
    <>
      <div
        onClick={handleGroupClick}
        className={`
          w-full flex items-center gap-3 p-2 lg:p-3 rounded-lg
          transition-colors mb-1 relative cursor-pointer
          ${isSelected ? "bg-base-300 ring-1 ring-base-300" : "hover:bg-base-200"}
        `}
      >
        <div className="relative">
          {group.profilePic ? (
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full overflow-hidden border border-base-300">
              <img 
                src={group.profilePic} 
                alt={group.name} 
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-10 h-10 lg:w-12 lg:h-12 flex items-center justify-center rounded-full border border-base-300 bg-base-200">
              <Users className="size-6" />
            </div>
          )}
          
          {hasUnread && (
            <span className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="font-medium truncate">{group.name}</div>
          <div className="text-xs text-base-content/60 truncate">
            {group.members?.length || 0} membros
          </div>
        </div>

        {/* Menu de opções */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="btn btn-ghost btn-xs btn-circle hover:bg-base-300"
          >
            <MoreVertical size={16} />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 mt-1 bg-base-100 shadow-md rounded-md border z-10 whitespace-nowrap">
              {isCreator ? (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      // Aqui você pode implementar uma função para ir para configurações do grupo
                    }}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-base-200 w-full text-left"
                  >
                    <Settings size={16} />
                    <span>Configurações</span>
                  </button>
                  <hr className="border-base-300" />
                  <button
                    onClick={(e) => handleDeleteGroup(e)}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-base-200 w-full text-left text-error"
                  >
                    <Trash2 size={16} />
                    <span>Excluir grupo</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={(e) => handleLeaveGroup(e)}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-base-200 w-full text-left text-error"
                >
                  <LogOut size={16} />
                  <span>Sair do grupo</span>
                </button>
              )}
            </div>
          )}
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

export default GroupItem;