import { useState } from "react";
import { X, Phone, Video } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import useCallStore from "../store/useCallStore";
import toast from "react-hot-toast";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { authUser, onlineUsers } = useAuthStore();
  const { startCall } = useCallStore();

  const isAI = selectedUser?.isAI;
  const isUserOnline = onlineUsers.includes(selectedUser?._id);

  const handleStartCall = (type) => {
    if (isAI) {
      toast.error(`Não é possível iniciar uma chamada ${type === 'voice' ? 'de voz' : 'de vídeo'} com o assistente AI.`);
      return;
    }
    
    if (!isUserOnline) {
      toast.error(`${selectedUser.fullName} está offline. Tente mais tarde.`);
      return;
    }
    
    // Iniciar chamada através do CallStore
    startCall(selectedUser._id, selectedUser.fullName, type);
  };

  return (
    <>
      <div className="p-2.5 border-b border-base-300 bg-base-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="avatar">
              <div className="size-10 rounded-full relative">
                {isAI ? (
                  <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-600">
                    <span className="font-bold">AI</span>
                  </div>
                ) : (
                  <img
                    src={selectedUser.profilePic || "/avatar.png"}
                    alt={selectedUser.fullName}
                    className="object-cover"
                  />
                )}
              </div>
            </div>

            <div>
              <h3 className="font-medium">{isAI ? "Assistente AI" : selectedUser.fullName}</h3>
              <p className="text-sm text-base-content/70">
                {isAI ? "Sempre Online" : isUserOnline ? "Online" : "Offline"}
              </p>
            </div>
          </div>

          <div className="flex items-center">
            {!isAI && (
              <>
                <button
                  onClick={() => handleStartCall('voice')}
                  className="btn btn-ghost btn-sm btn-circle"
                  title="Chamada de voz"
                >
                  <Phone size={18} />
                </button>
                <button
                  onClick={() => handleStartCall('video')}
                  className="btn btn-ghost btn-sm btn-circle"
                  title="Chamada de vídeo"
                >
                  <Video size={18} />
                </button>
              </>
            )}
            
            <button 
              onClick={() => setSelectedUser(null)} 
              className="btn btn-ghost btn-sm btn-circle"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ChatHeader;