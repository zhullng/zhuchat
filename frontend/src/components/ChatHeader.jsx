// src/components/ChatHeader.jsx
import { useState } from "react";
import { X, Phone, Video } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import JitsiCall from "./JitsiCall";
import toast from "react-hot-toast";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { authUser, onlineUsers } = useAuthStore();
  const [showCall, setShowCall] = useState(false);
  const [callRoom, setCallRoom] = useState(null);
  const [callType, setCallType] = useState(null);

  const isAI = selectedUser?.isAI;
  const isUserOnline = onlineUsers.includes(selectedUser?._id);

  const startCall = (type) => {
    if (isAI || !isUserOnline) {
      toast.error(`Não é possível iniciar uma chamada ${type === 'voice' ? 'de voz' : 'de vídeo'} com ${isAI ? 'o assistente AI' : 'um usuário offline'}.`);
      return;
    }
    
    // Criar um nome de sala único para esta conversa
    const roomName = `zhuchat_${authUser._id}_${selectedUser._id}_${Date.now()}`.replace(/[^a-zA-Z0-9_]/g, '_');
    setCallRoom(roomName);
    setCallType(type);
    setShowCall(true);
    
    toast.success(`Iniciando chamada ${type === 'video' ? 'com vídeo' : 'de voz'} com ${selectedUser.fullName}...`);
  };

  const closeCall = () => {
    setShowCall(false);
    setCallRoom(null);
    setCallType(null);
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
                  onClick={() => startCall('voice')}
                  disabled={!isUserOnline}
                  className="btn btn-ghost btn-sm btn-circle"
                  title="Chamada de voz"
                >
                  <Phone size={18} className={!isUserOnline ? 'opacity-50' : ''} />
                </button>
                <button
                  onClick={() => startCall('video')}
                  disabled={!isUserOnline}
                  className="btn btn-ghost btn-sm btn-circle"
                  title="Chamada de vídeo"
                >
                  <Video size={18} className={!isUserOnline ? 'opacity-50' : ''} />
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

      {/* Interface de Chamada Jitsi */}
      {showCall && callRoom && (
        <JitsiCall
          roomName={callRoom}
          userName={authUser.fullName}
          onClose={closeCall}
        />
      )}
    </>
  );
};

export default ChatHeader;