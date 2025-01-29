import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users } from "lucide-react";
import { debounce } from "lodash";

const Sidebar = () => {
  const {
    getUsers,
    users,
    selectedUser,
    setSelectedUser,
    isUsersLoading
  } = useChatStore();
  
  const { onlineUsers } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection and resize handler
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      
      // Force UI update when resizing with selected user
      if (selectedUser && mobile) {
        document.body.classList.add('chat-active');
      }
    };

    getUsers();
    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [getUsers, selectedUser]);

  // Search with debounce
  const handleSearch = debounce((query) => {
    setSearchQuery(query.toLowerCase());
  }, 300);

  // User selection handler
  const selectUser = (user) => {
    setSelectedUser(user);
    if(isMobile) {
      document.body.classList.add('chat-active');
      document.body.classList.remove('sidebar-active');
    }
  };

  // Filtered users list
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.fullName.toLowerCase().includes(searchQuery) ||
                         user.username?.toLowerCase().includes(searchQuery);
    const isOnline = !showOnlineOnly || onlineUsers.includes(user._id);
    return matchesSearch && isOnline;
  });

  if (isUsersLoading) return <SidebarSkeleton />;

  return (
    <aside className={`sidebar-container w-full lg:w-80 h-full border-r border-base-300
      ${isMobile && selectedUser ? 'hidden' : 'block'}`}>

      {/* Header Section */}
      <div className="border-b border-base-300 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" />
          <h1 className="text-lg font-semibold">Contacts</h1>
        </div>

        {/* Search Input */}
        <input
          type="text"
          placeholder="Search..."
          onChange={(e) => handleSearch(e.target.value)}
          className="input input-bordered input-sm w-full bg-base-200"
        />

        {/* Online Filter */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlineOnly}
              onChange={(e) => setShowOnlineOnly(e.target.checked)}
              className="toggle toggle-sm toggle-primary"
            />
            <span className="text-sm">Show online only</span>
          </label>
          <span className="badge badge-primary badge-sm">
            {onlineUsers.length} online
          </span>
        </div>
      </div>

      {/* Users List */}
      <div className="overflow-y-auto flex-1 p-2">
        {filteredUsers.map(user => (
          <button
            key={user._id}
            onClick={() => selectUser(user)}
            className={`flex items-center gap-3 w-full p-2 rounded-lg transition-colors
              ${selectedUser?._id === user._id 
                ? 'bg-base-300' 
                : 'hover:bg-base-200'}`}
          >
            {/* User Avatar */}
            <div className="relative">
              <img
                src={user.profilePic || "/avatar.png"}
                alt={user.fullName}
                className="size-12 rounded-full object-cover border-2 border-primary"
              />
              {onlineUsers.includes(user._id) && (
                <div className="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full border-2 border-base-100" />
              )}
            </div>

            {/* User Info */}
            <div className="text-left flex-1">
              <h3 className="font-medium truncate">{user.fullName}</h3>
              <p className={`text-sm ${
                onlineUsers.includes(user._id) 
                  ? 'text-green-500' 
                  : 'text-base-content/70'
              }`}>
                {onlineUsers.includes(user._id) ? 'Online' : 'Offline'}
              </p>
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
};

export default Sidebar;