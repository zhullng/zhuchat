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
    <div className="flex flex-col h-full max-w-3xl mx-auto rounded-xl shadow-lg bg-gradient-to-b from-gray-50 to-white">
      {/* Chat Header */}
      <div className="px-6 py-4 border-b flex items-center gap-4 bg-white rounded-t-xl">
        <div className="p-2.5 bg-blue-100 rounded-xl">
          <Bot className="text-blue-600" size={24} />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-gray-800">Assistente Virtual</h2>
          <p className="text-sm text-gray-500 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-400' : 'bg-green-400'} animate-pulse`}></span>
            {isLoading ? "Digitando..." : "Online"}
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex items-start gap-3 ${message.isAI ? "justify-start" : "justify-end"}`}
          >
            {message.isAI && (
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Bot className="text-blue-600" size={20} />
              </div>
            )}

            <div
              className={`max-w-[80%] rounded-2xl p-4 ${
                message.isAI
                  ? "bg-white shadow-md border border-gray-100"
                  : "bg-blue-600 text-white"
              }`}
            >
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {message.content}
              </p>
              <p className={`text-xs mt-2 ${message.isAI ? 'text-gray-400' : 'text-blue-200'}`}>
                {message.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>

            {!message.isAI && (
              <div className="w-10 h-10 rounded-xl overflow-hidden border flex-shrink-0">
                <img
                  src={authUser?.profilePic || "/avatar.png"}
                  alt="User Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        ))}

        {/* Typing Indicator */}
        {isLoading && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Bot className="text-blue-600" size={20} />
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-md inline-flex gap-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSubmit} className="p-4 bg-white border-t">
        <div className="relative flex items-center">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="absolute right-2 p-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default AIChat;