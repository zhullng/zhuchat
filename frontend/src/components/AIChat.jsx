import { useState, useEffect, useRef } from "react";
import { getAIResponse } from "../lib/ai";
import { useAuthStore } from "../store/useAuthStore";
import { Bot } from "lucide-react";

const AIChat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const { authUser } = useAuthStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setMessages((prev) => [
      ...prev,
      { content: input, isAI: false, timestamp: new Date() },
    ]);

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
    <div className="flex flex-col h-full max-w-2xl mx-auto border rounded-lg shadow-md bg-white">
      {/* Cabeçalho do Chat */}
      <div className="border-b p-4 flex items-center gap-3 bg-gray-100">
        <div className="p-2 bg-primary/10 rounded-full">
          <Bot className="text-primary" size={24} />
        </div>
        <div>
          <h2 className="font-semibold text-gray-800">Assistente Virtual</h2>
          <p className="text-sm text-gray-500">
            {isLoading ? "Digitando..." : "Online"}
          </p>
        </div>
      </div>

      {/* Área de Mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex items-start ${
              message.isAI ? "justify-start" : "justify-end"
            }`}
          >
            {/* Avatar */}
            {message.isAI ? (
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mr-2">
                <Bot className="text-gray-600" size={20} />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full overflow-hidden border ml-2">
                <img
                  src={authUser?.profilePic || "/avatar.png"}
                  alt="User Avatar"
                />
              </div>
            )}

            {/* Mensagem */}
            <div
              className={`max-w-[75%] rounded-xl p-3 shadow ${
                message.isAI
                  ? "bg-white border border-gray-200 text-gray-800"
                  : "bg-primary text-white"
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              <p className="text-xs mt-1 text-gray-500 text-right">
                {message.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ))}

        {/* Animação de Digitação */}
        {isLoading && (
          <div className="flex items-center gap-2 text-gray-500 ml-2">
            <Bot size={16} />
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100"></div>
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200"></div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input de Mensagem */}
      <form onSubmit={handleSubmit} className="border-t p-4 bg-white">
        <div className="relative">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="w-full p-3 pr-16 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary bg-gray-100"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="absolute right-2 top-2 px-4 py-1.5 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {isLoading ? "Enviando..." : "Enviar"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AIChat;
