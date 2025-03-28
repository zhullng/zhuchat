// Importação do UserItem (separado em componente próprio)
import UserItem from "./UserItem";
import { useEffect, useState, useCallback, useRef } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { Users, Bot, UserPlus, X, Check, XCircle } from "lucide-react";
import { debounce } from "lodash";

// Modificações no componente Sidebar

// Adicione isso nas destructuring props do useChatStore:
const { 
  getUsers, 
  users, 
  selectedUser, 
  setSelectedUser,
  conversations,
  unreadCounts, 
  markConversationAsRead, 
  subscribeToMessages,
  unsubscribeFromMessages,
  removeContact,
  getConversations,
  blockUser // Nova função para bloquear usuários
} = useChatStore();

// Adicione essa função de bloqueio no componente Sidebar
const handleBlockUser = async (userId) => {
  try {
    const success = await blockUser(userId);
    if (success && selectedUser?._id === userId) {
      // Se o utilizador bloqueado estava selecionado, limpa a seleção
      setSelectedUser(null);
    }
  } catch (error) {
    // Erro já é tratado na função blockUser
  }
};

// Função para lidar com clique no utilizador
const handleUserClick = (user) => {
  if (!user) return;
  
  // Fechar o swipe de todos os itens abertos antes de mudar de usuário
  document.querySelectorAll('[id^="user-item-"]').forEach(element => {
    element.style.transform = 'translateX(0)';
  });
  document.querySelectorAll('[id^="delete-btn-"]').forEach(element => {
    element.style.opacity = '0';
  });
  
  // Definir o usuário selecionado
  setSelectedUser(user);
  
  // Forçar marcação como lida imediatamente se houver mensagens não lidas
  if (user._id !== 'ai-assistant' && unreadCounts[user._id] > 0) {
    markConversationAsRead(user._id);
  }
};

// Atualização da renderização de usuários no Sidebar
{sortedUsers.map((user) => {
  const hasUnread = unreadCounts && unreadCounts[user._id] > 0;
  const conv = conversations?.find(c => c?.participants?.includes(user._id));
  const isOnline = (onlineUsers || []).includes(user._id);
  
  return (
    <UserItem 
      key={user._id}
      user={user}
      onUserClick={handleUserClick}
      isSelected={selectedUser?._id === user._id}
      hasUnread={hasUnread}
      unreadCount={unreadCounts[user._id] || 0}
      conv={conv}
      isOnline={isOnline}
      authUser={authUser}
      onRemove={handleRemoveContact}
      onBlock={handleBlockUser}
    />
  );
})}