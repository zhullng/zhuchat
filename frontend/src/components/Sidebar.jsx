// Sidebar.jsx
import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users } from "lucide-react";

const Sidebar = () => {
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    getUsers();
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [getUsers]);

  const filteredUsers = showOnlineOnly
    ? users.filter((user) => onlineUsers.includes(user._id))
    : users;

  if (isUsersLoading) return <SidebarSkeleton />;

  return (
    <aside className="h-full w-full lg:w-72 border-r border-base-300 flex flex-col">
      {/* Header */}
      <div className="border-b border-base-300 p-4">
        <div className="flex items-center gap-2">
          <Users className="size-6" />
          <span className="font-medium">Contacts</span>
        </div>
        
        {/* Mobile-friendly controls */}
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showOnlineOnly}
                onChange={(e) => setShowOnlineOnly(e.target.checked)}
                className="toggle toggle-sm"
              />
              <span className="text-sm">Online</span>
            </label>
            <span className="text-sm text-base-content/60">
              {onlineUsers.length} online
            </span>
          </div>
        </div>
      </div>

      {/* Contacts List */}
      <div className="overflow-y-auto flex-1 p-2">
        {filteredUsers.map((user) => (
          <button
            key={user._id}
            onClick={() => setSelectedUser(user)}
            className={`
              w-full flex items-center gap-3 p-3 rounded-lg
              hover:bg-base-200 transition-colors
              ${selectedUser?._id === user._id ? "bg-base-300" : ""}
            `}
          >
            {/* Avatar with status indicator */}
            <div className="relative">
              <img
                src={user.profilePic || "/avatar.png"}
                alt={user.name}
                className="size-12 object-cover rounded-full border-2 border-primary"
              />
              {onlineUsers.includes(user._id) && (
                <div className="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full border-2 border-base-100" />
              )}
            </div>

            {/* User info - Always visible */}
            <div className="flex-1 text-left min-w-0">
              <div className="font-medium truncate">{user.fullName}</div>
              <div className={`text-sm ${
                onlineUsers.includes(user._id) 
                  ? "text-green-500" 
                  : "text-base-content/60"
              }`}>
                {onlineUsers.includes(user._id) ? "Online" : "Offline"}
              </div>
            </div>
          </button>
        ))}

        {filteredUsers.length === 0 && (
          <div className="text-center text-base-content/60 p-4">
            No contacts found
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;