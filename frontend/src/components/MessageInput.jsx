import { useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image, Send, X } from "lucide-react";
import toast from "react-hot-toast";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const { sendMessage } = useChatStore();


  const compressImage = (file, maxWidth = 800, maxHeight = 800, quality = 0.7) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
  
      reader.onload = () => {
        img.src = reader.result;
      };
  
      reader.onerror = (err) => {
        reject("Failed to read file.");
      };
  
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
  
        // Calcula as novas dimensões da imagem com base nas dimensões máximas
        const scaleFactor = Math.min(maxWidth / img.width, maxHeight / img.height);
        const width = img.width * scaleFactor;
        const height = img.height * scaleFactor;
  
        // Define as dimensões do canvas
        canvas.width = width;
        canvas.height = height;
  
        // Desenha a imagem comprimida no canvas
        ctx.drawImage(img, 0, 0, width, height);
  
        // Converte o canvas em uma imagem compactada (base64)
        canvas.toDataURL("image/jpeg", quality, (dataUrl) => {
          resolve(dataUrl); // Retorna a imagem comprimida
        });
      };
  
      img.onerror = (err) => {
        reject("Failed to load image.");
      };
  
      // Lê a imagem como URL de dados
      reader.readAsDataURL(file);
    });
  };

  
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
  
    try {
      // Chama a função compressImage para reduzir o tamanho da imagem
      const compressedImage = await compressImage(file);
      setImagePreview(compressedImage);
    } catch (error) {
      toast.error("Failed to compress image");
    }
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
    } catch (error) {
      console.error("Failed to send message:", error);
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
