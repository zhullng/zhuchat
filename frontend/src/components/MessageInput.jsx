import React, { useRef, useState, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image, Send, X, Plus, FileText, FilePlus } from "lucide-react";
import toast from "react-hot-toast";
import { isIOSDevice, isQuickTimeVideo } from "../lib/utils";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [imageData, setImageData] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [showOptions, setShowOptions] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [lineCount, setLineCount] = useState(1);
  const [filePreview, setFilePreview] = useState(null);
  // Estado para detectar sistema iOS
  const [isIOS, setIsIOS] = useState(false);

  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const textareaRef = useRef(null);

  const { sendMessage, selectedUser } = useChatStore();

  // Detectar se o dispositivo é iOS
  useEffect(() => {
    setIsIOS(isIOSDevice());
  }, []);

  // Foco inicial quando o componente monta ou o Utilizador selecionado muda
  useEffect(() => {
    if (textareaRef.current && selectedUser) {
      // Pequeno atraso para garantir que o DOM esteja pronto
      setTimeout(() => {
        textareaRef.current.focus();
      }, 100);
    }
  }, [selectedUser]);

  // Função auxiliar para formatar tamanho do arquivo
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  // Função para verificar tamanho máximo de arquivo
  const isFileTooLarge = (file) => {
    // Verificar se é um vídeo
    const isVideo = file.type.startsWith('video/') || 
                    file.name.toLowerCase().endsWith('.mov') || 
                    file.name.toLowerCase().endsWith('.mp4');
    
    // Limite para vídeos no iOS: 10MB para iOS (devido a problemas de memória)
    if (isVideo && isIOS && file.size > 10 * 1024 * 1024) {
      return true;
    }
    
    // Limite para vídeos em outros dispositivos: 50MB
    if (isVideo && file.size > 50 * 1024 * 1024) {
      return true;
    }
    
    // Limite para imagens: 10MB
    if (file.type.startsWith('image/') && file.size > 10 * 1024 * 1024) {
      return true;
    }
    
    return false;
  };

  // Debug de estados mais detalhado
  useEffect(() => {
    console.log("Estado de upload:", {
      imagePreview: imagePreview ? `Imagem (${imagePreview.length} bytes)` : 'Sem imagem',
      imageData: imageData ? `Dados da imagem (${imageData.length} bytes)` : 'Sem dados de imagem',
      fileInfo: fileInfo ? `Arquivo: ${fileInfo.name} (${fileInfo.size})` : 'Sem arquivo',
      filePreview: filePreview ? 'Com preview' : 'Sem preview',
      isIOS: isIOS ? 'Dispositivo iOS' : 'Não é iOS'
    });
  }, [imagePreview, imageData, fileInfo, filePreview, isIOS]);

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

    // Verificar tamanho
    if (isFileTooLarge(file)) {
      toast.error("A imagem é muito grande. Limite: 10MB");
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
      setFilePreview(null);
      setShowOptions(false);
      
      // Refocus no textarea após selecionar imagem
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 100);
    };
    
    reader.onerror = (error) => {
      console.error("Erro ao ler imagem:", error);
      toast.error("Erro ao carregar imagem. Tente novamente.");
    };
    
    reader.readAsDataURL(file);
  };

  // Função completamente reformulada para lidar com arquivos
  const handleFileChange = (e) => {
    try {
      const file = e.target.files[0];
      
      if (!file) return;
      
      // Log detalhado para depuração
      console.log("ARQUIVO SELECIONADO - DETALHES:", {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified,
        extension: file.name.split('.').pop().toLowerCase()
      });
      
      // Verificar tipos permitidos
      const isVideo = file.type.startsWith('video/') || 
                      file.name.toLowerCase().endsWith('.mov') || 
                      file.name.toLowerCase().endsWith('.mp4');
      
      // Verificar tipo de arquivo
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
        toast.error(isIOS 
          ? "Para iOS, o limite de vídeo é 10MB. Por favor, escolha um arquivo menor." 
          : "Arquivo muito grande. Por favor, escolha um arquivo menor."
        );
        return;
      }

      // Para vídeos no iOS, adotar uma abordagem completamente diferente
      if (isVideo && isIOS) {
        setIsUploading(true);
        
        // Para o iOS, adicione o fileInfo diretamente para vídeos
        // Isto evita problemas com o FileReader que pode falhar com vídeos grandes
        setFileInfo({
          name: file.name,
          type: 'video/mp4', // Padronizar para mp4 independente da origem
          size: formatFileSize(file.size),
          data: null, // Vamos preencher isto depois
          originalType: file.type,
          file: file // Guardar referência ao arquivo original
        });
        
        // Criar preview
        try {
          const previewUrl = URL.createObjectURL(file);
          setFilePreview(previewUrl);
        } catch (previewError) {
          console.error("Erro ao criar preview:", previewError);
        }
        
        // Ler o arquivo em um processo separado para não bloquear a UI
        setTimeout(() => {
          try {
            const reader = new FileReader();
            
            reader.onload = (event) => {
              setFileInfo(prev => ({
                ...prev,
                data: event.target.result
              }));
              setIsUploading(false);
              
              // Refocus no textarea após processar arquivo
              setTimeout(() => {
                if (textareaRef.current) {
                  textareaRef.current.focus();
                }
              }, 100);
            };
            
            reader.onerror = (error) => {
              console.error("Erro ao ler arquivo:", error);
              toast.error("Erro ao processar vídeo. Tente um arquivo menor.");
              setFileInfo(null);
              setFilePreview(null);
              setIsUploading(false);
            };
            
            reader.readAsDataURL(file);
          } catch (readerError) {
            console.error("Erro ao criar FileReader:", readerError);
            toast.error("Erro ao processar vídeo. Tente um arquivo menor.");
            setFileInfo(null);
            setFilePreview(null);
            setIsUploading(false);
          }
        }, 100);
        
        setImagePreview(null);
        setImageData(null);
        setShowOptions(false);
        return;
      }
      
      // Para outros tipos de arquivo, use o método tradicional
      setIsUploading(true);
      
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          // Para vídeos, criar preview
          if (isVideo) {
            try {
              const previewUrl = URL.createObjectURL(file);
              setFilePreview(previewUrl);
            } catch (previewError) {
              console.error("Erro ao criar preview:", previewError);
            }
          }
          
          setFileInfo({
            name: file.name,
            type: isVideo ? 'video/mp4' : file.type,
            size: formatFileSize(file.size),
            data: event.target.result,
            originalType: file.type
          });
          
          setImagePreview(null);
          setImageData(null);
          setShowOptions(false);
          
          // Refocus no textarea após processar arquivo
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.focus();
            }
          }, 100);
        } catch (error) {
          console.error("Erro ao processar arquivo:", error);
          toast.error("Erro ao processar arquivo. Tente novamente.");
        } finally {
          setIsUploading(false);
        }
      };
      
      reader.onerror = (error) => {
        console.error("Erro ao ler arquivo:", error);
        toast.error("Erro ao ler arquivo. Tente novamente.");
        setIsUploading(false);
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Erro global em handleFileChange:", error);
      toast.error("Ocorreu um erro ao processar o arquivo");
      setIsUploading(false);
    }
  };

  // Função para lidar com remoção de anexos
  const handleRemoveAttachment = () => {
    setImagePreview(null);
    setImageData(null);
    setFileInfo(null);
    
    // Limpar objeto URL para vídeos
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
      setFilePreview(null);
    }
    
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (fileInputRef.current) fileInputRef.current.value = "";
    
    // Refocus no textarea após remover anexo
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 50);
  };

  // Função para enviar mensagem simplificada e corrigida
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if ((!text.trim() && !imageData && !fileInfo) || isUploading) {
      return;
    }
    
    try {
      setIsUploading(true);
      
      // Para vídeos do iOS, verificar se os dados já foram carregados
      if (fileInfo && fileInfo.type.startsWith('video/') && !fileInfo.data && fileInfo.file) {
        toast.error("Aguarde o carregamento do vídeo");
        setIsUploading(false);
        return;
      }
      
      const messageData = {
        text: text.trim() || ""
      };

      // Adicionar imagem se existir
      if (imageData) {
        messageData.image = imageData;
      }

      // Adicionar arquivo se existir
      if (fileInfo && fileInfo.data) {
        messageData.file = {
          name: fileInfo.name,
          type: fileInfo.type,
          size: fileInfo.size,
          data: fileInfo.data
        };
      }

      console.log("Enviando mensagem com dados:", {
        hasText: !!messageData.text,
        hasImage: !!messageData.image,
        hasFile: !!messageData.file,
        fileType: messageData.file ? messageData.file.type : null,
        fileName: messageData.file ? messageData.file.name : null
      });

      // Enviar mensagem
      await sendMessage(messageData);
      
      // Limpar após envio bem-sucedido
      setText("");
      handleRemoveAttachment();
      setLineCount(1);
      
      // Resetar altura do textarea e garantir o foco
      if (textareaRef.current) {
        textareaRef.current.style.height = "40px";
        
        // Garantir que o foco seja mantido após enviar mensagem
        // Usar setTimeout para dar tempo ao DOM de atualizar
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            
            // Em alguns navegadores, pode ser necessário mover o cursor para o final
            const length = 0;
            textareaRef.current.setSelectionRange(length, length);
          }
        }, 50);
      }
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
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
                  <div className="p-2 bg-base-100 rounded-lg">
                    <FileText size={24} />
                  </div>
                )}
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
                <span>Enviar qualquer ficheiro ou vídeo</span>
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
          // Aceitar explicitamente o formato MOV/QuickTime
          accept="video/quicktime,video/*,image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
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
            autoComplete="off"
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