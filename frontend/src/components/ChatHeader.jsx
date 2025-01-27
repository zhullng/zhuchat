import { X } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { onlineUsers } = useAuthStore();

  return (
    <div className="p-2.5 border-b border-base-300 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="avatar">
          <div className="size-10 rounded-full relative">
            <img
              src={selectedUser.profilePic || "/avatar.png"}
              alt={selectedUser.fullName}
              className="w-10 h-10 object-cover rounded-full"
            />
          </div>
        </div>

        {/* User info */}
        <div>
          <h3 className="font-medium text-sm sm:text-base">{selectedUser.fullName}</h3>
          <p className="text-xs sm:text-sm text-base-content/70">
            {onlineUsers.includes(selectedUser._id) ? "Online" : "Offline"}
          </p>
        </div>
      </div>

      {/* Close button */}
      <button onClick={() => setSelectedUser(null)} className="sm:hidden">
        <X />
      </button>
    </div>
  );
};

export default ChatHeader;
