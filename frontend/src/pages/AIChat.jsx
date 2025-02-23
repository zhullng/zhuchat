import { useState, useEffect, useRef } from "react";
import { getAIResponse } from "../../../backend/src/lib/ai";
import { useAuthStore } from "../store/useAuthStore";
import { Bot } from "lucide-react";
import ChatHeader from "./ChatHeader"; // Importar ChatHeader
import MessageInput from "./MessageInput"; // Usar MessageInput
import MessageSkeleton from "./skeletons/MessageSkeleton"; // Incluir MessageSkeleton para carregamento
import { formatMessageTime } from "../lib/utils";

const AIChat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const { authUser } = useAuthStore();

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const newMessage = {
      content: input,
      isAI: false,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await getAIResponse(input);
      setMessages((prev) => [
        ...prev,
        { content: response, isAI: true, timestamp: new Date() },
      ]);
    } catch (error) {
      setMessages((prev) => [
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

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Chat Header */}
      <div className="flex items-center justify-between md:flex-row md:items-center bg-base-100">
        <ChatHeader />
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex items-start gap-3 ${message.isAI ? "flex-row" : "flex-row-reverse"}`}
          >
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="size-10 rounded-full border overflow-hidden">
                {message.isAI ? (
                  <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                    <Bot className="text-primary" size={20} />
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

            {/* Message Content */}
            <div
              className={`flex flex-col max-w-[70%] ${message.isAI ? "items-start" : "items-end"}`}
            >
              {/* Timestamp */}
              <div className="text-xs text-base-content mb-1 px-1">
                {formatMessageTime(message.timestamp)}
              </div>

              {/* Message Bubble */}
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

        {/* Typing Indicator */}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="size-10 rounded-full border overflow-hidden">
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

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
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
};

export default AIChat;
