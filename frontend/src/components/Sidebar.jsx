// Sidebar.jsx
import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users } from "lucide-react";
import { debounce } from "lodash";

const Sidebar = () => {
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobile, setIsMobile] = useState(false);

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

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    if(isMobile) document.body.classList.add('chat-open');
  };

  const filteredUsers = (users || []).filter((user) => {
    if (!user) return false;
    const isOnline = showOnlineOnly ? onlineUsers.includes(user._id) : true;
    const matchesSearch =
      user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchQuery.toLowerCase());
    return isOnline && matchesSearch;
  });

  if (isUsersLoading) return <SidebarSkeleton />;

  return (
    <aside className={`h-full w-full lg:w-80 border-r border-base-300 flex flex-col 
      ${isMobile && selectedUser ? 'hidden' : 'block'}`}>
      
      <div className="border-b border-base-300 w-full p-4">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-6 h-6" />
          <span className="font-medium">Contacts</span>
        </div>
        
        <input
          type="text"
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search..."
          className="input input-bordered w-full mb-3"
        />
        
        <div className="flex items-center gap-2 text-sm">
          <label className="cursor-pointer flex items-center gap-2">
            <input
              type="checkbox"
              checked={showOnlineOnly}
              onChange={(e) => setShowOnlineOnly(e.target.checked)}
              className="toggle toggle-sm"
            />
            <span>Show online only</span>
          </label>
          <span className="badge badge-ghost">{onlineUsers.length - 1} online</span>
        </div>
      </div>

      <div className="overflow-y-auto flex-1 p-2">
        {filteredUsers.map((user) => (
          <button
            key={user._id}
            onClick={() => handleUserSelect(user)}
            className={`w-full flex items-center gap-3 p-3 rounded-lg hover:bg-base-200 transition-colors
              ${selectedUser?._id === user._id ? "bg-base-300" : ""}`}
          >
            <div className="relative">
              <img
                src={user.profilePic || "/avatar.png"}
                alt={user.fullName}
                className="size-12 rounded-full object-cover"
              />
              {onlineUsers.includes(user._id) && (
                <div className="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full border-2 border-base-100" />
              )}
            </div>
            <div className="text-left">
              <div className="font-medium">{user.fullName}</div>
              <div className="text-sm text-base-content/60">
                {onlineUsers.includes(user._id) ? 'Online' : 'Offline'}
              </div>
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
};

export default Sidebar;