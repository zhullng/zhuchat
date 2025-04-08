import { useState } from "react";
import { X, Users, UserPlus, Settings, Search } from "lucide-react";
import { useGroupStore } from "../store/useGroupStore";
import { useAuthStore } from "../store/useAuthStore";
import GroupInfoModal from "./GroupInfoModal";
import AddGroupMembersModal from "./AddGroupMembersModal";
import EditGroupModal from "./EditGroupModal";
import GroupGlobalSearch from "./GroupGlobalSearch";

const GroupChatHeader = ({ isMobile = false, onBack }) => {
  const { selectedGroup, selectGroup } = useGroupStore();
  const { authUser } = useAuthStore();
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const isCreator = selectedGroup?.createdBy === authUser._id;
  const memberCount = selectedGroup?.members?.length || 0;

  // Função para voltar, para dispositivos móveis
  const handleBack = () => {
    if (onBack && typeof onBack === 'function') {
      onBack();
    } else {
      selectGroup(null);
    }
  };

  return (
    <>
      <div className="p-2.5 border-b border-base-300 bg-base-100 transition-all duration-200">
        {/* Cabeçalho principal - mostrado quando a pesquisa não está ativa */}
        {!showSearch ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isMobile && (
                <button 
                  onClick={handleBack} 
                  className="btn btn-ghost btn-sm btn-circle mr-1"
                >
                  <X size={18} />
                </button>
              )}
              
              <div className="avatar">
                <div className="size-10 rounded-full relative">
                  {selectedGroup?.profilePic ? (
                    <img
                      src={selectedGroup.profilePic}
                      alt={selectedGroup.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-base-200">
                      <Users className="size-5" />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-medium">{selectedGroup?.name}</h3>
                <p className="text-sm text-base-content/70">
                  {memberCount} {memberCount === 1 ? 'membro' : 'membros'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 relative">
              {/* Botão de pesquisa */}
              <button 
                onClick={() => setShowSearch(true)}
                className="btn btn-ghost btn-sm btn-circle"
                title="Pesquisar mensagens"
              >
                <Search size={18} />
              </button>
              
              {/* Botão de Settings */}
              <button 
                onClick={() => setShowInfoModal(true)}
                className="btn btn-ghost btn-sm btn-circle"
                title="Informações do grupo"
              >
                <Settings size={18} />
              </button>
              
              {isCreator && (
                <button 
                  onClick={() => setShowAddMembersModal(true)}
                  className="btn btn-ghost btn-sm btn-circle"
                  title="Adicionar membros"
                >
                  <UserPlus size={18} />
                </button>
              )}
              
              {!isMobile && (
                <button 
                  onClick={() => selectGroup(null)} 
                  className="btn btn-ghost btn-sm btn-circle"
                  title="Fechar"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>
        ) : (
          // Componente de pesquisa - mostrado quando a pesquisa está ativa
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSearch(false)}
              className="btn btn-ghost btn-sm btn-circle flex-shrink-0"
              title="Voltar"
            >
              <X size={18} />
            </button>
            
            <div className="flex-grow max-w-full">
              <GroupGlobalSearch />
            </div>
          </div>
        )}
      </div>
      
      {showInfoModal && (
        <GroupInfoModal 
          isOpen={showInfoModal} 
          onClose={() => setShowInfoModal(false)}
          onEdit={isCreator ? () => {
            setShowInfoModal(false);
            setShowEditModal(true);
          } : undefined}
        />
      )}
      
      {showAddMembersModal && (
        <AddGroupMembersModal 
          isOpen={showAddMembersModal} 
          onClose={() => setShowAddMembersModal(false)} 
        />
      )}
      
      {showEditModal && (
        <EditGroupModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </>
  );
};

export default GroupChatHeader;