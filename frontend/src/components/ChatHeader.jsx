// ChatHeader.jsx
import { X } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { onlineUsers } = useAuthStore();

  return (
    <div className="p-1.5 sm:p-2.5 border-b border-base-300">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="avatar">
            <div className="size-6 sm:size-10 rounded-full relative">
              <img 
                src={selectedUser.profilePic || "/avatar.png"} 
                alt={selectedUser.fullName}
                className="object-cover w-full h-full"
              />
            </div>
          </div>
          <div>
            <h3 className="font-medium text-xs sm:text-base">{selectedUser.fullName}</h3>
            <p className="text-[10px] sm:text-sm text-base-content/70">
              {onlineUsers.includes(selectedUser._id) ? "Online" : "Offline"}
            </p>
          </div>
        </div>
        <button 
          onClick={() => setSelectedUser(null)}
          className="btn btn-ghost btn-xs sm:btn-sm p-1"
        >
          <X className="size-3 sm:size-4" />
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;