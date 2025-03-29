import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react";

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
  const chatContainerRef = useRef(null);
  const [initialScrollDone, setInitialScrollDone] = useState(false);

  // Efeito para carregar mensagens e configurar a subscrição de mensagens
  useEffect(() => {
    getMessages(selectedUser._id);
    subscribeToMessages();
    
    // Resetar estado de scroll inicial quando mudar de conversa
    setInitialScrollDone(false);
    
    return () => unsubscribeFromMessages();
  }, [selectedUser._id, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  // Efeito para scroll automático quando as mensagens são carregadas inicialmente
  useEffect(() => {
    // Se não estiver carregando e temos mensagens
    if (!isMessagesLoading && messages.length > 0 && !initialScrollDone) {
      // Esperar um pouco para as mensagens renderizarem
      setTimeout(() => {
        if (messageEndRef.current) {
          messageEndRef.current.scrollIntoView({ behavior: "auto" });
          setInitialScrollDone(true);
        }
      }, 100);
    }
  }, [messages, isMessagesLoading, initialScrollDone]);

  // Efeito separado para fazer scroll quando chegar uma nova mensagem
  useEffect(() => {
    // Só fazemos o scroll para novas mensagens se já tivermos feito o scroll inicial
    if (initialScrollDone && messageEndRef.current && messages.length > 0) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, initialScrollDone]);

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="h-screen supports-[height:100cqh]:h-[100cqh] supports-[height:100svh]:h-[100svh] flex-1 flex flex-col overflow-auto pb-5">
      <ChatHeader />
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
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
                  alt="profile pic"
                />
              </div>
            </div>

            {/* Alteração do layout do cabeçalho para a posição do nome */}
            <div className={`chat-header mb-1 flex items-center ${message.senderId === authUser._id ? "justify-end" : "justify-start"}`}>
              {/* Para o user logado (authUser), o nome estará à direita e o horário à esquerda */}
              {message.senderId === authUser._id ? (
                <>
                  <time className="text-xs opacity-50">
                    {formatMessageTime(message.createdAt)}
                  </time>
                  <span className="font-semibold text-sm ml-2">
                    {authUser.fullName || 'Nome Desconhecido'}
                  </span>
                </>
              ) : (
                // Para o outro user (selectedUser), o nome estará à esquerda e o horário à direita
                <>
                  <span className="font-semibold text-sm">
                    {selectedUser?.fullName || 'Nome Desconhecido'}
                  </span>
                  <time className="text-xs opacity-50 ml-2">
                    {formatMessageTime(message.createdAt)}
                  </time>
                </>
              )}
            </div>

            <div className="chat-bubble flex flex-col">
              {message.image && (
                <img
                  src={message.image}
                  alt="Attachment"
                  className="sm:max-w-[200px] rounded-md mb-2"
                />
              )}
              {message.text && <p>{message.text}</p>}
            </div>
          </div>
        ))}
        {/* Referência para o final da lista de mensagens */}
        <div ref={messageEndRef}></div>
      </div>
      <MessageInput />
    </div>
  );
};

export default ChatContainer;