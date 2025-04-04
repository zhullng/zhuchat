import { useRef, useState, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image, Send, X, Plus, FileText, FilePlus } from "lucide-react";
import toast from "react-hot-toast";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [imageData, setImageData] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [showOptions, setShowOptions] = useState(false);
  const [lineCount, setLineCount] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const optionsRef = useRef(null);
  const textareaRef = useRef(null);
  const { sendMessage, selectedUser } = useChatStore();

  // Função para converter tamanho de arquivo para formato legível
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    else return (bytes / 1073741824).toFixed(1) + ' GB';
  };

  // Tratamento de imagens - sem restrição de tamanho
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione um arquivo de imagem");
      return;
    }

    // Mostrar feedback durante o carregamento para ficheiros grandes
    if (file.size > 5 * 1024 * 1024) { // 5MB
      toast.loading("Preparando imagem grande...", { id: "image-loading" });
    }
    
    const reader = new FileReader();
    
    reader.onload = () => {
      if (toast.isActive("image-loading")) {
        toast.dismiss("image-loading");
      }
      
      setImagePreview(reader.result);
      setImageData(reader.result);
      // Limpar qualquer arquivo previamente selecionado
      setFileInfo(null);
      setShowOptions(false);
    };
    
    reader.onerror = () => {
      if (toast.isActive("image-loading")) {
        toast.dismiss("image-loading");
      }
      toast.error("Erro ao ler a imagem");
    };
    
    reader.readAsDataURL(file);
  };

  // Tratamento de ficheiros - sem restrição de tipo ou tamanho
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Mostrar feedback durante o carregamento para ficheiros grandes
    if (file.size > 10 * 1024 * 1024) { // 10MB
      toast.loading("Preparando ficheiro grande...", { id: "file-loading" });
    }
    
    const reader = new FileReader();
    
    reader.onload = () => {
      if (toast.isActive("file-loading")) {
        toast.dismiss("file-loading");
      }
      
      // Guardar informações do arquivo
      setFileInfo({
        name: file.name,
        type: file.type,
        size: formatFileSize(file.size),
        data: reader.result
      });
      
      // Limpar qualquer imagem previamente selecionada
      setImagePreview(null);
      setImageData(null);
      setShowOptions(false);
    };
    
    reader.onerror = () => {
      if (toast.isActive("file-loading")) {
        toast.dismiss("file-loading");
      }
      toast.error("Erro ao ler o ficheiro");
    };
    
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    setImageData(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const removeFile = () => {
    setFileInfo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Reset todos estados quando mudar de chat
  useEffect(() => {
    setText("");
    setImagePreview(null);
    setImageData(null);
    setFileInfo(null);
    setShowOptions(false);
    setLineCount(1);
    setIsUploading(false);
    
    if (textareaRef.current) {
      textareaRef.current.style.height = "40px";
    }
  }, [selectedUser?._id]);

  // Envio de mensagem com suporte a ficheiros de qualquer tamanho
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!text.trim() && !imageData && !fileInfo) || isUploading) return;
    
    try {
      setIsUploading(true);
      
      // Preparar dados para envio
      const messageData = {
        text: text.trim() || ""
      };

      // Mostrar toast de carregamento
      let toastId;
      
      // Se houver uma imagem, adicionar aos dados
      if (imageData) {
        toastId = toast.loading("Enviando imagem... Este processo pode demorar para imagens grandes.");
        messageData.image = imageData;
      }

      // Se houver um arquivo, adicionar aos dados
      if (fileInfo) {
        toastId = toast.loading(`Enviando ${fileInfo.name}... Este processo pode demorar para ficheiros grandes.`);
        messageData.file = {
          data: fileInfo.data,
          type: fileInfo.type,
          name: fileInfo.name,
          size: fileInfo.size
        };
      }

      // Enviar mensagem
      await sendMessage(messageData);
      
      // Remover toast de carregamento se existir
      if (toastId) {
        toast.dismiss(toastId);
        toast.success(
          fileInfo 
            ? "Ficheiro enviado com sucesso!" 
            : imageData 
              ? "Imagem enviada com sucesso!" 
              : "Mensagem enviada com sucesso!"
        );
      }

      // Limpar formulário
      setText("");
      setImagePreview(null);
      setImageData(null);
      setFileInfo(null);
      setLineCount(1);
      
      if (imageInputRef.current) imageInputRef.current.value = "";
      if (fileInputRef.current) fileInputRef.current.value = "";
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "40px";
      }
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      
      // Mensagens de erro mais específicas
      if (error.name === 'AbortError') {
        toast.error("O envio demorou muito tempo e foi cancelado. Tente com um ficheiro menor.");
      } else if (error.response && error.response.status === 413) {
        toast.error("O ficheiro é muito grande para ser enviado.");
      } else if (error.response && error.response.status === 500 && error.response.data?.error?.includes("Cloudinary")) {
        toast.error("Erro no servidor de armazenamento. Tente novamente mais tarde.");
      } else {
        toast.error("Erro ao enviar mensagem. Verifique sua conexão e tente novamente.");
      }
    } finally {
      setIsUploading(false);
    }
  };

  // Função para ajustar a altura do textarea automaticamente
  const autoResizeTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "40px";
      const scrollHeight = textareaRef.current.scrollHeight;
      const lineHeight = 20; // Altura estimada de uma linha em pixels
      const currentLines = Math.ceil(scrollHeight / lineHeight);
      setLineCount(currentLines);
      
      if (text.trim() === "" || scrollHeight <= 40) {
        textareaRef.current.style.height = "40px";
        setLineCount(1);
      } else if (currentLines <= 2) {
        textareaRef.current.style.height = `${scrollHeight}px`;
      } else {
        const newHeight = Math.min(scrollHeight, 80);
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
      if (optionsRef.current && !optionsRef.current.contains(event.target) && 
          !event.target.closest('.attach-button')) {
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

  // Determinar o ícone do arquivo com base no tipo MIME
  const getFileIcon = (fileType) => {
    if (!fileType) return <FileText size={24} />;
    
    if (fileType.startsWith('image/')) return <Image size={24} />;
    if (fileType.startsWith('video/')) return <FilePlus size={24} />;
    if (fileType.startsWith('audio/')) return <FilePlus size={24} />;
    if (fileType.includes('pdf')) return <FileText size={24} />;
    if (fileType.includes('word') || fileType.includes('document')) return <FileText size={24} />;
    if (fileType.includes('excel') || fileType.includes('sheet')) return <FileText size={24} />;
    
    return <FileText size={24} />;
  };

  return (
    <div className="p-4 w-full bg-base-100">
      {/* Preview de arquivo ou imagem */}
      {(imagePreview || fileInfo) && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative p-2 bg-base-200 rounded-lg border border-base-300">
            {imagePreview ? (
              // Preview de imagem
              <div className="flex items-center">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-20 h-20 object-cover rounded-lg"
                />
                <span className="ml-2 text-sm">Imagem anexada</span>
              </div>
            ) : fileInfo ? (
              // Preview de arquivo
              <div className="flex items-center">
                <div className="p-2 bg-base-100 rounded-lg">
                  {getFileIcon(fileInfo.type)}
                </div>
                <div className="ml-2">
                  <p className="text-sm font-medium truncate max-w-[150px]">{fileInfo.name}</p>
                  <p className="text-xs opacity-70">{fileInfo.size}</p>
                </div>
              </div>
            ) : null}
            
            <button
              onClick={imagePreview ? removeImage : removeFile}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300
              flex items-center justify-center"
              type="button"
              disabled={isUploading}
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
            className="btn btn-circle btn-md hover:bg-base-300 attach-button"
            onClick={() => setShowOptions(!showOptions)}
            disabled={isUploading}
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
                  if (imageInputRef.current) {
                    imageInputRef.current.click();
                  }
                }}
                disabled={isUploading}
              >
                <Image size={20} className="text-base-content opacity-70" />
                <span>Enviar imagem</span>
              </button>
              
              <button
                type="button"
                className="flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-base-200 rounded-sm transition-colors"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.click();
                  }
                }}
                disabled={isUploading}
              >
                <FileText size={20} className="text-base-content opacity-70" />
                <span>Enviar qualquer ficheiro</span>
              </button>
            </div>
          )}
        </div>
        
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            className={`w-full textarea textarea-bordered rounded-md py-2 px-4 min-h-10 resize-none focus:outline-none focus:ring-0 focus:border-base-300 break-words ${lineCount > 2 ? 'overflow-y-auto max-h-20' : 'overflow-hidden'}`}
            placeholder="Digite uma mensagem..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            style={{ 
              height: "40px",
              scrollbarWidth: "thin",
              msOverflowStyle: "none",
              wordWrap: "break-word",
              overflowWrap: "break-word",
              whiteSpace: "pre-wrap"
            }}
            disabled={isUploading}
          />
        </div>
        
        <button
          type="submit"
          className={`btn btn-sm btn-circle hover:bg-base-300`}
          disabled={(!text.trim() && !imageData && !fileInfo) || isUploading}
        >
          {isUploading ? (
            <span className="loading loading-spinner loading-xs"></span>
          ) : (
            <Send size={22} />
          )}
        </button>
        
        {/* Input para upload de imagem (hidden) - sem restrição de tamanho */}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={imageInputRef}
          onChange={handleImageChange}
          disabled={isUploading}
        />
        
        {/* Input para upload de arquivo (hidden) - sem restrição de tipo ou tamanho */}
        <input
          type="file"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
          disabled={isUploading}
        />
      </form>
    </div>
  );
};

export default MessageInput;