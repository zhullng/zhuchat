import { useRef, useState, useEffect } from "react";
import { useGroupStore } from "../store/useGroupStore";
import { useAuthStore } from "../store/useAuthStore";
import { Image, Send, X, Plus, FileText, FilePlus, FileVideo, Download } from "lucide-react";
import toast from "react-hot-toast";
import { isSocketHealthy } from "../services/socket";

const GroupMessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [imageData, setImageData] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [showOptions, setShowOptions] = useState(false);
  const [lineCount, setLineCount] = useState(1);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const optionsRef = useRef(null);
  const textareaRef = useRef(null);
  
  const { sendGroupMessage, selectedGroup } = useGroupStore();
  const { socket, checkSocketHealth } = useAuthStore();

  // Verificar saúde do socket
  useEffect(() => {
    if (!isSocketHealthy() && selectedGroup) {
      console.log("Socket não saudável no input de mensagem do grupo, verificando...");
      checkSocketHealth();
    }
  }, [selectedGroup, checkSocketHealth]);

  // Função para converter tamanho de arquivo
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    else return (bytes / 1073741824).toFixed(1) + ' GB';
  };

  // Verificar tamanho máximo de arquivo
  const isFileTooLarge = (file) => {
    const isVideo = file.type.startsWith('video/') || 
                    file.name.toLowerCase().endsWith('.mov') || 
                    file.name.toLowerCase().endsWith('.mp4');
    
    // Limite para vídeos: 50MB
    if (isVideo && file.size > 50 * 1024 * 1024) {
      return true;
    }
    
    // Limite para imagens: 15MB
    if (file.type.startsWith('image/') && file.size > 15 * 1024 * 1024) {
      return true;
    }
    
    return false;
  };

  // Upload de imagem com validações
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione um arquivo de imagem válido");
      return;
    }

    if (isFileTooLarge(file)) {
      toast.error("A imagem é muito grande. Limite: 15MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (!event.target || !event.target.result) {
        toast.error("Erro ao processar imagem");
        return;
      }
      
      setImagePreview(event.target.result);
      setImageData(event.target.result);
      setFileInfo(null);
      setFilePreview(null);
      setShowOptions(false);
    };
    reader.onerror = () => {
      toast.error("Erro ao ler a imagem");
    };
    reader.readAsDataURL(file);
  };

  // Upload de arquivo com suporte a vídeos
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/') || 
                    file.name.toLowerCase().endsWith('.mov') || 
                    file.name.toLowerCase().endsWith('.mp4');
    
    // Validar tipos de arquivo
    if (!isVideo && 
        !file.type.startsWith('image/') && 
        !file.type.includes('pdf') && 
        !file.type.includes('word') && 
        !file.type.includes('text/plain')) {
      toast.error("Tipo de arquivo não permitido");
      return;
    }
    
    // Verificar tamanho
    if (isFileTooLarge(file)) {
      toast.error("Arquivo muito grande. Por favor, escolha um arquivo menor.");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    
    reader.onload = (event) => {
      // Verificar se o resultado da leitura é válido
      if (!event.target || !event.target.result) {
        toast.error("Erro ao ler arquivo");
        setIsUploading(false);
        return;
      }
      
      // Criar preview para vídeos
      let previewUrl = null;
      if (isVideo) {
        try {
          previewUrl = URL.createObjectURL(file);
        } catch (previewError) {
          console.error("Erro ao criar preview:", previewError);
        }
      }
      
      if (previewUrl) {
        setFilePreview(previewUrl);
      }
      
      // Garantir que estamos usando o tipo MIME correto
      const fileType = isVideo ? 'video/mp4' : file.type || 'application/octet-stream';
      
      // Definir informações do arquivo com estrutura consistente
      setFileInfo({
        name: file.name,
        type: fileType,
        size: formatFileSize(file.size),
        data: event.target.result, // Dados Base64
        originalType: file.type
      });
      
      setImagePreview(null);
      setImageData(null);
      setShowOptions(false);
      setIsUploading(false);
      
      // Log para depuração (remover em produção)
      console.log("Arquivo processado:", {
        name: file.name,
        type: fileType,
        size: formatFileSize(file.size),
        dataLength: event.target.result ? event.target.result.length : 0
      });
    };
    
    reader.onerror = (error) => {
      console.error("Erro ao ler arquivo:", error);
      toast.error("Erro ao processar arquivo. Tente novamente.");
      setIsUploading(false);
    };
    
    reader.readAsDataURL(file);
  };

  // Remover anexos
  const handleRemoveAttachment = () => {
    setImagePreview(null);
    setImageData(null);
    setFileInfo(null);
    
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
      setFilePreview(null);
    }
    
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

 // Enviar mensagem - função handleSendMessage
const handleSendMessage = async (e) => {
  e.preventDefault();
  
  if ((!text.trim() && !imageData && !fileInfo) || isUploading) {
    return;
  }
  
  try {
    setIsUploading(true);
    
    const messageData = {
      text: text.trim() || ""
    };

    // Adicionar imagem se existir
    if (imageData) {
      messageData.image = imageData;
    }

    // Adicionar arquivo se existir
    if (fileInfo && fileInfo.data) {
      // Verificar se os dados do arquivo estão em um formato válido
      if (typeof fileInfo.data !== 'string') {
        throw new Error("Formato de dados do arquivo inválido");
      }
      
      // Garantir que estamos enviando um objeto com a estrutura esperada
      const fileDataStr = JSON.stringify({
        name: fileInfo.name || "arquivo",
        type: fileInfo.type || "application/octet-stream",
        size: fileInfo.size || "",
        data: fileInfo.data
      });
      
      // Atribuir como string para garantir consistência
      messageData.fileData = fileDataStr;
    }

    // Enviar mensagem
    await sendGroupMessage(selectedGroup._id, messageData);
    
    // Limpar formulário
    setText("");
    handleRemoveAttachment();
    setLineCount(1);
    
    // Resetar altura do textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = "40px";
    }
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error);
    toast.error("Erro ao enviar mensagem. Tente novamente.");
  } finally {
    setIsUploading(false);
  }
};

  // Função para ajustar a altura do textarea automaticamente
  const autoResizeTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "40px";
      const scrollHeight = textareaRef.current.scrollHeight;
      const lineHeight = 20;
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
  
  useEffect(() => {
    autoResizeTextarea();
  }, [text]);
  
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
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };
  
  const getFileIcon = (fileType) => {
    if (!fileType) return <FileText size={24} />;
    
    if (fileType.startsWith('image/')) return <Image size={24} />;
    if (fileType.startsWith('video/')) return <FileVideo size={24} />;
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
                {filePreview && fileInfo.type.startsWith('video/') ? (
                  <div className="flex items-center">
                    <video
                      src={filePreview}
                      className="w-20 h-20 object-cover rounded-lg"
                      preload="metadata"
                    />
                    <span className="ml-2 text-sm">
                      {!fileInfo.data && isUploading ? (
                        <span className="flex items-center">
                          Carregando vídeo
                          <span className="loading loading-dots loading-xs ml-1"></span>
                        </span>
                      ) : (
                        "Vídeo anexado"
                      )}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <div className="p-2 bg-base-100 rounded-lg">
                      {getFileIcon(fileInfo.type)}
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
                  onClick={handleRemoveAttachment}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300 
                  flex items-center justify-center"
                  type="button"
                  disabled={isUploading}
                >
                  <X className="size-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
  
      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <div className="relative">
          <button
            type="button"
            className="btn btn-circle btn-md hover:bg-base-300"
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
                  imageInputRef.current?.click();
                  setShowOptions(false);
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
                  fileInputRef.current?.click();
                  setShowOptions(false);
                }}
                disabled={isUploading}
              >
                <FileText size={20} className="text-base-content opacity-70" />
                <span>Enviar arquivo</span>
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
              wordWrap: "break-word",
              overflowWrap: "break-word",
              whiteSpace: "pre-wrap"
            }}
            disabled={isUploading}
          />
        </div>
        
        <button
          type="submit"
          className="btn btn-sm btn-circle hover:bg-base-300"
          disabled={(!text.trim() && !imageData && !fileInfo) || isUploading}
        >
          {isUploading ? (
            <span className="loading loading-spinner loading-xs"></span>
          ) : (
            <Send size={22} />
          )}
        </button>
        
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={imageInputRef}
          onChange={handleImageChange}
          disabled={isUploading}
        />
        
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
  
export default GroupMessageInput;