import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "../store/useAuthStore";
import ChatHeader from "../components/ChatHeader";
import MessageInput from "../components/MessageInput";
import { formatMessageTime } from "../lib/utils";
import { getAIResponse } from "../../../backend/src/lib/ai";

const AIChat = () => {
  // Obtendo o usuário autenticado da store
  const { authUser } = useAuthStore() || { authUser: {} };
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Verificando se o authUser está carregado
  if (!authUser || !authUser._id) {
    return <div>Carregando... ou redirecionando para login...</div>;  // Exibir mensagem de carregamento ou redirecionar
  }

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

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

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`chat ${message.isAI ? "chat-start" : "chat-end"}`}
            ref={messagesEndRef}
          >
            <div className="chat-image avatar">
              <div className="size-10 rounded-full border">
                <img
                  src={
                    message.isAI
                      ? "/bot-avatar.png" // Avatar para IA
                      : authUser && authUser.profilePic // Verifica se authUser existe
                      ? authUser.profilePic // Se o authUser tiver profilePic, usa ele
                      : "/avatar.png" // Senão, usa imagem padrão
                  }
                  alt="profile pic"
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
      </div>

      <MessageInput onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  );
};

export default AIChat;
