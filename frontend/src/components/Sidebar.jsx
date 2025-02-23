import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { Users, Bot } from "lucide-react";
import { debounce } from "lodash";

const Sidebar = () => {
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobile, setIsMobile] = useState(false);

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

  return (
    <aside className="supports-[height:100cqh]:h-[100cqh] supports-[height:100svh]:h-[100svh] w-full lg:w-[30%] border-r border-base-300 flex flex-col transition-all duration-200
      ${isMobile && selectedUser ? 'hidden' : 'block'}">
      <div className="border-b border-base-300 w-full p-3 lg:p-4">
        <div className="flex items-center gap-2">
          <Users className="size-6" />
          <span className="font-medium">Contacts</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
