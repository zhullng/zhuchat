import { useRef, useState, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image, Send, X, Plus, FileText } from "lucide-react";
import toast from "react-hot-toast";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [showOptions, setShowOptions] = useState(false);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const optionsRef = useRef(null);
  const textareaRef = useRef(null);
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
    if (imageInputRef.current) imageInputRef.current.value = "";
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
      if (imageInputRef.current) imageInputRef.current.value = "";
      
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
        // Limiting max height to 120px
        const newHeight = Math.min(scrollHeight, 120);
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
    <div className="p-4 w-full">
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

      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <div className="relative">
          <button
            type="button"
            className="btn btn-circle btn-md hover:bg-base-300"
            onClick={() => setShowOptions(!showOptions)}
          >
            <Plus size={22} />
          </button>
          
          {showOptions && (
            <div 
              ref={optionsRef}
              className="absolute bottom-16 left-0 bg-base-100 rounded-md shadow-md border border-base-300 p-1 z-10 min-w-48"
            >
              <button
                type="button"
                className="flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-base-200 rounded-sm transition-colors"
                onClick={() => {
                  imageInputRef.current?.click();
                  setShowOptions(false);
                }}
              >
                <Image size={20} className="text-base-content opacity-70" />
                <span>Upload imagem</span>
              </button>
              
              <button
                type="button"
                className="flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-base-200 rounded-sm transition-colors"
                onClick={() => {
                  fileInputRef.current?.click();
                  setShowOptions(false);
                }}
              >
                <FileText size={20} className="text-base-content opacity-70" />
                <span>Upload arquivo</span>
              </button>
            </div>
          )}
        </div>
        
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            className="w-full textarea textarea-bordered rounded-md py-2 px-4 min-h-10 max-h-32 overflow-y-auto resize-none hover:border-base-300"
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            style={{ height: "40px" }}
          />
        </div>
        
        <button
          type="submit"
          className="btn btn-sm btn-circle hover:bg-base-300"
          disabled={!text.trim() && !imagePreview}
        >
          <Send size={22} />
        </button>
        
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={imageInputRef}
          onChange={handleImageChange}
        />
        
        <input
          type="file"
          className="hidden"
          ref={fileInputRef}
          onChange={(e) => {
            // Implementar lógica para upload de arquivos aqui
            toast.success("Arquivo selecionado: " + e.target.files[0]?.name);
            setShowOptions(false);
          }}
        />
      </form>
    </div>
  );
};

export default MessageInput;