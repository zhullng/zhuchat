// components/GroupTab.jsx
import { useState } from "react";
import { useGroupStore } from "../store/useGroupStore";
import { Users, UsersPlus } from "lucide-react";
import GroupItem from "./GroupItem";

const GroupTab = ({ searchQuery, onCreateGroup }) => {
  const { groups, selectedGroup, unreadGroupCounts } = useGroupStore();

  // Filtrar grupos com base na pesquisa
  const filteredGroups = groups.filter(group => 
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Ordenar por não lidos primeiro, depois por mais recentes
  const sortedGroups = [...filteredGroups].sort((a, b) => {
    const hasUnreadA = unreadGroupCounts[a._id] > 0;
    const hasUnreadB = unreadGroupCounts[b._id] > 0;
    
    if (hasUnreadA && !hasUnreadB) return -1;
    if (!hasUnreadA && hasUnreadB) return 1;
    
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return (
    <>
      {sortedGroups.length > 0 ? (
        sortedGroups.map(group => (
          <GroupItem 
            key={group._id}
            group={group}
            isSelected={selectedGroup?._id === group._id}
            hasUnread={unreadGroupCounts[group._id] > 0}
            unreadCount={unreadGroupCounts[group._id] || 0}
          />
        ))
      ) : (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="mb-3">
            <Users size={48} className="mx-auto opacity-40" />
          </div>
          <p className="mb-2">Você ainda não participa de nenhum grupo</p>
          <button 
            onClick={onCreateGroup}
            className="btn btn-sm btn-primary mt-2"
          >
            <UsersPlus size={16} />
            Criar Novo Grupo
          </button>
        </div>
      )}
    </>
  );
};

export default GroupTab;