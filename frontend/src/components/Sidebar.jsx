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

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  const handleSearchChange = debounce((query) => {
    setSearchQuery(query);
  }, 300);

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
    <aside className="h-full w-full lg:w-80 border-r border-base-300 flex flex-col">
      <div className="border-b border-base-300 w-full p-2 lg:p-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 lg:w-6 lg:h-6" />
          <span className="font-medium text-sm lg:text-base hidden lg:block">Contacts</span>
        </div>
        
        <div className="mt-2 lg:mt-3">
          <input
            type="text"
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search..."
            className="input input-sm w-full bg-base-200 lg:bg-base-300 focus:outline-none focus:ring-1 focus:ring-primary text-xs lg:text-sm"
          />
        </div>

        <div className="mt-2 flex items-center gap-2 justify-between">
          <label className="cursor-pointer flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={showOnlineOnly}
              onChange={(e) => setShowOnlineOnly(e.target.checked)}
              className="checkbox checkbox-xs lg:checkbox-sm"
            />
            <span className="text-xs lg:text-sm">Show online only</span>
          </label>
          <span className="text-xs text-base-content/50">({onlineUsers.length - 1} online)</span>
        </div>
      </div>

      <div className="overflow-y-auto w-full px-1 lg:px-2 py-1">
        {filteredUsers.length > 0 ? (
          filteredUsers.map((user) => (
            <button
              key={user._id}
              onClick={() => setSelectedUser(user)}
              className={`w-full p-2 lg:p-3 flex items-center gap-2 lg:gap-3 rounded-lg hover:bg-base-200 transition-all
                ${selectedUser?._id === user._id ? "bg-base-300 ring-1 ring-base-300" : ""}`}
            >
              <div className="relative">
                <img
                  src={user.profilePic || "/avatar.png"}
                  alt={user.name}
                  className="size-8 lg:size-12 object-cover rounded-full"
                />
                {onlineUsers.includes(user._id) && (
                  <span className="absolute bottom-0 right-0 w-2 h-2 lg:w-3 lg:h-3 bg-green-500 rounded-full ring-1 lg:ring-2 ring-base-100" />
                )}
              </div>
              <div className="hidden lg:block text-left min-w-0 flex-1">
                <div className="font-medium text-sm truncate">{user.fullName}</div>
                <div className="text-xs text-base-content/60">
                  {onlineUsers.includes(user._id) ? "Online" : "Offline"}
                </div>
              </div>
            </button>
          ))
        ) : (
          <div className="text-center text-base-content/50 text-sm py-3">No users found</div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;