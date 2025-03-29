import { useRef, useState, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image, Send, X } from "lucide-react";
import toast from "react-hot-toast";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const { sendMessage } = useChatStore();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
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

      <form onSubmit={handleSendMessage}>
        <div className="relative flex items-center">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              className="w-full pl-4 pr-16 py-2 rounded-full border border-base-300 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none bg-base-100 min-h-10 overflow-y-auto scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-transparent"
              placeholder="Type a message..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              style={{ height: "40px" }}
            />
            
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                type="button"
                className={`flex items-center justify-center p-1 rounded-full hover:bg-base-200 transition-colors ${imagePreview ? "text-emerald-500" : "text-zinc-400"}`}
                onClick={() => fileInputRef.current?.click()}
              >
                <Image size={18} />
              </button>
              
              <button
                type="submit"
                className="flex items-center justify-center p-1.5 rounded-full bg-primary hover:bg-primary-focus text-primary-content transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!text.trim() && !imagePreview}
              >
                <Send size={18} />
              </button>
            </div>
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
  );
};

export default MessageInput;