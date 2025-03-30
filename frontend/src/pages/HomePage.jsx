// pages/HomePage.jsx
import { useEffect } from "react";
import Sidebar from "../components/Sidebar";
import NoChatSelected from "../components/NoChatSelected";
import ChatContainer from "../components/ChatContainer";
import GroupChatContainer from "../components/GroupChatContainer";
import AIChat from "./AIChat";
import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";

const HomePage = () => {
  const { selectedUser, setSelectedUser, resetChatState } = useChatStore();
  const { selectedGroup, resetGroupState } = useGroupStore();
  const isAI = selectedUser?.isAI;

  // Limpar estado dos chats quando desmontar o componente
  useEffect(() => {
    return () => {
      resetChatState();
      resetGroupState();
    };
  }, [resetChatState, resetGroupState]);

  return (
    <div className="h-screen bg-base-100">
      <div className="flex h-full">
        <div className="w-80 h-full border-r border-base-300">
          <Sidebar />
        </div>
        
        <div className="flex-1 flex">
          {isAI ? (
            <AIChat setSelectedUser={setSelectedUser} />
          ) : selectedUser ? (
            <ChatContainer />
          ) : selectedGroup ? (
            <GroupChatContainer />
          ) : (
            <NoChatSelected />
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;