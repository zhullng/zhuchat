import { useRef, useState, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { PaperclipIcon, ImageIcon, Send, X, Plus, Github, HardDrive, Camera } from "lucide-react";
import toast from "react-hot-toast";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [showOptions, setShowOptions] = useState(false);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const optionsRef = useRef(null);
  const { sendMessage } = useChatStore();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
      setShowOptions(false);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview) return;

    try {
      await sendMessage({
        text: text.trim(),
        image: imagePreview,
      });

      // Clear form
      setText("");
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "40px";
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  // Função para ajustar a altura do textarea automaticamente
  const autoResizeTextarea = () => {
    if (textareaRef.current) {
      // Reset height to base height
      textareaRef.current.style.height = "40px";
      
      // Set the height to scrollHeight to fit all content
      const scrollHeight = textareaRef.current.scrollHeight;
      
      // Se o texto for vazio ou tiver apenas uma linha, mantenha a altura mínima
      if (text.trim() === "" || scrollHeight <= 40) {
        textareaRef.current.style.height = "40px";
      } else {
        // Limiting max height to 150px
        const newHeight = Math.min(scrollHeight, 150);
        textareaRef.current.style.height = `${newHeight}px`;
      }
    }
  };

  // Ajustar a altura do textarea quando o texto muda
  useEffect(() => {
    autoResizeTextarea();
  }, [text]);

  // Fechar menu de opções quando clicar fora dele
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (optionsRef.current && !optionsRef.current.contains(event.target)) {
        setShowOptions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Lidar com tecla Enter (Enviar com Enter, nova linha com Shift+Enter)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  return (
    <div className="px-4 pb-4 w-full">
      {imagePreview && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
            />
            <button
              onClick={removeImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300
              flex items-center justify-center"
              type="button"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      <div className="w-full max-w-4xl mx-auto">
        <form onSubmit={handleSendMessage}>
          <div className="relative flex items-center rounded-full border border-zinc-300 dark:border-zinc-700 shadow-sm hover:shadow-md transition-all duration-200 bg-white dark:bg-zinc-800 overflow-hidden">
            <div className="relative">
              <button
                type="button"
                className="flex items-center justify-center w-10 h-10 ml-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                onClick={() => setShowOptions(!showOptions)}
              >
                <Plus size={20} className="text-zinc-500 dark:text-zinc-400" />
              </button>
              
              {showOptions && (
                <div 
                  ref={optionsRef}
                  className="absolute bottom-12 left-0 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 p-1 z-10 min-w-48"
                >
                  <button
                    type="button"
                    className="flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <PaperclipIcon size={20} className="text-zinc-500" />
                    <span>Fazer upload de arquivo</span>
                  </button>
                  
                  <button
                    type="button"
                    className="flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera size={20} className="text-zinc-500" />
                    <span>Fazer captura de tela</span>
                  </button>
                  
                  <button
                    type="button"
                    className="flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md transition-colors"
                  >
                    <Github size={20} className="text-zinc-500" />
                    <span>Adicionar do GitHub</span>
                  </button>
                  
                  <button
                    type="button"
                    className="flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md transition-colors"
                  >
                    <HardDrive size={20} className="text-zinc-500" />
                    <span>Adicionar do Google Drive</span>
                  </button>
                </div>
              )}
            </div>
            
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                className="w-full pl-1 pr-12 py-2.5 bg-transparent border-none focus:outline-none resize-none min-h-10 overflow-y-auto"
                placeholder="Digite uma mensagem..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                style={{ height: "40px" }}
              />
            </div>
            
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <button
                type="submit"
                className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!text.trim() && !imagePreview}
              >
                <Send size={16} />
              </button>
            </div>
            
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImageChange}
            />
          </div>
        </form>
      </div>
    </div>
  );
};

export default MessageInput;