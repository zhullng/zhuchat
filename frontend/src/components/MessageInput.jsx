import React, { useRef, useState, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image, Send, X, Plus, FileText, FilePlus } from "lucide-react";
import toast from "react-hot-toast";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [imageData, setImageData] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [showOptions, setShowOptions] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [lineCount, setLineCount] = useState(1);

  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const textareaRef = useRef(null);

  const { sendMessage, selectedUser } = useChatStore();

  // Debug useEffect
  useEffect(() => {
    console.log("Image Preview State:", imagePreview);
    console.log("Image Data State:", imageData);
    console.log("File Info State:", fileInfo);
  }, [imagePreview, imageData, fileInfo]);

  // Função auxiliar para formatar tamanho do arquivo
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  // Função de upload de imagem com debug detalhado
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    console.log("Imagem selecionada:", file);

    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione um arquivo de imagem");
      return;
    }

    const reader = new FileReader();
    
    reader.onloadstart = () => {
      console.log("Iniciando leitura da imagem");
    };

    reader.onload = (event) => {
      console.log("Imagem carregada com sucesso");
      console.log("Tamanho da imagem (bytes):", event.target.result.length);
      console.log("Tipo de imagem:", file.type);
      
      setImagePreview(event.target.result);
      setImageData(event.target.result);
      setFileInfo(null);
      setShowOptions(false);
    };
    
    reader.onerror = (error) => {
      console.error("Erro ao ler imagem:", error);
      toast.error("Erro ao carregar imagem");
    };
    
    reader.readAsDataURL(file);
  };

  // Função de upload de arquivo com debug detalhado
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    console.log("Arquivo selecionado:", file);

    if (!file) return;

    const reader = new FileReader();
    
    reader.onloadstart = () => {
      console.log("Iniciando leitura do arquivo");
    };

    reader.onload = (event) => {
      console.log("Arquivo carregado com sucesso");
      console.log("Tamanho do arquivo (bytes):", event.target.result.length);
      console.log("Tipo do arquivo:", file.type);
      
      setFileInfo({
        name: file.name,
        type: file.type,
        size: formatFileSize(file.size),
        data: event.target.result
      });
      
      setImagePreview(null);
      setImageData(null);
      setShowOptions(false);
    };
    
    reader.onerror = (error) => {
      console.error("Erro ao ler arquivo:", error);
      toast.error("Erro ao carregar arquivo");
    };
    
    reader.readAsDataURL(file);
  };

  // Função para enviar mensagem com mais detalhes
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    console.log("Enviando mensagem:", {
      text,
      imageData: !!imageData,
      fileInfo: !!fileInfo
    });

    if ((!text.trim() && !imageData && !fileInfo) || isUploading) return;
    
    try {
      setIsUploading(true);
      
      const messageData = {
        text: text.trim() || ""
      };

      if (imageData) {
        messageData.image = imageData;
      }

      if (fileInfo) {
        messageData.file = {
          data: fileInfo.data,
          type: fileInfo.type,
          name: fileInfo.name,
          size: fileInfo.size
        };
      }

      const result = await sendMessage(messageData);
      
      // Limpar após envio
      setText("");
      setImagePreview(null);
      setImageData(null);
      setFileInfo(null);
      setLineCount(1);
      
      if (imageInputRef.current) imageInputRef.current.value = "";
      if (fileInputRef.current) fileInputRef.current.value = "";
      
      if (textareaRef.current) {
        textareaRef.current.style.height = "40px";
      }
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-4 w-full bg-base-100">
      {/* Preview de arquivo ou imagem */}
      {(imagePreview || fileInfo) && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative p-2 bg-base-200 rounded-lg border border-base-300">
            {imagePreview && (
              <div className="flex items-center">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-20 h-20 object-cover rounded-lg"
                />
                <span className="ml-2 text-sm">Imagem anexada</span>
              </div>
            )}
            
            {fileInfo && (
              <div className="flex items-center">
                <div className="p-2 bg-base-100 rounded-lg">
                  <FileText size={24} />
                </div>
                <div className="ml-2">
                  <p className="text-sm font-medium truncate max-w-[150px]">
                    {fileInfo.name}
                  </p>
                  <p className="text-xs opacity-70">{fileInfo.size}</p>
                </div>
              </div>
            )}
            
            <button
              onClick={() => {
                setImagePreview(null);
                setImageData(null);
                setFileInfo(null);
                if (imageInputRef.current) imageInputRef.current.value = "";
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300 flex items-center justify-center"
              type="button"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      {/* Resto do componente de input */}
      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        {/* Botão de anexar */}
        <div className="relative">
          <button
            type="button"
            className="btn btn-circle btn-md hover:bg-base-300 attach-button"
            onClick={() => setShowOptions(!showOptions)}
            disabled={isUploading}
          >
            <Plus size={22} />
          </button>
          
          {/* Opções de anexo */}
          {showOptions && (
            <div className="absolute bottom-16 left-0 bg-base-100 rounded-md shadow-md border border-base-300 p-1 z-10 min-w-48">
              <button
                type="button"
                className="flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-base-200 rounded-sm transition-colors"
                onClick={() => imageInputRef.current?.click()}
                disabled={isUploading}
              >
                <Image size={20} className="text-base-content opacity-70" />
                <span>Enviar imagem</span>
              </button>
              
              <button
                type="button"
                className="flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-base-200 rounded-sm transition-colors"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <FileText size={20} className="text-base-content opacity-70" />
                <span>Enviar qualquer ficheiro</span>
              </button>
            </div>
          )}
        </div>

        {/* Inputs ocultos para upload */}
        <input
          type="file"
          accept="image/*"
          ref={imageInputRef}
          onChange={handleImageChange}
          className="hidden"
          disabled={isUploading}
        />
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          disabled={isUploading}
        />

        {/* Textarea de mensagem */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Digite uma mensagem..."
          className="w-full textarea textarea-bordered"
          disabled={isUploading}
        />

        {/* Botão de envio */}
        <button 
          type="submit" 
          disabled={(!text.trim() && !imageData && !fileInfo) || isUploading}
          className="btn btn-circle"
        >
          <Send size={22} />
        </button>
      </form>
    </div>
  );
};

export default MessageInput;