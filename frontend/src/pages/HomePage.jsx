import { useChatStore } from "../store/useChatStore";
import Sidebar from "../components/Sidebar";
import NoChatSelected from "../components/NoChatSelected";
import ChatContainer from "../components/ChatContainer";
import AIChat from "./AIChat";

const HomePage = () => {
  const { selectedUser } = useChatStore();

  // Verificando se o usuário selecionado é o AI Assistant
  const isAI = selectedUser?.isAI;

  return (
    <div className="h-screen bg-base-200">
      <div className="flex items-center justify-center pt-20 px-4">
        <div className="bg-base-100 rounded-lg shadow-cl w-full max-w-6xl h-[calc(100vh-8rem)]">
          <div className="flex h-full rounded-lg overflow-hidden">
            <Sidebar />

            {/* Renderiza ChatContainer apenas se o usuário for o AI ou um usuário real */}
            {!selectedUser ? (
              <NoChatSelected />
            ) : isAI ? (
              <ChatContainer />
            ) : (
              // Aqui você pode renderizar algo especial se for AI
              <AIChat />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
