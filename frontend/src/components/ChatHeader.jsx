import React, { useState } from 'react';
import { X, Search } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { onlineUsers } = useAuthStore();

  const [searchTerm, setSearchTerm] = useState('');

  const isAI = selectedUser?.isAI;
  const isUserOnline = onlineUsers.includes(selectedUser?._id);

  const handleSearch = () => {
    // Lógica de pesquisa será implementada no componente de chat
    console.log('Pesquisando:', searchTerm);
  };

  return (
    <div className="p-2.5 border-b border-base-300 bg-base-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="avatar">
            <div className="size-10 rounded-full relative">
              {isAI ? (
                <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-600">
                  <span className="font-bold">AI</span>
                </div>
              ) : (
                <img
                  src={selectedUser.profilePic || "/avatar.png"}
                  alt={selectedUser.fullName}
                  className="object-cover"
                />
              )}
            </div>
          </div>

          <div>
            <h3 className="font-medium">{isAI ? "Assistente AI" : selectedUser.fullName}</h3>
            <p className="text-sm text-base-content/70">
              {isAI ? "Sempre Online" : isUserOnline ? "Online" : "Offline"}
            </p>
          </div>

          {/* Adicionar campo de pesquisa */}
          <div className="ml-4 flex items-center">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Pesquisar mensagens..." 
                className="input input-sm input-bordered pr-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
              <button 
                onClick={handleSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
              >
                <Search size={16} />
              </button>
            </div>
          </div>
        </div>

        <button 
          onClick={() => setSelectedUser(null)} 
          className="btn btn-ghost btn-sm btn-circle"
          title="Fechar chat"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;