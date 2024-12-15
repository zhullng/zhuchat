import { useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image, Send, X } from "lucide-react";
import toast from "react-hot-toast";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const { sendMessage } = useChatStore();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    toast.error(file);
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      toast.error(reader.result);
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    
    // Exibe uma mensagem toast com informações úteis sobre o arquivo
    if (!file) {
      toast.error("No file selected.");
      return;
    }
  
    // Exibe erro caso o arquivo não seja uma imagem
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file.");
      return;
    }
  
    // Exibindo informações do arquivo no toast
    toast.success(`File selected: ${file.name} (${file.size} bytes)`);
  
    const reader = new FileReader();
    reader.onloadend = () => {
      // Após a leitura do arquivo, mostra um toast de sucesso
      toast.success("Image loaded successfully.");
      
      // Definindo a imagem no estado para pré-visualização
      setImagePreview(reader.result);
    };
  
    reader.onerror = (error) => {
      toast.error("Failed to load image.");
    };
  
    // Lê o arquivo como uma URL de dados (DataURL)
    reader.readAsDataURL(file);
  };
  
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview) return;
  
    try {
      // Envia a mensagem com o texto e a imagem (em base64)
      await sendMessage({
        text: text.trim(),
        image: imagePreview,
      });
  
      // Limpar o formulário após o envio
      setText("");
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
  
      toast.success("Message sent successfully!");
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message: " + error.message);
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
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            className="w-full input input-bordered rounded-lg input-md"
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageChange}
          />

          <button
            type="button"
            className={`flex btn btn-circle
                     ${imagePreview ? "text-emerald-500" : "text-zinc-400"}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Image size={20} />
          </button>
        </div>
        <button
          type="submit"
          className="btn btn-sm btn-circle"
          disabled={!text.trim() && !imagePreview}
        >
          <Send size={22} />
        </button>
      </form>
    </div>
  );
};
export default MessageInput;
