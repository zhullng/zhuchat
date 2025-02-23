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
      <div className="flex h-full pl-20"> {/* Added pl-20 to account for navbar width */}
        <div className="flex w-full">
          <Sidebar />
          
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