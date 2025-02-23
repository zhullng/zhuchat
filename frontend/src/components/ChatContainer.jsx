import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef } from "react";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const containerRef = useRef(null);

  // Função de scroll otimizada
  const scrollToBottom = (behavior = "smooth") => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({
        behavior,
        block: "nearest",
        inline: "start",
      });
    }
  };

  // Handler para redimensionamento do teclado
  useEffect(() => {
    const handleResize = () => {
      setTimeout(scrollToBottom, 100);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Carregar mensagens e setup inicial
  useEffect(() => {
    getMessages(selectedUser._id);
    subscribeToMessages();
    return () => unsubscribeFromMessages();
  }, [selectedUser._id, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  // Scroll automático para novas mensagens
  useEffect(() => {
    if (!isMessagesLoading) {
      scrollToBottom();
    }
  }, [messages, isMessagesLoading]);

  // Scroll inicial ao carregar
  useEffect(() => {
    if (!isMessagesLoading && messages.length > 0) {
      setTimeout(() => scrollToBottom("auto"), 300);
    }
  }, [isMessagesLoading]);

  if (isMessagesLoading) {
    return (
      <div className="h-[100dvh] flex flex-col overflow-hidden">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden">
      <ChatHeader />
      
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message._id}
            className={`chat ${message.senderId === authUser._id ? "chat-end" : "chat-start"}`}
          >
            <div className="chat-image avatar">
              <div className="size-10 rounded-full border">
                <img
                  src={
                    message.senderId === authUser._id
                      ? authUser.profilePic || "/avatar.png"
                      : selectedUser.profilePic || "/avatar.png"
                  }
                  alt="profile"
                />
              </div>
            </div>
            <div className="chat-header mb-1">
              <time className="text-xs opacity-50 ml-1">
                {formatMessageTime(message.createdAt)}
              </time>
            </div>
            <div className="chat-bubble flex flex-col">
              {message.image && (
                <img
                  src={message.image}
                  alt="Content"
                  className="sm:max-w-[200px] rounded-md mb-2"
                />
              )}
              {message.text && <p>{message.text}</p>}
            </div>
          </div>
        ))}
        <div ref={messageEndRef} />
      </div>

      <MessageInput />
    </div>
  );
};

export default ChatContainer;