// components/ChatHeader.jsx
import { X } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { onlineUsers } = useAuthStore();

  // Verifica se o user selecionado é um assistente AI
  const isAI = selectedUser?.isAI;

  return (
    <div className="p-2.5 border-b border-base-300 bg-base-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar */}
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

          {/* User info */}
          <div>
            <h3 className="font-medium">{isAI ? "Assistente AI" : selectedUser.fullName}</h3>
            <p className="text-sm text-base-content/70">
              {isAI ? "Sempre Online" : onlineUsers.includes(selectedUser._id) ? "Online" : "Offline"}
            </p>
          </div>
        </div>

        {/* Close button */}
        <button 
          onClick={() => setSelectedUser(null)} 
          className="btn btn-ghost btn-sm btn-circle"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;