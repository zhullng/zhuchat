import { X } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { onlineUsers } = useAuthStore();

  // Verifica se o usuário selecionado é um assistente AI
  const isAI = selectedUser?.isAI;

  return (
    <div className="p-2.5 border-b border-base-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="avatar">
            <div className="size-10 rounded-full relative">
              {isAI ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-blue-600">BOT</div> {/* Representação do Bot */}
                </div>
              ) : (
                <img
                  src={selectedUser.profilePic || "/avatar.png"}
                  alt={selectedUser.fullName}
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
        <button onClick={() => setSelectedUser(null)} className="ml-auto">
          <X />
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;
