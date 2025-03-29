import { useState, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { UserPlus, Users, Settings, X, LogOut, Edit, Trash, UserMinus } from "lucide-react";

const GroupDetail = ({ group, onLeaveGroup }) => {
  const { users, addMemberToGroup, leaveGroup, removeUserFromGroup, updateGroupName, deleteGroup } = useChatStore();
  const { authUser } = useAuthStore();
  const [showMembers, setShowMembers] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [showEditName, setShowEditName] = useState(false);
  const [newGroupName, setNewGroupName] = useState(group?.name || "");

  // Verificar se o usuário atual é o admin do grupo
  const isAdmin = group?.adminId === authUser?._id;
  
  // Buscar detalhes dos membros
  const members = group?.members?.map(memberId => {
    return users.find(user => user._id === memberId) || { _id: memberId, fullName: "Utilizador desconhecido" };
  }) || [];

  // Atualizar o nome do grupo quando mudar
  useEffect(() => {
    setNewGroupName(group?.name || "");
  }, [group?.name]);

  // Adicionar membro ao grupo
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMemberEmail.trim()) return;
    
    setIsAddingMember(true);
    try {
      await addMemberToGroup(group._id, newMemberEmail);
      setNewMemberEmail("");
    } catch (error) {
      console.error("Erro ao adicionar membro:", error);
    } finally {
      setIsAddingMember(false);
    }
  };

  // Remover usuário do grupo
  const handleRemoveMember = async (memberId) => {
    try {
      await removeUserFromGroup(group._id, memberId);
    } catch (error) {
      console.error("Erro ao remover membro:", error);
    }
  };

  // Sair do grupo
  const handleLeaveGroup = async () => {
    try {
      await leaveGroup(group._id);
      if (onLeaveGroup) onLeaveGroup();
    } catch (error) {
      console.error("Erro ao sair do grupo:", error);
    }
  };

  // Deletar grupo
  const handleDeleteGroup = async () => {
    if (window.confirm(`Tem certeza que deseja excluir o grupo "${group.name}"? Esta ação não pode ser desfeita.`)) {
      try {
        await deleteGroup(group._id);
        if (onLeaveGroup) onLeaveGroup();
      } catch (error) {
        console.error("Erro ao excluir grupo:", error);
      }
    }
  };

  // Atualizar nome do grupo
  const handleUpdateGroupName = async () => {
    if (newGroupName.trim() === "") return;
    if (newGroupName === group.name) {
      setShowEditName(false);
      return;
    }

    try {
      await updateGroupName(group._id, newGroupName);
      setShowEditName(false);
    } catch (error) {
      console.error("Erro ao atualizar nome do grupo:", error);
    }
  };

  return (
    <div className="bg-base-100 rounded-lg">
      {/* Cabeçalho do grupo */}
      <div className="p-3 flex items-center justify-between">
        {showEditName ? (
          <div className="flex gap-2 items-center flex-1">
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="input input-bordered input-sm flex-1"
              placeholder="Nome do grupo"
              autoFocus
            />
            <button 
              onClick={handleUpdateGroupName}
              className="btn btn-sm btn-primary"
            >
              Salvar
            </button>
            <button 
              onClick={() => setShowEditName(false)}
              className="btn btn-sm btn-ghost"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Users className="text-primary" />
            <h3 className="font-medium">
              {group?.name || "Grupo"}
            </h3>
            {isAdmin && (
              <button 
                onClick={() => setShowEditName(true)}
                className="btn btn-xs btn-ghost btn-circle"
                title="Editar nome"
              >
                <Edit size={14} />
              </button>
            )}
          </div>
        )}
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowMembers(!showMembers)}
            className="btn btn-sm btn-ghost gap-1"
            title="Ver membros"
          >
            <Users size={16} />
            <span className="text-xs">{members.length}</span>
          </button>
          
          {isAdmin && (
            <button
              onClick={() => setShowManage(!showManage)}
              className="btn btn-sm btn-ghost"
              title="Gerenciar grupo"
            >
              <Settings size={16} />
            </button>
          )}
          
          {!isAdmin && (
            <button
              onClick={handleLeaveGroup}
              className="btn btn-sm btn-ghost btn-error"
              title="Sair do grupo"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
      
      {/* Lista de membros */}
      {showMembers && (
        <div className="p-3 border-t border-base-200">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium">Membros do Grupo</h4>
            
            {isAdmin && (
              <form onSubmit={handleAddMember} className="flex gap-1">
                <input
                  type="email"
                  placeholder="Email do novo membro"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className="input input-bordered input-xs w-40 lg:w-auto"
                />
                <button 
                  type="submit" 
                  className="btn btn-xs btn-primary"
                  disabled={isAddingMember}
                >
                  <UserPlus size={14} />
                </button>
              </form>
            )}
          </div>
          
          <div className="max-h-60 overflow-y-auto">
            {members.map(member => (
              <div key={member._id} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full overflow-hidden">
                    <img
                      src={member.profilePic || "/avatar.png"}
                      alt={member.fullName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="text-sm font-medium">
                      {member.fullName}
                      {member._id === group.adminId && (
                        <span className="text-xs text-primary ml-1">(Admin)</span>
                      )}
                      {member._id === authUser._id && (
                        <span className="text-xs text-secondary ml-1">(Você)</span>
                      )}
                    </div>
                    <div className="text-xs text-base-content/70">{member.email}</div>
                  </div>
                </div>
                
                {isAdmin && member._id !== authUser._id && (
                  <button
                    onClick={() => handleRemoveMember(member._id)}
                    className="btn btn-xs btn-ghost text-error"
                    title="Remover do grupo"
                  >
                    <UserMinus size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Opções de gerenciamento (apenas para admin) */}
      {showManage && isAdmin && (
        <div className="p-3 border-t border-base-200">
          <h4 className="text-sm font-medium mb-2">Gerenciar Grupo</h4>
          
          <div className="space-y-2">
            <button 
              onClick={handleLeaveGroup}
              className="btn btn-sm btn-outline btn-block justify-start"
            >
              <LogOut size={16} />
              <span>Sair do grupo</span>
            </button>
            
            <button 
              onClick={handleDeleteGroup}
              className="btn btn-sm btn-error btn-block justify-start"
            >
              <Trash size={16} />
              <span>Excluir grupo</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupDetail;