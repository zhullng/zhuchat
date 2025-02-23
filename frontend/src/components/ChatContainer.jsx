import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime, formatMessageDate } from "../lib/utils";

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
  const [lastMessageDate, setLastMessageDate] = useState(null);

  useEffect(() => {
    getMessages(selectedUser._id);
    subscribeToMessages();

    return () => unsubscribeFromMessages();
  }, [selectedUser._id, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    // Só faz o scroll se houver mensagens e se a referência do final da mensagem estiver acessível
    if (messageEndRef.current && messages.length > 0) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    // Atualiza a última data exibida com base nas mensagens
    if (messages.length > 0) {
      const firstMessageDate = new Date(messages[0].createdAt);
      setLastMessageDate(formatMessageDate(firstMessageDate));  // Inicializa a data da primeira mensagem
    }
  }, [messages]); // Este efeito será chamado sempre que a lista de mensagens mudar.

  const renderMessageDate = (messageDate) => {
    const formattedDate = formatMessageDate(messageDate); // Formata a data para "DD de Mês de YYYY"
    const isSameDay = lastMessageDate === formattedDate;  // Compara se a data atual é a mesma da última exibida
    
    // Se a data for diferente da última exibida, exibe a nova data
    if (!isSameDay) {
      setLastMessageDate(formattedDate);  // Atualiza a data exibida
      return (
        <div className="text-center text-xs text-gray-500 my-2">
          <span>{formattedDate}</span> {/* Exibe a data no formato "DD de Mês de YYYY" */}
        </div>
      );
    }
    return null;  // Não exibe a data se for o mesmo dia
  };

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
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => {
          const messageDate = new Date(message.createdAt);
          const dateSection = renderMessageDate(messageDate);

          return (
            <div key={message._id}>
              {dateSection}

              <div
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
                <div className="chat-header mb-1">
                  <time className="text-xs opacity-50 ml-1">
                    {formatMessageTime(message.createdAt)} {/* Exibe só a hora */}
                  </time>
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
            </div>
          );
        })}
        {/* Referência para a última mensagem */}
        <div ref={messageEndRef} />
      </div>
      <MessageInput />
    </div>
  );
};

export default ChatContainer;
