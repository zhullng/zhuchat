import { useChatStore } from "../store/useChatStore";
import Sidebar from "../components/Sidebar";
import NoChatSelected from "../components/NoChatSelected";
import ChatContainer from "../components/ChatContainer";
import AIChat from "./AIChat"; // Importe o AIChat

const HomePage = () => {
  const { selectedUser } = useChatStore();
  const isAI = selectedUser?.isAI;

  return (
    <div className="h-screen bg-base-200 flex overflow-hidden">
      <div className="flex items-center justify-center pt-20 px-4 w-full">
        <div className="bg-base-100 rounded-lg shadow-cl w-full h-[calc(100vh-8rem)] overflow-hidden">
          <div className="flex h-full rounded-lg overflow-hidden">
            {/* Sidebar sempre com scroll */}
            <Sidebar />

            {/* Se for AI, exibe o AIChat, caso contrário, o ChatContainer */}
            <div className="flex-1 overflow-y-auto">
              {isAI ? <AIChat /> : !selectedUser ? <NoChatSelected /> : <ChatContainer />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
