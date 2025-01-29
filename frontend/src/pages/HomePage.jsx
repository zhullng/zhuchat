import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import Sidebar from "../components/Sidebar";
import ChatContainer from "../components/ChatContainer";
import NoChatSelected from "../components/NoChatSelected";

const HomePage = () => {
  const { selectedUser } = useChatStore();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 1024;
      setIsMobile(mobile);
      
      if (mobile && selectedUser) {
        document.body.classList.add('chat-active');
      } else {
        document.body.classList.remove('chat-active');
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [selectedUser]);

  return (
    <div className="flex h-[calc(100vh-4rem)] relative">
      {/* Sidebar */}
      <div className={`sidebar-container ${isMobile && selectedUser ? 'hidden' : 'block'} w-full lg:w-80`}>
        <Sidebar />
      </div>

      {/* Chat Container */}
      <div className={`flex-1 ${!selectedUser ? 'hidden lg:block' : 'block'} chat-container ${selectedUser ? 'active' : ''}`}>
        {selectedUser ? <ChatContainer /> : <NoChatSelected />}
      </div>
    </div>
  );
};

export default HomePage;