import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "../store/useAuthStore";
import ChatHeader from "../components/ChatHeader";
import MessageInput from "../components/MessageInput";
import { formatMessageTime } from "../lib/utils";
import { getAIResponse } from "../../../backend/src/lib/ai";

const AIChat = () => {
  const { authUser } = useAuthStore();
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Early return for loading state
  if (!authUser) {
    return <div className="flex-1 flex items-center justify-center">Carregando...</div>;
  }

  const handleSendMessage = async (input) => {
    if (!input.trim() || isLoading) return;

    const userMessage = {
      content: input,
      isAI: false,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await getAIResponse(input);
      if (!response || !response.trim()) {
        throw new Error("Resposta da IA inválida");
      }

      setMessages((prev) => [
        ...prev,
        {
          content: response,
          isAI: true,
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      console.error("Erro detalhado:", error);
      setMessages((prev) => [
        ...prev,
        {
          content: `Erro: ${error.message}`,
          isAI: true,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to get profile picture URL
  const getProfilePicture = (isAI, user) => {
    if (isAI) return "/bot-avatar.png";
    if (!user) return "/avatar.png";
    return user.profilePic || "/avatar.png";
  };

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`chat ${message.isAI ? "chat-start" : "chat-end"}`}
          >
            <div className="chat-image avatar">
              <div className="size-10 rounded-full border">
                <img
                  src={getProfilePicture(message.isAI, authUser)}
                  alt={message.isAI ? "AI Avatar" : "User Avatar"}
                />
              </div>
            </div>

            <div className="chat-header mb-1">
              <time className="text-xs opacity-50 ml-1">
                {formatMessageTime(message.timestamp)}
              </time>
            </div>
            <div className="chat-bubble flex flex-col">
              <p>{message.content}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <MessageInput onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  );
};

export default AIChat;