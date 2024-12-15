import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";

const Sidebar = () => {
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);

  useEffect(() => {
    getUsers(); // Initial user fetch

    // Set up WebSocket connection to listen for new users or updates
    const socket = new WebSocket("ws://your-websocket-server-url");

    // Listen for messages from the WebSocket server
    socket.addEventListener("message", (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "NEW_USER" || data.type === "USER_UPDATE") {
        // Call getUsers to refresh the user list when a new user joins or updates
        getUsers();
      }
    });

    // Clean up the WebSocket connection when the component unmounts
    return () => {
      socket.close();
    };
  }, [getUsers]);

  const filteredUsers = showOnlineOnly
    ? users.filter((user) => onlineUsers.includes(user._id))
    : users;

  if (isUsersLoading) return <SidebarSkeleton />;

  return (
    <div className="sidebar">
      <h2>Contacts</h2>

      <div className="flex items-center">
        <input
          type="checkbox"
          checked={showOnlineOnly}
          onChange={(e) => setShowOnlineOnly(e.target.checked)}
          className="checkbox checkbox-sm"
        />
        <span>Show online only</span>
        <span>({onlineUsers.length - 1} online)</span>
      </div>

      <div className="user-list">
        {filteredUsers.map((user) => (
          <div
            key={user._id}
            onClick={() => setSelectedUser(user)}
            className={`
              w-full p-3 flex items-center gap-3
              hover:bg-base-300 transition-colors
              ${selectedUser?._id === user._id ? "bg-base-300 ring-1 ring-base-300" : ""}
            `}
          >
            {onlineUsers.includes(user._id) && <span className="status-dot online"></span>}
            <div className="user-info">
              <p className="user-name">{user.fullName}</p>
              <span className="user-status">
                {onlineUsers.includes(user._id) ? "Online" : "Offline"}
              </span>
            </div>
          </div>
        ))}

        {filteredUsers.length === 0 && (
          <div>No online users</div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
