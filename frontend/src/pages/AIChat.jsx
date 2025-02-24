import { useState, useEffect, useRef } from "react";
import { getAIResponse } from "../../../backend/src/lib/ai";
import { useAuthStore } from "../store/useAuthStore";
import { Bot, Send, X } from "lucide-react";

const AIChat = ({ setSelectedUser }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const { authUser } = useAuthStore();

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessage = {
      content: input,
      isAI: false,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInput("");
    setIsTyping(true);

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
      setIsTyping(false);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col">
      {/* Chat Header */}
      <div className="border-b border-base-300 p-4 flex items-center gap-3 w-full">
        <div className="size-10 rounded-full border flex items-center justify-center">
          <Bot className="text-blue-600" size={24} />
        </div>
        <div>
          <h2 className="font-semibold">Assistente Virtual</h2>
          <p className="text-sm flex items-center gap-2">Online</p>
        </div>
        <button onClick={() => setSelectedUser(null)} className="ml-auto">
          <X size={24} />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 w-full">
        {messages.map((message, index) => (
          <div key={index} className={`chat ${message.isAI ? "chat-start" : "chat-end"}`}>
            <div className="chat-image avatar">
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

            <div className="flex flex-col">
              <div className="chat-header mb-1">
                <time className="text-xs opacity-50 ml-1">
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </div>

              <div className="chat-bubble px-4 py-2 rounded-2xl max-w-xs sm:max-w-md break-words">
                {message.content}
              </div>
            </div>
          </div>
        ))}

        {/* Animação dos círculos digitando */}
        {isTyping && (
          <div className="chat chat-start">
            <div className="chat-image avatar">
              <div className="size-10 rounded-full border overflow-hidden flex items-center justify-center">
                <Bot className="text-blue-600" size={20} />
              </div>
            </div>
            <div className="chat-bubble px-4 py-2 rounded-2xl max-w-xs sm:max-w-md flex items-center">
              <div className="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="sticky bottom-0 w-full">
        <form onSubmit={handleSubmit} className="p-4 flex items-center gap-2 w-full">
          <div className="flex-1 flex gap-2 w-full">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua mensagem..."
              className="w-full input input-bordered rounded-full input-md"
            />
            <button type="submit" className="btn btn-sm btn-circle mt-2" disabled={!input.trim()}>
              <Send size={22} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AIChat;
