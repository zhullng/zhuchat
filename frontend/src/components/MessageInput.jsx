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
    if (!file) return;
  
    // Verificação de tipo MIME e extensão
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif'];
    const fileExtension = file.name.split('.').pop().toLowerCase();
  
    if (!file.type.startsWith('image/') || !allowedExtensions.includes(fileExtension)) {
      toast.error("Por favor, selecione uma imagem válida (jpg, jpeg, png, gif).");
      return;
    }
  
    // Verificação de tamanho de arquivo (máximo 10MB)
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      toast.error("O tamanho do arquivo excede o limite de 10MB.");
      return;
    }
  
    // Usando FileReader para ler a imagem
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result); // Atualiza a pré-visualização
    };
  
    reader.onerror = (error) => {
      console.error("Erro ao ler o arquivo:", error);
      toast.error("Erro ao tentar carregar a imagem. Tente novamente.");
    };
  
    reader.readAsDataURL(file);
  };
  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
  
    // Verificação de conteúdo para enviar (texto ou imagem)
    if (!text.trim() && !imagePreview) {
      toast.error("Por favor, insira uma mensagem ou selecione uma imagem.");
      return;
    }
  
    try {
      // Envia a mensagem (texto ou imagem)
      await sendMessage({
        text: text.trim(),
        image: imagePreview,
      });
  
      // Limpar formulário após envio
      setText("");
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
  
    } catch (error) {
      // Captura e exibe erros durante o envio
      console.error("Erro ao enviar a mensagem:", error);
      toast.error("Falha ao enviar a mensagem. Tente novamente.");
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
