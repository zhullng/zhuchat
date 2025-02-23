import { useState, useEffect, useRef } from "react";
import { getAIResponse } from "../../../backend/src/lib/ai";
import { useAuthStore } from "../store/useAuthStore";
import { Bot, Send } from "lucide-react";

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
    <div className="flex-1 flex flex-col">
      {/* Chat Header */}
      <div className="border-b p-4 flex items-center gap-">
        <div className="size-10 rounded-full border overflow-hidden flex items-center justify-center">
          <Bot className="text-blue-600" size={24} />
        </div>
        <div>
          <h2 className="font-semibold text-gray-800">Assistente Virtual</h2>
          <p className="text-sm text-gray-500 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-400' : 'bg-green-400'} animate-pulse`}></span>
            {isLoading ? "Digitando..." : "Online"}
          </p>
        </div>
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
                  <div className="w-full h-full flex items-center justify-center">
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

            {/* Message Content */}
            <div
              className={`flex flex-col max-w-[70%] ${
                message.isAI ? "items-start" : "items-end"
              }`}
            >
              {/* Timestamp */}
              <div className="text-xs text-gray-500 mb-1 px-1">
                {message.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>

              {/* Message Bubble */}
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

        {/* Typing Indicator */}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="size-10 rounded-full border overflow-hidden">
                <div className="w-full h-full flex items-center justify-center">
                  <Bot className="text-blue-600" size={20} />
                </div>
              </div>
            </div>
            <div className="p-3 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2rounded-full animate-bounce"></div>
                <div className="w-2 h-2 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

    {/* Message Input */}
    <div className="sticky bottom-0 w-full border-t">
      <form onSubmit={handleSubmit} className="p-4 flex items-center gap-2">
      <div className="flex-1 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Digite sua mensagem..."
          className="w-full input input-bordered rounded-lg input-md"
          disabled={isLoading}
        />

        <button
          type="submit"
          className="btn btn-sm btn-circle"
          disabled={!input.trim()} // Corrigido para verificar o estado correto
        >
          <Send size={22} />
        </button>
        </div>
      </form>
    </div>
    </div>
  );
};

export default AIChat;