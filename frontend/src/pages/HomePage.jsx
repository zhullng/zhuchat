import { useChatStore } from "../store/useChatStore";
import Sidebar from "../components/Sidebar";
import NoChatSelected from "../components/NoChatSelected";
import ChatContainer from "../components/ChatContainer";
import AIChat from "./AIChat";

const HomePage = () => {
  const { selectedUser, setSelectedUser } = useChatStore();
  const isAI = selectedUser?.isAI;

  return (
    <div className="h-screen bg-base-200">
      {/* pl-16 no mobile e pl-20 no desktop para acomodar a navbar */}
      <div className="flex h-full pl-16 sm:pl-20">
        <div className="flex w-full">
          {/* Sidebar com width responsivo */}
          <div className="w-64 md:w-80 flex-shrink-0 border-r border-base-300">
            <Sidebar />
          </div>
          
          {/* Área principal do chat */}
          <div className="flex-1 flex">
            {isAI ? (
              <AIChat setSelectedUser={setSelectedUser} />
            ) : !selectedUser ? (
              <NoChatSelected />
            ) : (
              <ChatContainer />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;