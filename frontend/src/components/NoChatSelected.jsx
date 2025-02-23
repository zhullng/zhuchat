const NoChatSelected = () => {
  return (
    <div className="hidden lg:flex w-full flex-1 flex-col items-center justify-center p-16">
      <div className="max-w-md text-center space-y-6">
        <div className="flex justify-center gap-4 mb-4">
          <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center animate-bounce">
              <img src="/logoZhuChat.png" alt="Logo" className="w-12 h-12 rounded-full" />
            </div>
          </div>
        </div>
        <h2 className="text-2xl font-bold">Welcome to ZhuChat!</h2>
        <p className="text-base-content/60">
          Select a conversation from the sidebar to start chatting
        </p>
      </div>
    </div>
  );
};

export default NoChatSelected;