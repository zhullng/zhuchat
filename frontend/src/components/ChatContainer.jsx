import { useState, useEffect, useRef } from "react";
import { getAIResponse } from "../../../backend/src/lib/ai"; // Importe a função para obter a resposta do AI
import { Bot } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput"; // Já inclui o MessageInput
import MessageSkeleton from "./skeletons/MessageSkeleton";
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

  // State para o AI
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [aiMessages, setAiMessages] = useState([]);

  const messageEndRef = useRef(null);

  useEffect(() => {
    if (selectedUser?.isAI) {
      setAiMessages([]); // Limpar mensagens AI se for o AI Assistant
    } else {
      getMessages(selectedUser._id); // Obter mensagens para um usuário real
    }

    subscribeToMessages();
    return () => unsubscribeFromMessages();
  }, [selectedUser._id, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    if (messageEndRef.current && (messages || aiMessages)) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, aiMessages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Mensagem do usuário
    const newUserMessage = {
      content: input,
      isAI: false,
      timestamp: new Date(),
    };
    setAiMessages((prev) => [...prev, newUserMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Obtendo resposta do AI
      const response = await getAIResponse(input);
      const newAiMessage = {
        content: response,
        isAI: true,
        timestamp: new Date(),
      };
      setAiMessages((prev) => [...prev, newAiMessage]);
    } catch (error) {
      setAiMessages((prev) => [
        ...prev,
        {
          content: "Desculpe, ocorreu um erro. Tente novamente.",
          isAI: true,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (isMessagesLoading && !selectedUser?.isAI) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <div className="border-b p-4 flex items-center justify-between md:flex-row md:items-center">
          <ChatHeader />
        </div>
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  // Renderização para o AI Assistant
  const renderAIChat = () => (
    <div className="flex flex-col h-screen">
      <div className="border-b p-4 flex items-center justify-between md:flex-row md:items-center bg-base-100">
        <ChatHeader />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {aiMessages.map((message, index) => (
          <div
            key={index}
            className={`flex items-start gap-3 ${message.isAI ? "flex-row" : "flex-row-reverse"}`}
          >
            <div className="flex-shrink-0">
              <div className="size-10 rounded-full overflow-hidden border-none">
                {message.isAI ? (
                  <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                    <Bot className="text-primary" size={20} />
                  </div>
                ) : (
                  <img
                    src={authUser?.profilePic || "/avatar.png"}
                    alt="User Avatar"
                    className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded-full"
                  />
                )}
              </div>
            </div>

            <div className={`flex flex-col max-w-[70%] ${message.isAI ? "items-start" : "items-end"}`}>
              <div className="text-xs text-base-content mb-1 px-1">
                {message.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>

              <div
                className={`rounded-2xl p-3 ${
                  message.isAI
                    ? "bg-base-100 border border-base-200 shadow-sm"
                    : "bg-primary text-base-100"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="size-10 rounded-full overflow-hidden border-none">
                <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                  <Bot className="text-primary" size={20} />
                </div>
              </div>
            </div>
            <div className="bg-base-100 p-3 rounded-2xl border border-base-200 shadow-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-base-300 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-base-300 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-base-300 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messageEndRef} />
      </div>

      <div className="sticky bottom-0 w-full bg-base-100 border-t">
        <form onSubmit={handleSubmit} className="p-4">
          <MessageInput
            input={input}
            setInput={setInput}
            isLoading={isLoading}
            handleSubmit={handleSubmit}
          />
        </form>
      </div>
    </div>
  );

  // Renderização para um usuário real
  const renderUserChat = () => (
    <div className="flex-1 flex flex-col overflow-auto">
      <div className="border-b p-4 flex items-center justify-between md:flex-row md:items-center">
        <ChatHeader />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message._id}
            className={`chat ${message.senderId === authUser._id ? "chat-end" : "chat-start"}`}
            ref={messageEndRef}
          >
            <div className=" chat-image avatar">
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
                {formatMessageTime(message.createdAt)}
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
        ))}
      </div>
      <MessageInput input={input} setInput={setInput} isLoading={isLoading} handleSubmit={handleSubmit} />
    </div>
  );

  return selectedUser?.isAI ? renderAIChat() : renderUserChat();
};

export default ChatContainer;
