import { useState, useEffect, useRef } from "react";
import { getAIResponse } from "../../../backend/src/lib/ai";
import { useAuthStore } from "../store/useAuthStore";
import { Bot, Send } from "lucide-react";
import MessageSkeleton from "../components/skeletons/MessageSkeleton"; 

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
    <div className="flex-1 flex flex-col overflow-auto">
      {/* Chat Header */}
      <div className="border-b border-base-300 p-4 flex items-center gap-3">
        <div className="size-10 rounded-full border overflow-hidden flex items-center justify-center">
          <Bot className="text-blue-600" size={24} />
        </div>
        <div>
          <h2 className="font-semibold">Assistente Virtual</h2>
          <p className="text-sm flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-400' : 'bg-green-400'} animate-pulse`}
            ></span>
            {isLoading ? "Digitando..." : "Online"}
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <MessageSkeleton />
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`chat ${message.isAI ? "chat-start" : "chat-end"}`}
              ref={messagesEndRef}
            >
              {/* Avatar */}
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

              {/* Message Content */}
              <div className="flex flex-col">
                {/* Timestamp outside of message bubble */}
                <div className="chat-header mb-1">
                  <time className="text-xs opacity-50 ml-1">
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </div>

                {/* Message Bubble */}
                <div className="chat-bubble bg-blue-500 text-white px-4 py-2 rounded-lg max-w-xs sm:max-w-md break-words text-sm">
                  {message.content}
                </div>
              </div>
            </div>
          ))
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="sticky bottom-0 w-full">
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
              className="btn btn-sm btn-circle mt-2"
              disabled={!input.trim()}
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
