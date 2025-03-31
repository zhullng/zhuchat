// src/components/ChatHeader.jsx
import { useState } from "react";
import { X, Phone, Video } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import AgoraCall from "./AgoraCall";
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
    if (isAI) {
      toast.error(`Não é possível iniciar uma chamada ${type === 'voice' ? 'de voz' : 'de vídeo'} com o assistente AI.`);
      return;
    }
    
    if (!isUserOnline) {
      toast.info(`Iniciando chamada ${type === 'video' ? 'com vídeo' : 'de voz'}, mas o usuário está offline. Ele receberá uma notificação quando ficar online.`);
    }
    
    // Criar um nome de sala mais curto para esta conversa
    // Usar os últimos 6 caracteres de cada ID e um timestamp curto
    const userId1 = authUser._id.slice(-6);
    const userId2 = selectedUser._id.slice(-6);
    const timeStamp = Date.now().toString().slice(-6);
    
    // Formato: zc_u1_u2_time (curto e com caracteres permitidos)
    const roomName = `zc_${userId1}_${userId2}_${timeStamp}`;
    
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
                  className="btn btn-ghost btn-sm btn-circle"
                  title="Chamada de voz"
                >
                  <Phone size={18} />
                </button>
                <button
                  onClick={() => startCall('video')}
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

      {/* Interface de Chamada Agora */}
      {showCall && callRoom && (
        <AgoraCall
          channelName={callRoom}
          userName={authUser.fullName}
          onClose={closeCall}
        />
      )}
    </>
  );
};

export default ChatHeader;