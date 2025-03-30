// components/GroupChatContainer.jsx
import { useEffect, useRef, useState } from "react";
import { useGroupStore } from "../store/useGroupStore";
import { useAuthStore } from "../store/useAuthStore";
import GroupChatHeader from "./GroupChatHeader";
import GroupMessageInput from "./GroupMessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { Trash2, MoreVertical, Users } from "lucide-react";
import { formatMessageTime } from "../lib/utils";
import toast from "react-hot-toast";

const GroupChatContainer = () => {
  const {
    groupMessages,
    isGroupMessagesLoading,
    selectedGroup,
    getGroupMessages,
    markGroupAsRead,
  } = useGroupStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [initialScrollDone, setInitialScrollDone] = useState(false);
  const [activeMessageMenu, setActiveMessageMenu] = useState(null);

  // Efeito para carregar mensagens
  useEffect(() => {
    if (selectedGroup?._id) {
      getGroupMessages(selectedGroup._id);
      markGroupAsRead(selectedGroup._id);
      
      // Resetar estado de scroll inicial
      setInitialScrollDone(false);
      setActiveMessageMenu(null);
    }
  }, [selectedGroup?._id, getGroupMessages, markGroupAsRead]);

  // Efeito para scroll automático quando as mensagens iniciais são carregadas
  useEffect(() => {
    if (!isGroupMessagesLoading && groupMessages.length > 0 && !initialScrollDone) {
      setTimeout(() => {
        if (messageEndRef.current) {
          messageEndRef.current.scrollIntoView({ behavior: "auto" });
          setInitialScrollDone(true);
        }
      }, 100);
    }
  }, [groupMessages, isGroupMessagesLoading, initialScrollDone]);

  // Efeito para scroll em novas mensagens
  useEffect(() => {
    if (initialScrollDone && messageEndRef.current && groupMessages.length > 0) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [groupMessages.length, initialScrollDone]);

  // Função para excluir mensagem (a ser implementada no backend)
  const handleDeleteMessage = async (messageId) => {
    // Implementação futura
    toast.error("Funcionalidade ainda não implementada");
    setActiveMessageMenu(null);
  };

  if (isGroupMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <GroupChatHeader />
        <MessageSkeleton />
        <GroupMessageInput />
      </div>
    );
  }

  return (
    <div className="h-screen supports-[height:100cqh]:h-[100cqh] supports-[height:100svh]:h-[100svh] flex-1 flex flex-col overflow-auto pb-5">
      <GroupChatHeader />
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-base-100"
      >
        {groupMessages.map((message) => {
          const isMyMessage = message.senderId._id === authUser._id;
          
          return (
            <div
              key={message._id}
              className={`chat ${isMyMessage ? "chat-end" : "chat-start"}`}
            >
              <div className="chat-image avatar">
                <div className="size-10 rounded-full border">
                  <img
                    src={
                      isMyMessage
                        ? authUser.profilePic || "/avatar.png"
                        : message.senderId.profilePic || "/avatar.png"
                    }
                    alt="profile pic"
                  />
                </div>
              </div>

              <div className={`chat-header mb-1 flex items-center ${isMyMessage ? "justify-end" : "justify-start"}`}>
                {isMyMessage ? (
                  <>
                    <time className="text-xs opacity-50">
                      {formatMessageTime(message.createdAt)}
                    </time>
                    <span className="font-semibold text-sm ml-2 flex items-center">
                      {authUser.fullName || 'Nome Desconhecido'}
                      
                      {/* Opções de mensagem */}
                      <div className="message-menu-container ml-1 relative">
                        <button 
                          onClick={() => setActiveMessageMenu(activeMessageMenu === message._id ? null : message._id)} 
                          className="p-1 rounded-full hover:bg-base-300 transition-colors"
                        >
                          <MoreVertical size={14} />
                        </button>
                        
                        {activeMessageMenu === message._id && (
                          <div className="absolute right-0 mt-1 bg-base-100 shadow-md rounded-md border border-base-300 z-10">
                            <button
                              onClick={() => handleDeleteMessage(message._id)}
                              className="flex items-center gap-2 px-3 py-2 hover:bg-base-200 text-error w-full text-left whitespace-nowrap"
                            >
                              <Trash2 size={16} />
                              <span>Eliminar</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </span>
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-sm">
                      {message.senderId.fullName || 'Nome Desconhecido'}
                    </span>
                    <time className="text-xs opacity-50 ml-2">
                      {formatMessageTime(message.createdAt)}
                    </time>
                  </>
                )}
              </div>

              <div className="chat-bubble flex flex-col relative">
                {message.image && (
                  <img
                    src={message.image}
                    alt="Attachment"
                    className="sm:max-w-[200px] rounded-md mb-2"
                  />
                )}
                {message.text && (
                  <p className="break-words whitespace-pre-wrap">{message.text}</p>
                )}
              </div>
            </div>
          );
        })}
        
        {groupMessages.length === 0 && (
          <div className="flex items-center justify-center h-full text-base-content/60">
            <div className="text-center">
              <div className="mb-2">
                <Users size={48} className="mx-auto opacity-40" />
              </div>
              <p>Sem mensagens neste grupo</p>
              <p className="text-sm mt-1">Seja o primeiro a enviar uma mensagem!</p>
            </div>
          </div>
        )}
        
        {/* Referência para o final da lista de mensagens */}
        <div ref={messageEndRef}></div>
      </div>
      <GroupMessageInput />
    </div>
  );
};

export default GroupChatContainer;