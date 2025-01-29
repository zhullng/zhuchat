// HomePage.jsx
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
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      // Forçar atualização do layout ao mudar orientação
      if (selectedUser && mobile) {
        document.body.classList.add('chat-open');
      } else {
        document.body.classList.remove('chat-open');
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [selectedUser]);

  return (
    <div className="flex h-[calc(100vh-4rem)] relative">
      {/* Sidebar - Sempre visível em desktop, condicional em mobile */}
      <div className={`${isMobile && selectedUser ? 'hidden' : 'block'} w-full lg:w-80 transition-transform duration-300`}>
        <Sidebar />
      </div>

      {/* Chat Container - Animação suave em mobile */}
      <div className={`flex-1 ${!selectedUser ? 'hidden lg:block' : 'block'} chat-container`}>
        {selectedUser ? <ChatContainer /> : <NoChatSelected />}
      </div>
    </div>
  );
};

export default HomePage;