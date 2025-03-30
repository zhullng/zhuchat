// src/components/GroupChatHeader.jsx
import { useState } from "react";
import { X, Users, Info, Settings, UserPlus, Phone, Video } from "lucide-react";
import { useGroupStore } from "../store/useGroupStore";
import { useAuthStore } from "../store/useAuthStore";
import GroupInfoModal from "./GroupInfoModal";
import AddGroupMembersModal from "./AddGroupMembersModal";

const GroupChatHeader = () => {
  const { selectedGroup, selectGroup } = useGroupStore();
  const { authUser } = useAuthStore();
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [showCallDisabledTooltip, setShowCallDisabledTooltip] = useState(false);

  const isCreator = selectedGroup?.createdBy === authUser._id;
  const memberCount = selectedGroup?.members?.length || 0;

  const handleGroupCallButton = () => {
    setShowCallDisabledTooltip(true);
    setTimeout(() => setShowCallDisabledTooltip(false), 3000);
  };

  return (
    <>
      <div className="p-2.5 border-b border-base-300 bg-base-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
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
            <button 
              onClick={handleGroupCallButton}
              className="btn btn-ghost btn-sm btn-circle opacity-50"
              title="Chamada de voz em grupo (em breve)"
            >
              <Phone size={18} />
            </button>
            
            <button 
              onClick={handleGroupCallButton}
              className="btn btn-ghost btn-sm btn-circle opacity-50"
              title="Videochamada em grupo (em breve)"
            >
              <Video size={18} />
            </button>
            
            {showCallDisabledTooltip && (
              <div className="absolute top-full right-0 mt-2 bg-base-300 text-sm p-2 rounded-md z-10 w-60">
                Chamadas em grupo estarão disponíveis em breve!
              </div>
            )}
            
            <button 
              onClick={() => setShowInfoModal(true)}
              className="btn btn-ghost btn-sm btn-circle"
              title="Informações do grupo"
            >
              <Info size={18} />
            </button>
            
            {isCreator && (
              <>
                <button 
                  onClick={() => setShowAddMembersModal(true)}
                  className="btn btn-ghost btn-sm btn-circle"
                  title="Adicionar membros"
                >
                  <UserPlus size={18} />
                </button>
                <button 
                  className="btn btn-ghost btn-sm btn-circle"
                  title="Configurações do grupo"
                >
                  <Settings size={18} />
                </button>
              </>
            )}
            
            <button 
              onClick={() => selectGroup(null)} 
              className="btn btn-ghost btn-sm btn-circle"
              title="Fechar"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>
      
      {showInfoModal && (
        <GroupInfoModal 
          isOpen={showInfoModal} 
          onClose={() => setShowInfoModal(false)} 
        />
      )}
      
      {showAddMembersModal && (
        <AddGroupMembersModal 
          isOpen={showAddMembersModal} 
          onClose={() => setShowAddMembersModal(false)} 
        />
      )}
    </>
  );
};

export default GroupChatHeader;