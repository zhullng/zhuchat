import React from 'react';
import { X, Search } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import GlobalSearch from "./GlobalSearch";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { onlineUsers } = useAuthStore();

  const isAI = selectedUser?.isAI;
  const isUserOnline = onlineUsers.includes(selectedUser?._id);

  return (
    <div className="p-2.5 border-b border-base-300 bg-base-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setSelectedUser(null)} 
            className="btn btn-ghost btn-sm btn-circle mr-2"
            title="Fechar chat"
          >
            <X size={18} />
          </button>

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
        </div>

        {/* Área de pesquisa global */}
        <GlobalSearch />
      </div>
    </div>
  );
};

export default ChatHeader;