import { useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import Sidebar from "../components/Sidebar";
import NoChatSelected from "../components/NoChatSelected";
import ChatContainer from "../components/ChatContainer";
import AIChat from "./AIChat"; 

const HomePage = () => {
  const { selectedUser } = useChatStore();
  const isAI = selectedUser?.isAI;

  useEffect(() => {
    // Impede o scroll apenas nesta página
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const preventScroll = (e) => e.preventDefault();
    window.addEventListener("touchmove", preventScroll, { passive: false });

    return () => {
      // Remove o bloqueio ao sair da página
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      window.removeEventListener("touchmove", preventScroll);
    };
  }, []);

  return (
    <div className="h-[90dvh] w-full bg-base-200"> {/* 90dvh de altura e full width */}
      <div className="flex items-center justify-center pt-20 px-4">
        <div className="bg-base-100 rounded-lg shadow-cl w-full max-w-6xl h-full">
          <div className="flex h-full rounded-lg overflow-hidden">
            <Sidebar />
            {isAI ? <AIChat /> : !selectedUser ? <NoChatSelected /> : <ChatContainer />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
