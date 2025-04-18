// components/GroupMessageInput.jsx
import { useRef, useState, useEffect } from "react";
import { useGroupStore } from "../store/useGroupStore";
import { useAuthStore } from "../store/useAuthStore";
import { Image, Send, X, Plus, FileText, FilePlus } from "lucide-react";
import toast from "react-hot-toast";
import { isSocketHealthy } from "../services/socket";

const GroupMessageInput = () => {
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
  
  const { sendGroupMessage, selectedGroup } = useGroupStore();
  const { socket, checkSocketHealth } = useAuthStore();

  // Verificar saúde do socket quando o componente carrega
  useEffect(() => {
    if (!isSocketHealthy() && selectedGroup) {
      console.log("Socket não saudável no input de mensagem do grupo, verificando...");
      checkSocketHealth();
    }
  }, [selectedGroup, checkSocketHealth]);

  // Função para converter tamanho de arquivo para formato legível
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    else return (bytes / 1073741824).toFixed(1) + ' GB';
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione um arquivo de imagem");
      return;
    }

    // Verificar tamanho do arquivo (limite de 15MB)
    if (file.size > 15 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 15MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
      setImageData(reader.result);
      // Limpar qualquer arquivo previamente selecionado
      setFileInfo(null);
      setShowOptions(false);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Verificar tamanho do arquivo (limite de 25MB)
    if (file.size > 25 * 1024 * 1024) {
      toast.error("O arquivo deve ter no máximo 25MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
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
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    setImageData(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const removeFile = () => {
    setFileInfo(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // MELHORADO com interação direta de socket
  const handleSendMessage = async (e) => {
    // Prevenir o comportamento padrão do formulário 
    e.preventDefault();
    
    if (!text.trim() && !imageData && !fileInfo) return;
    if (isUploading || !selectedGroup) return;

    try {
      setIsUploading(true);
      
      // Mostrar toast de carregamento se houver imagem ou arquivo
      let toastId;
      if (fileInfo || imageData) {
        toastId = toast.loading(
          fileInfo 
            ? `Enviando arquivo ${fileInfo.name}...` 
            : "Enviando imagem..."
        );
      }

      // NOVO: Se o socket estiver saudável, enviar diretamente via socket primeiro
      // para feedback instantâneo, mesmo antes da API responder
      if (socket && socket.connected && text.trim()) {
        socket.emit("sendGroupMessage", {
          groupId: selectedGroup._id,
          text: text.trim(),
          timestamp: new Date().toISOString()
        });
      }

      // Capturar o texto atual e limpar imediatamente
      const messageText = text;
      setText("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "40px";
      }

      // Preparar dados para envio
      const messageData = {
        text: messageText
      };

      // Se houver uma imagem, adicionar aos dados
      if (imageData) {
        messageData.image = imageData;
      }

      // Se houver um arquivo, adicionar aos dados
      if (fileInfo) {
        messageData.file = {
          data: fileInfo.data,
          type: fileInfo.type,
          name: fileInfo.name
        };
      }

      // NOVO: Verificar novamente o socket antes de enviar
      if (!isSocketHealthy()) {
        console.log("Socket não está saudável ao enviar mensagem, reconectando...");
        checkSocketHealth();
      }

      await sendGroupMessage(selectedGroup._id, messageData);

      // Remover toast de carregamento se existir
      if (toastId) {
        toast.dismiss(toastId);
        toast.success(
          fileInfo 
            ? "Arquivo enviado com sucesso!" 
            : "Imagem enviada com sucesso!"
        );
      }

      // Limpar o resto do formulário
      setImagePreview(null);
      setImageData(null);
      setFileInfo(null);
      setLineCount(1);
      
      if (imageInputRef.current) imageInputRef.current.value = "";
      if (fileInputRef.current) fileInputRef.current.value = "";
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
    // Também previne o comportamento padrão aqui ao pressionar Enter para enviar
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

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
              <div className="flex items-center">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-20 h-20 object-cover rounded-lg"
                />
                <span className="ml-2 text-sm">Imagem anexada</span>
              </div>
            ) : fileInfo ? (
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