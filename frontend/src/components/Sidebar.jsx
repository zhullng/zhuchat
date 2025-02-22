import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users, Bot } from "lucide-react";
import { debounce } from "lodash";

const Sidebar = () => {
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  // AI Assistant object
  const aiAssistant = {
    _id: 'ai-assistant',
    fullName: 'AI Assistant',
    isAI: true,
  };

  useEffect(() => {
    getUsers();
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [getUsers]);

  const handleSearchChange = debounce((query) => {
    setSearchQuery(query);
  }, 300);

  const filteredUsers = users.filter((user) => {
    const matchesSearch = user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.username?.toLowerCase().includes(searchQuery.toLowerCase());
    const isOnline = showOnlineOnly ? onlineUsers.includes(user._id) : true;
    return matchesSearch && isOnline;
  });

  if (isUsersLoading) return <SidebarSkeleton />;

  return (
    <aside className={`h-full w-full lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200
      ${isMobile && selectedUser ? 'hidden' : 'block'}`}>
      
      <div className="border-b border-base-300 w-full p-3 lg:p-4">
        <div className="flex items-center gap-2">
          <Users className="size-6" />
          <span className="font-medium">Contacts</span>
        </div>

        <div className="mt-2 lg:mt-3 space-y-2">
          <input
            type="text"
            placeholder="Search contacts..."
            onChange={(e) => handleSearchChange(e.target.value)}
            className="input input-bordered input-sm w-full"
          />

          <div className="flex items-center justify-between">
            <label className="cursor-pointer flex items-center gap-2">
              <input
                type="checkbox"
                checked={showOnlineOnly}
                onChange={(e) => setShowOnlineOnly(e.target.checked)}
                className="toggle toggle-xs lg:toggle-sm"
              />
              <span className="text-xs lg:text-sm">Online only</span>
            </label>
            <span className="text-xs text-base-content/60">
              {onlineUsers.length - 1} online
            </span>
          </div>
        </div>
      </div>

      <div className="overflow-y-auto flex-1 p-1 lg:p-2">
        {/* AI Assistant */}
        <button
          onClick={() => setSelectedUser(aiAssistant)}
          className={`
            w-full flex items-center gap-3 p-2 lg:p-3 rounded-lg
            transition-colors hover:bg-base-200 mb-2
            ${selectedUser?.isAI ? "bg-base-300 ring-1 ring-base-300" : "bg-blue-50 hover:bg-blue-100"}
          `}
        >
          <div className="relative">
            <div className="size-10 lg:size-12 rounded-full border bg-blue-100 flex items-center justify-center">
              <Bot className="text-blue-600 size-6" />
            </div>
            <span className="absolute bottom-0 right-0 size-2.5 lg:size-3 bg-green-500 rounded-full border-2 border-base-100" />
          </div>

          <div className="flex-1 text-left">
            <div className="font-medium truncate text-sm lg:text-base">
              AI Assistant
            </div>
            <div className="text-xs text-green-500">
              Always Online
            </div>
          </div>
        </button>

        {/* Separator */}
        <div className="h-px bg-base-200 my-2" />

        {/* User List */}
        {filteredUsers.map((user) => (
          <button
            key={user._id}
            onClick={() => setSelectedUser(user)}
            className={`
              w-full flex items-center gap-3 p-2 lg:p-3 rounded-lg
              transition-colors hover:bg-base-200
              ${selectedUser?._id === user._id ? "bg-base-300 ring-1 ring-base-300" : ""}
            `}
          >
            <div className="relative">
              <img
                src={user.profilePic || "/avatar.png"}
                alt={user.name}
                className="size-10 lg:size-12 object-cover rounded-full border"
              />
              {onlineUsers.includes(user._id) && (
                <span className="absolute bottom-0 right-0 size-2.5 lg:size-3 bg-green-500 rounded-full border-2 border-base-100" />
              )}
            </div>

            <div className="flex-1 text-left">
              <div className="font-medium truncate text-sm lg:text-base">
                {user.fullName}
              </div>
              <div className={`text-xs ${onlineUsers.includes(user._id) ? "text-green-500" : "text-base-content/60"}`}>
                {onlineUsers.includes(user._id) ? "Online" : "Offline"}
              </div>
            </div>
          </button>
        ))}

        {filteredUsers.length === 0 && (
          <div className="text-center text-base-content/60 p-4">
            {showOnlineOnly ? "No online users" : "No contacts found"}
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;