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

  // Função auxiliar para formatar tamanho do arquivo
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  // Debug de estados mais detalhado
  useEffect(() => {
    console.log("Estado de upload:", {
      imagePreview: imagePreview ? `Imagem (${imagePreview.length} bytes)` : 'Sem imagem',
      imageData: imageData ? `Dados da imagem (${imageData.length} bytes)` : 'Sem dados de imagem',
      fileInfo: fileInfo ? `Arquivo: ${fileInfo.name} (${fileInfo.size})` : 'Sem arquivo'
    });
  }, [imagePreview, imageData, fileInfo]);

  // Função para ajustar altura do textarea
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

  // Ajustar altura do textarea quando o texto muda
  useEffect(() => {
    autoResizeTextarea();
  }, [text]);

  // Fechar menu de opções quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.attach-button') && !event.target.closest('.options-menu')) {
        setShowOptions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Função de upload de imagem com validações adicionais
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    console.log("Imagem selecionada:", file);

    if (!file) return;
    
    // Validações mais rigorosas
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione um arquivo de imagem válido");
      return;
    }

    // Limite de tamanho de imagem (opcional)
    if (file.size > 10 * 1024 * 1024) { // 10MB
      toast.error("A imagem não pode ser maior que 10MB");
      return;
    }

    const reader = new FileReader();
    
    reader.onloadstart = () => {
      console.log("Iniciando leitura da imagem");
    };

    reader.onload = (event) => {
      console.log("Imagem carregada com sucesso");
      console.log("Tamanho da imagem (bytes):", event.target.result.length);
      
      setImagePreview(event.target.result);
      setImageData(event.target.result);
      setFileInfo(null);
      setShowOptions(false);
    };
    
    reader.onerror = (error) => {
      console.error("Erro ao ler imagem:", error);
      toast.error("Erro ao carregar imagem. Tente novamente.");
    };
    
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    console.log("ARQUIVO SELECIONADO - DETALHES COMPLETOS:", {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified,
      fullFile: file
    });
  
    if (!file) return;
  
    // Lista de tipos de arquivo permitidos
    const allowedFileTypes = [
      'text/plain', 
      'application/pdf', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg', 
      'image/png', 
      'image/gif'
    ];
  
    // Validar tipo de arquivo
    if (!allowedFileTypes.includes(file.type)) {
      console.error("TIPO DE ARQUIVO NÃO PERMITIDO:", file.type);
      toast.error(`Tipo de arquivo não permitido: ${file.type}`);
      return;
    }
  
    // Validações de arquivo
    if (file.size === 0) {
      toast.error("Não é possível selecionar um arquivo vazio");
      return;
    }
  
    // Limite de tamanho de arquivo 
    if (file.size > 50 * 1024 * 1024) { // 50MB
      toast.error("O arquivo não pode ser maior que 50MB");
      return;
    }
  
    const reader = new FileReader();
    
    reader.onloadstart = () => {
      console.log("Iniciando leitura do arquivo:", file.name);
    };
  
    reader.onload = (event) => {
      console.log("ARQUIVO CARREGADO - DETALHES:", {
        fileName: file.name,
        fileType: file.type,
        dataLength: event.target.result.length,
        dataPrefix: event.target.result.substring(0, 100)
      });
      
      try {
        setFileInfo({
          name: file.name,
          type: file.type,
          size: formatFileSize(file.size),
          data: event.target.result
        });
        
        setImagePreview(null);
        setImageData(null);
        setShowOptions(false);
      } catch (error) {
        console.error("ERRO AO DEFINIR FILEINFO:", error);
        toast.error("Erro ao processar arquivo. Tente novamente.");
      }
    };
    
    reader.onerror = (error) => {
      console.error("ERRO AO LER ARQUIVO:", error);
      toast.error("Erro ao carregar arquivo. Tente novamente.");
    };
    
    // Use readAsDataURL para arquivos binários
    reader.readAsDataURL(file);
  };

  // Função para lidar com remoção de anexos
  const handleRemoveAttachment = () => {
    setImagePreview(null);
    setImageData(null);
    setFileInfo(null);
    
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Função para enviar mensagem com mais detalhes de debug
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    console.log("Tentativa de envio de mensagem:", {
      texto: text ? `Com texto (${text.length} caracteres)` : 'Sem texto',
      imagem: imageData ? `Imagem carregada (${imageData.length} bytes)` : 'Sem imagem',
      arquivo: fileInfo ? `Arquivo: ${fileInfo.name}` : 'Sem arquivo'
    });

    if ((!text.trim() && !imageData && !fileInfo) || isUploading) {
      console.warn("Envio cancelado: conteúdo vazio ou já enviando");
      return;
    }
    
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

      console.log("Enviando dados da mensagem:", {
        temTexto: !!messageData.text,
        temImagem: !!messageData.image,
        temArquivo: !!messageData.file
      });

      const result = await sendMessage(messageData);
      
      // Limpar após envio bem-sucedido
      setText("");
      handleRemoveAttachment();
      setLineCount(1);
      
      // Resetar altura do textarea
      if (textareaRef.current) {
        textareaRef.current.style.height = "40px";
      }

      console.log("Mensagem enviada com sucesso");
    } catch (error) {
      console.error("Erro detalhado ao enviar mensagem:", {
        nome: error.name,
        mensagem: error.message,
        pilha: error.stack
      });
      toast.error("Erro ao enviar mensagem. Tente novamente.");
    } finally {
      setIsUploading(false);
    }
  };

  // Lidar com tecla Enter (Enviar com Enter, nova linha com Shift+Enter)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
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
              onClick={handleRemoveAttachment}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300 flex items-center justify-center"
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
            <div className="absolute bottom-16 left-0 bg-base-100 rounded-md shadow-md border border-base-300 p-1 z-10 min-w-48 options-menu">
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

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite uma mensagem..."
            className={`w-full textarea textarea-bordered py-2 px-4 resize-none ${
              lineCount > 2 ? 'overflow-y-auto' : 'overflow-hidden'
            }`}
            rows={1}
            style={{ 
              height: "40px",
              maxHeight: "120px",
              scrollbarWidth: "thin",
              msOverflowStyle: "none"
            }}
            disabled={isUploading}
          />
        </div>

        <button 
          type="submit" 
          className="btn btn-circle btn-sm"
          disabled={(!text.trim() && !imageData && !fileInfo) || isUploading}
        >
          {isUploading ? (
            <span className="loading loading-spinner loading-xs"></span>
          ) : (
            <Send size={22} />
          )}
        </button>
      </form>
    </div>
  );
};

export default MessageInput;