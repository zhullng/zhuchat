import { useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image, Send, X } from "lucide-react";
import toast from "react-hot-toast";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const { sendMessage } = useChatStore();

  const compressImage = ({
    file,
    maxWidth = 800,
    maxHeight = 800,
    quality = 0.7,
    minQuality = 0.3,
    maxSizeInMB = 1,
  }) => {
    return new Promise((resolve, reject) => {
      // Validate input
      if (!file || !file.type.startsWith('image/')) {
        reject(new Error('Tipo de arquivo inválido. Por favor, forneça um arquivo de imagem.'));
        return;
      }

      const img = new window.Image();
      const reader = new FileReader();

      reader.onload = () => {
        img.src = reader.result;
      };

      reader.onerror = () => {
        reject(new Error('Falha ao ler o arquivo.'));
      };

      img.onload = () => {
        // Create canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Calculate dimensions while maintaining aspect ratio
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }
        
        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw image on canvas with white background for PNG transparency
        if (file.type === 'image/png') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
        }
        ctx.drawImage(img, 0, 0, width, height);

        // Determine output format and mime type
        let outputFormat, mimeType;
        const originalFormat = file.type.toLowerCase();

        // Handle different image formats
        switch (originalFormat) {
          case 'image/png':
            outputFormat = 'png';
            mimeType = 'image/png';
            break;
          case 'image/webp':
            outputFormat = 'webp';
            mimeType = 'image/webp';
            break;
          case 'image/gif':
            outputFormat = 'gif';
            mimeType = 'image/gif';
            break;
          default:
            outputFormat = 'jpeg';
            mimeType = 'image/jpeg';
        }

        // Try compression with initial quality
        let currentQuality = quality;
        let compressedDataUrl;
        let attempt = 0;
        const MAX_ATTEMPTS = 5;

        // Compression loop - keeps trying until size is under maxSizeInMB
        do {
          try {
            compressedDataUrl = canvas.toDataURL(mimeType, 
              // Only apply quality parameter for JPEG and WEBP
              ['image/jpeg', 'image/webp'].includes(mimeType) ? currentQuality : undefined
            );
          } catch (e) {
            // Fallback to JPEG if format is not supported
            compressedDataUrl = canvas.toDataURL('image/jpeg', currentQuality);
            outputFormat = 'jpeg';
            mimeType = 'image/jpeg';
          }
          
          // Calculate size in MB
          const sizeInMB = (compressedDataUrl.length * 3) / 4 / (1024 * 1024);
          
          // Break if size is acceptable or we've reached minimum quality
          if (sizeInMB <= maxSizeInMB || currentQuality <= minQuality) {
            break;
          }

          // Reduce quality for next attempt
          currentQuality = Math.max(currentQuality - 0.1, minQuality);
          attempt++;
        } while (attempt < MAX_ATTEMPTS);

        // Convert base64 to Blob
        fetch(compressedDataUrl)
          .then(res => res.blob())
          .then(blob => {
            // Create a new File object
            const compressedFile = new File(
              [blob],
              `compressed_${file.name.replace(/\.[^/.]+$/, '')}.${outputFormat}`,
              { type: mimeType }
            );

            resolve({
              file: compressedFile,
              dataUrl: compressedDataUrl,
              width,
              height,
              quality: currentQuality,
              originalSize: file.size,
              compressedSize: compressedFile.size,
              compressionRatio: (1 - (compressedFile.size / file.size)) * 100,
              format: outputFormat
            });
          })
          .catch(error => reject(new Error('Falha ao criar o arquivo comprimido.')));
      };

      img.onerror = () => {
        reject(new Error('Falha ao carregar a imagem.'));
      };

      reader.readAsDataURL(file);
    });
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Verificando se o formato da imagem é compatível
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione um arquivo de imagem.");
      return;
    }

    // Verificando se o formato da imagem é HEIC/HEIF, que não é suportado diretamente no navegador
    if (file.type === "image/heic" || file.type === "image/heif") {
      toast.error("Formato HEIC/HEIF não suportado diretamente no navegador.");
      return;
    }

    try {
      const result = await compressImage({
        file,
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.7,
        minQuality: 0.3,
        maxSizeInMB: 1
      });

      setImagePreview(result.dataUrl);
      
      // Log dos resultados da compressão
      console.log('Resultados da compressão:', {
        originalSize: `${(result.originalSize / 1024 / 1024).toFixed(2)}MB`,
        compressedSize: `${(result.compressedSize / 1024 / 1024).toFixed(2)}MB`,
        compressionRatio: `${result.compressionRatio.toFixed(1)}%`,
        dimensions: `${result.width}x${result.height}`,
        quality: result.quality,
        format: result.format
      });
    } catch (error) {
      toast.error(error.message || "Falha ao comprimir a imagem.");
      if (fileInputRef.current) fileInputRef.current.value = "";
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

      // Limpar o formulário
      setText("");
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Falha ao enviar a mensagem:", error);
      toast.error("Falha ao enviar a mensagem");
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
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300 flex items-center justify-center"
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
            placeholder="Digite uma mensagem..."
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
            className={`flex btn btn-circle ${imagePreview ? "text-emerald-500" : "text-zinc-400"}`}
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
