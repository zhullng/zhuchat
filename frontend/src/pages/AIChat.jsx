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
    <div className="flex-1 flex flex-col overflow-auto">
    {/* Chat Header */}
    <div className="border-b p-4 flex items-center gap-3">
      <div className="size-10 rounded-full border overflow-hidden flex items-center justify-center">
        <Bot className="text-blue-600" size={24} />
      </div>
      <div>
        <h2 className="font-semibold">Assistente Virtual</h2>
        <p className="text-sm text-gray-500 flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-400' : 'bg-green-400'} animate-pulse`}></span>
          {isLoading ? "Digitando..." : "Online"}
        </p>
      </div>
    </div>

    {/* Messages Area */}
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Aqui seria onde você renderiza as mensagens (código omitido para clareza) */}
    </div>

    {/* Message Input */}
    <div className="sticky bottom-0 w-full border-t">
      <form onSubmit={handleSubmit} className="p-4 flex items-center gap-2">
        {/* Preview da Imagem */}
        {imagePreview && (
          <div className="p-4 w-full mb-3 flex items-center gap-2">
            <div className="relative">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
              />
              <button
                onClick={removeImage}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300 flex items-center justify-center"
                type="button"
              >
                <X className="size-3" />
              </button>
            </div>
          </div>
        )}

        {/* Input and File Attachment */}
        <div className="flex-1 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="w-full input input-bordered rounded-lg input-md"
            disabled={isLoading}
          />

          {/* Botão para abrir o seletor de arquivos */}
          <button
            type="button"
            className={`flex btn btn-circle ${imagePreview ? "text-emerald-500" : "text-zinc-400"}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Image size={20} />
          </button>

          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageChange}
          />
        </div>

        {/* Botão de envio */}
        <button
          type="submit"
          className="btn btn-sm btn-circle"
          disabled={!input.trim() && !imagePreview} // Desabilita o botão se nada for digitado e não houver imagem
        >
          <Send size={22} />
        </button>
      </form>
    </div>
  </div>
  );
};

export default AIChat;