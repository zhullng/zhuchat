import { useState, useEffect, useRef } from "react";
import { getAIResponse } from "../../../backend/src/lib/ai"; // Importe a função para obter a resposta do AI
import { Bot } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
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
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  // Renderização para o AI Assistant
  const renderAIChat = () => (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="border-b p-4 flex items-center gap-3 bg-white">
        <div className="size-10 rounded-full border overflow-hidden flex items-center justify-center bg-blue-100">
          <Bot className="text-blue-600" size={24} />
        </div>
        <div>
          <h2 className="font-semibold text-gray-800">Assistente Virtual</h2>
          <p className="text-sm text-gray-500 flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${isLoading ? "bg-yellow-400" : "bg-green-400"} animate-pulse`}
            ></span>
            {isLoading ? "Digitando..." : "Online"}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {aiMessages.map((message, index) => (
          <div
            key={index}
            className={`flex items-start gap-3 ${message.isAI ? "flex-row" : "flex-row-reverse"}`}
          >
            <div className="flex-shrink-0">
              <div className="size-10 rounded-full border overflow-hidden">
                {message.isAI ? (
                  <div className="w-full h-full bg-blue-100 flex items-center justify-center">
                    <Bot className="text-blue-600" size={20} />
                  </div>
                ) : (
                  <img
                    src={authUser?.profilePic || "/avatar.png"}
                    alt="User Avatar"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            </div>

            <div className={`flex flex-col max-w-[70%] ${message.isAI ? "items-start" : "items-end"}`}>
              <div className="text-xs text-gray-500 mb-1 px-1">
                {message.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>

              <div
                className={`rounded-2xl p-3 ${
                  message.isAI
                    ? "bg-white border border-gray-200 shadow-sm"
                    : "bg-blue-600 text-white"
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
              <div className="size-10 rounded-full border overflow-hidden">
                <div className="w-full h-full bg-blue-100 flex items-center justify-center">
                  <Bot className="text-blue-600" size={20} />
                </div>
              </div>
            </div>
            <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messageEndRef} />
      </div>

      <div className="sticky bottom-0 w-full bg-white border-t">
        <form onSubmit={handleSubmit} className="p-4">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
            disabled={isLoading}
          />
        </form>
      </div>
    </div>
  );

  // Renderização para um usuário real
  const renderUserChat = () => (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />
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
      <MessageInput />
    </div>
  );

  return selectedUser?.isAI ? renderAIChat() : renderUserChat();
};

export default ChatContainer;
