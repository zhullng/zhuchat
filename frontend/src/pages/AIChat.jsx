import { useState, useEffect, useRef } from "react";
import { getAIResponse } from "../../../backend/src/lib/ai";
import { useAuthStore } from "../store/useAuthStore";
import { Bot, Send, X, Copy, Check, Trash } from "lucide-react";

const AIChat = ({ setSelectedUser }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [showClearModal, setShowClearModal] = useState(false);
  const messagesEndRef = useRef(null);
  const { authUser } = useAuthStore();

  // Carregar mensagens do localStorage quando o componente montar
  useEffect(() => {
    if (authUser) {
      const savedMessages = localStorage.getItem(`aiChat_${authUser._id}`);
      if (savedMessages) {
        try {
          // Converter as strings de data de volta para objetos Date
          const parsedMessages = JSON.parse(savedMessages).map(msg => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          setMessages(parsedMessages);
        } catch (error) {
          console.error("Erro ao carregar mensagens:", error);
        }
      }
    }
  }, [authUser]);

  // Guardar mensagens no localStorage quando elas mudarem
  useEffect(() => {
    if (authUser && messages.length > 0) {
      localStorage.setItem(`aiChat_${authUser._id}`, JSON.stringify(messages));
    }
  }, [messages, authUser]);

  // Rolar para o fim das mensagens
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  // Resetar o estado "copiado" após 2 segundos
  useEffect(() => {
    if (copiedMessageId) {
      const timer = setTimeout(() => {
        setCopiedMessageId(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [copiedMessageId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessage = {
      id: Date.now().toString(),
      content: input,
      isAI: false,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const response = await getAIResponse(input);
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        content: response,
        isAI: true,
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        content: "Desculpe, ocorreu um erro. Tente novamente.",
        isAI: true,
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const copyToClipboard = (text, messageId) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopiedMessageId(messageId);
      })
      .catch(err => {
        console.error('Falha ao copiar texto: ', err);
      });
  };

  const clearChatHistory = () => {
    // Em vez de usar window.confirm, ativamos o modal personalizado
    setShowClearModal(true);
  };

  const confirmClearChat = () => {
    setMessages([]);
    if (authUser) {
      localStorage.removeItem(`aiChat_${authUser._id}`);
    }
    setShowClearModal(false);
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
        <div className="ml-auto flex items-center gap-2">
          {messages.length > 0 && (
            <button 
              onClick={clearChatHistory} 
              className="btn btn-xs btn-ghost text-error"
            >
              Limpar conversa
            </button>
          )}
          <button onClick={() => setSelectedUser(null)}>
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 w-full">
        {messages.length === 0 && (
          <div className="text-center text-base-content/50 p-8">
            <Bot size={48} className="mx-auto mb-4 text-primary/60" />
            <p>Olá! Como posso ajudar?</p>
          </div>
        )}
        
        {messages.map((message) => (
          <div key={message.id} className={`chat ${message.isAI ? "chat-start" : "chat-end"}`}>
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

              <div className="chat-bubble px-4 py-2 rounded-2xl max-w-xs sm:max-w-md break-words relative group">
                {message.content}
                
                {/* Botão de cópia posicionado no canto inferior direito */}
                {message.isAI && (
                  <button 
                    onClick={() => copyToClipboard(message.content, message.id)}
                    className={`
                      absolute -bottom-3 -right-2 size-6 rounded-full bg-base-100 border border-base-300
                      flex items-center justify-center shadow-sm
                      opacity-0 group-hover:opacity-100 transition-opacity
                      hover:bg-base-200
                    `}
                    title="Copiar mensagem"
                  >
                    {copiedMessageId === message.id ? (
                      <Check size={14} className="text-success" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Animação dos círculos digitando */}
        {isTyping && (
          <div className="chat chat-start">
            <div className="chat-image avatar">
              <div className="size-10 rounded-full border overflow-hidden">
                  <div className="w-full h-full flex items-center justify-center">
                    <Bot className="text-blue-600" size={20} />
                  </div>
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

      {/* Modal de confirmação para limpar chat */}
      {showClearModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-base-100 rounded-lg p-6 max-w-sm w-full mx-4 shadow-lg">
            <div className="text-center mb-4">
              <div className="flex justify-center mb-3">
                <div className="p-3 bg-error/10 rounded-full">
                  <Trash className="size-8 text-error" />
                </div>
              </div>
              <h3 className="text-lg font-medium mb-2">Limpar conversa</h3>
              <p className="text-sm text-base-content/70">
                Tem a certeza que deseja limpar o histórico da conversa?
              </p>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowClearModal(false)}
                className="btn btn-ghost"
              >
                Cancelar
              </button>
              <button
                onClick={confirmClearChat}
                className="btn btn-error"
              >
                Limpar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIChat;