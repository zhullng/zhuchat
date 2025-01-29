// NoChatSelected.jsx
import { MessageSquare } from "lucide-react";

const NoChatSelected = () => {
  return (
    <div className="hidden lg:flex w-full flex-1 flex-col items-center justify-center p-8 md:p-16 bg-base-100/50">
      <div className="max-w-md text-center space-y-4 md:space-y-6">
        <div className="flex justify-center gap-4 mb-2 md:mb-4">
          <div className="relative">
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-primary/10 flex items-center justify-center animate-bounce">
              <MessageSquare className="w-6 h-6 md:w-8 md:h-8 text-primary" />
            </div>
          </div>
        </div>
        <h2 className="text-xl md:text-2xl font-bold">Welcome to ZhuChat!</h2>
        <p className="text-sm md:text-base text-base-content/60 px-4 md:px-0">
          Select a conversation from the sidebar to start chatting
        </p>
      </div>
    </div>
  );
};

export default NoChatSelected;