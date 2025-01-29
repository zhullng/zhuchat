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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
    <>
      <div className="lg:hidden p-4" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
        ☰
      </div>
      <aside className={`h-full w-20 lg:w-80 border-r border-base-300 flex flex-col transition-all duration-200 ${isSidebarOpen ? 'block' : 'hidden lg:block'}`}>
        <div className="border-b border-base-300 w-full p-4 lg:p-5">
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6" />
            <span className="font-medium hidden lg:block">Contacts</span>
          </div>
          <div className="mt-3 hidden lg:block">
            <input
              type="text"
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search..."
              className="input input-sm w-full bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-500"
            />
          </div>
          <div className="mt-3 hidden lg:flex items-center gap-2">
            <label className="cursor-pointer flex items-center gap-2">
              <input
                type="checkbox"
                checked={showOnlineOnly}
                onChange={(e) => setShowOnlineOnly(e.target.checked)}
                className="checkbox checkbox-sm"
              />
              <span className="text-sm">Show online only</span>
            </label>
            <span className="text-xs text-zinc-500">({onlineUsers.length - 1} online)</span>
          </div>
        </div>
        <div className="overflow-y-auto w-full px-4 py-2">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => (
              <button
                key={user._id}
                onClick={() => setSelectedUser(user)}
                className={`w-full p-3 flex items-center gap-3 rounded-lg hover:bg-base-200 transition-all
                  ${selectedUser?._id === user._id ? "bg-base-300 ring-1 ring-base-300" : ""}`}
              >
                <div className="relative mx-auto lg:mx-0">
                  <img
                    src={user.profilePic || "/avatar.png"}
                    alt={user.name}
                    className="w-12 h-12 object-cover rounded-full"
                  />
                  {onlineUsers.includes(user._id) && (
                    <span
                      className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full ring-2 ring-zinc-900"
                    />
                  )}
                </div>
                <div className="hidden lg:block text-left min-w-0">
                  <div className="font-medium truncate">{user.fullName}</div>
                  <div className="text-sm text-zinc-400">
                    {onlineUsers.includes(user._id) ? "Online" : "Offline"}
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="text-center text-zinc-500 py-4">No users found</div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;