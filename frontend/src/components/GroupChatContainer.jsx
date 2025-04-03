import { useRef, useState, useEffect } from "react";
import { useGroupStore } from "../store/useGroupStore";
import { useAuthStore } from "../store/useAuthStore";
import { Image, Send, X, Plus, FileText, FilePlus, Mic, StopCircle, Trash, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { 
  processFileWithProgress, 
  sendFileWithProgress, 
  optimizeImage, 
  needsOptimization 
} from '../lib/uploadHelpers';

const GroupMessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [imageData, setImageData] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [showOptions, setShowOptions] = useState(false);
  const [lineCount, setLineCount] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  
  // Estados para gravação de áudio
  const [isRecording, setIsRecording] = useState(false);
  const [audioRecorder, setAudioRecorder] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioData, setAudioData] = useState(null);
  const [audioURL, setAudioURL] = useState(null);
  const timerRef = useRef(null);
  
  // Estado para rastrear o upload do arquivo
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isFileProcessing, setIsFileProcessing] = useState(false);
  
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const optionsRef = useRef(null);
  const textareaRef = useRef(null);
  const audioRef = useRef(null);
  
  const { sendGroupMessage, selectedGroup } = useGroupStore();
  const { socket } = useAuthStore();

  // Formatar tempo de gravação (mm:ss)
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Função para converter tamanho de arquivo para formato legível
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    else return (bytes / 1073741824).toFixed(1) + ' GB';
  };

  // Iniciar gravação de áudio
  const startRecording = async () => {
    try {
      // Limpar qualquer preview ou dados existentes
      setImagePreview(null);
      setImageData(null);
      setFileInfo(null);
      setAudioData(null);
      setAudioURL(null);
      
      // Solicitar permissão para usar o microfone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Criar gravador de áudio
      const recorder = new MediaRecorder(stream);
      setAudioRecorder(recorder);
      
      const audioChunks = [];
      
      // Coletar dados durante a gravação
      recorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      });
      
      // Processar e armazenar áudio quando a gravação terminar
      recorder.addEventListener('stop', () => {
        // Criar blob de áudio a partir dos chunks
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        
        // Converter para URL para reprodução
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioURL(audioUrl);
        
        // Converter para base64 para enviar
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          setAudioData(reader.result);
        };
        
        // Parar todos os tracks do stream
        stream.getTracks().forEach(track => track.stop());
      });
      
      // Iniciar gravação
      recorder.start();
      setIsRecording(true);
      
      // Iniciar timer para mostrar tempo de gravação
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error("Erro ao iniciar gravação:", error);
      toast.error("Não foi possível acessar o microfone");
    }
  };
  
  // Parar gravação de áudio
  const stopRecording = () => {
    if (audioRecorder && isRecording) {
      audioRecorder.stop();
      setIsRecording(false);
      
      // Parar o timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };
  
  // Cancelar/remover áudio
  const cancelAudio = () => {
    // Se estiver gravando, pare a gravação
    if (isRecording && audioRecorder) {
      audioRecorder.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    
    // Limpar dados de áudio
    setAudioData(null);
    setAudioURL(null);
    setRecordingTime(0);
    
    // Limpar referência de áudio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  // Função aprimorada para upload de imagem
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione um arquivo de imagem");
      return;
    }

    // Aumento do limite para 25MB
    if (file.size > 25 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 25MB");
      return;
    }

    // Cancelar qualquer gravação de áudio em andamento
    cancelAudio();
    
    // Mostrar indicador de processamento
    setIsFileProcessing(true);
    
    try {
      // Verificar se precisa otimizar a imagem
      let processedFile = file;
      if (needsOptimization(file)) {
        processedFile = await optimizeImage(file);
      }
      
      // Processar arquivo com barra de progresso
      const result = await processFileWithProgress(processedFile, (progress) => {
        setUploadProgress(progress);
        
        // Notificar progresso via socket para todos os membros do grupo
        if (socket && selectedGroup?._id && selectedGroup?.members) {
          // Para cada membro do grupo (exceto o próprio usuário)
          selectedGroup.members.forEach(member => {
            if (member._id !== socket.id) {
              socket.emit("uploadProgress", {
                receiverId: member._id,
                groupId: selectedGroup._id,
                fileName: file.name,
                progress
              });
            }
          });
        }
      });
      
      setImagePreview(result);
      setImageData(result);
      // Limpar qualquer arquivo previamente selecionado
      setFileInfo(null);
      setShowOptions(false);
    } catch (error) {
      console.error("Erro ao processar imagem:", error);
      toast.error("Erro ao processar a imagem. Tente novamente.");
    } finally {
      setIsFileProcessing(false);
    }
  };

  // Função melhorada para upload de arquivo com progresso e mais formatos
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Aumento do limite para 100MB
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      toast.error(`O arquivo deve ter no máximo ${formatFileSize(maxSize)}`);
      return;
    }

    // Cancelar qualquer gravação de áudio em andamento
    cancelAudio();
    
    // Mostrar indicador de processamento
    setIsFileProcessing(true);
    setUploadProgress(0);
    
    const toastId = toast.loading(`Processando ${file.name}...`);

    try {
      // Processar arquivo com barra de progresso
      const fileData = await processFileWithProgress(file, (progress) => {
        setUploadProgress(progress);
        toast.loading(`Processando ${file.name}... ${progress}%`, { id: toastId });
        
        // Notificar progresso via socket para todos os membros do grupo
        if (socket && selectedGroup?._id && selectedGroup?.members) {
          // Para cada membro do grupo (exceto o próprio usuário)
          selectedGroup.members.forEach(member => {
            if (member._id !== socket.id) {
              socket.emit("uploadProgress", {
                receiverId: member._id,
                groupId: selectedGroup._id,
                fileName: file.name,
                progress
              });
            }
          });
        }
      });
      
      // Determinar ícone e tipo baseado na extensão
      const fileExtension = file.name.split('.').pop().toLowerCase();
      let fileType = file.type;
      
      if (!fileType || fileType === 'application/octet-stream') {
        // Tentar determinar tipo pelos padrões comuns de extensão
        if (['doc', 'docx'].includes(fileExtension)) {
          fileType = 'application/msword';
        } else if (['xls', 'xlsx'].includes(fileExtension)) {
          fileType = 'application/vnd.ms-excel';
        } else if (['ppt', 'pptx'].includes(fileExtension)) {
          fileType = 'application/vnd.ms-powerpoint';
        } else if (fileExtension === 'pdf') {
          fileType = 'application/pdf';
        } else if (['zip', 'rar', '7z'].includes(fileExtension)) {
          fileType = 'application/zip';
        } else if (['mp3', 'wav', 'ogg'].includes(fileExtension)) {
          fileType = 'audio/' + fileExtension;
        } else if (['mp4', 'avi', 'mov', 'wmv'].includes(fileExtension)) {
          fileType = 'video/' + fileExtension;
        }
      }
      
      // Guardar informações do arquivo
      setFileInfo({
        name: file.name,
        type: fileType,
        size: formatFileSize(file.size),
        data: fileData,
        extension: fileExtension
      });
      
      // Limpar qualquer imagem previamente selecionada
      setImagePreview(null);
      setImageData(null);
      setShowOptions(false);
      
      // Remover toast de processamento
      toast.dismiss(toastId);
      toast.success(`Arquivo ${file.name} pronto para envio`);
    } catch (error) {
      console.error("Erro ao processar arquivo:", error);
      toast.dismiss(toastId);
      toast.error(`Erro ao processar o arquivo ${file.name}`);
    } finally {
      setIsFileProcessing(false);
    }
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

  // Reset todos estados quando mudar de grupo
  useEffect(() => {
    setText("");
    setImagePreview(null);
    setImageData(null);
    setFileInfo(null);
    setShowOptions(false);
    setLineCount(1);
    setIsUploading(false);
    cancelAudio();
    setIsFileProcessing(false);
    setUploadProgress(0);
    
    if (textareaRef.current) {
      textareaRef.current.style.height = "40px";
    }
  }, [selectedGroup?._id]);

  // Limpar intervalo ao desmontar componente
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imageData && !fileInfo && !audioData) return;
    if (isUploading || isFileProcessing || !selectedGroup) return;

    try {
      setIsUploading(true);
      
      // Preparar dados para envio
      const messageData = {
        text: text
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
          name: fileInfo.name,
          extension: fileInfo.extension
        };
      }
      
      // Se houver um áudio, adicionar aos dados
      if (audioData) {
        messageData.audio = {
          data: audioData,
          duration: recordingTime
        };
      }

      // Enviar mensagem para o grupo com progresso
      if (socket && selectedGroup?._id && (imageData || fileInfo || audioData)) {
        // Função personalizada para envio em grupo
        await sendGroupMessage(selectedGroup._id, messageData);
        
        // Notificar 100% no final para todos os membros
        if (selectedGroup?.members) {
          selectedGroup.members.forEach(member => {
            if (member._id !== socket.id) {
              socket.emit("uploadProgress", {
                receiverId: member._id,
                groupId: selectedGroup._id,
                fileName: fileInfo?.name || "arquivo",
                progress: 100
              });
            }
          });
        }
      } else {
        // Envio normal sem notificação de progresso
        await sendGroupMessage(selectedGroup._id, messageData);
      }

      // Limpar formulário
      setText("");
      setImagePreview(null);
      setImageData(null);
      setFileInfo(null);
      setLineCount(1);
      cancelAudio();
      
      if (imageInputRef.current) imageInputRef.current.value = "";
      if (fileInputRef.current) fileInputRef.current.value = "";
      
      // Reset textarea height
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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const getFileIcon = (fileType, extension) => {
    if (!fileType) {
      // Verificar por extensão comum
      if (extension) {
        const ext = extension.toLowerCase();
        if (['pdf'].includes(ext)) return <FileText size={24} />;
        if (['doc', 'docx', 'txt', 'rtf'].includes(ext)) return <FileText size={24} />;
        if (['xls', 'xlsx', 'csv'].includes(ext)) return <Image size={24} className="text-green-600" />;
        if (['ppt', 'pptx'].includes(ext)) return <Image size={24} className="text-orange-600" />;
        if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return <FilePlus size={24} />;
        if (['mp3', 'wav', 'ogg', 'flac'].includes(ext)) return <FilePlus size={24} className="text-purple-600" />;
        if (['mp4', 'avi', 'mov', 'wmv', 'mkv'].includes(ext)) return <FilePlus size={24} className="text-red-600" />;
      }
      return <FileText size={24} />;
    }
    
    if (fileType.startsWith('image/')) return <Image size={24} />;
    if (fileType.startsWith('video/')) return <FilePlus size={24} className="text-red-600" />;
    if (fileType.startsWith('audio/')) return <FilePlus size={24} className="text-purple-600" />;
    if (fileType.includes('pdf')) return <FileText size={24} className="text-red-600" />;
    if (fileType.includes('word') || fileType.includes('document')) return <FileText size={24} className="text-blue-600" />;
    if (fileType.includes('excel') || fileType.includes('sheet')) return <FileText size={24} className="text-green-600" />;
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) return <FileText size={24} className="text-orange-600" />;
    if (fileType.includes('zip') || fileType.includes('compressed')) return <FilePlus size={24} />;
    
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
                  {getFileIcon(fileInfo.type, fileInfo.extension)}
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
      
      {/* Preview de áudio */}
      {audioURL && !isRecording && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative p-2 bg-base-200 rounded-lg border border-base-300 w-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-base-100 rounded-lg">
                  <FilePlus size={24} className="text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Mensagem de voz</p>
                  <p className="text-xs opacity-70">{formatTime(recordingTime)}</p>
                </div>
              </div>
              
              <audio ref={audioRef} src={audioURL} className="hidden" controls />
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => audioRef.current.play()}
                  className="btn btn-sm btn-circle btn-ghost"
                  type="button"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-play">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </button>
              </div>
            </div>
            
            <button
              onClick={cancelAudio}
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
      
      {/* Área de gravação de áudio */}
      {isRecording && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative p-2 bg-base-200 rounded-lg border border-base-300 w-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="animate-pulse">
                  <Mic className="text-error size-6" />
                </div>
                <div>
                  <p className="text-sm font-medium">Gravando...</p>
                  <p className="text-xs opacity-70">{formatTime(recordingTime)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={stopRecording}
                  className="btn btn-sm btn-error btn-outline gap-2"
                  type="button"
                >
                  <StopCircle size={16} />
                  Parar
                </button>
                
                <button
                  onClick={cancelAudio}
                  className="btn btn-sm btn-ghost btn-circle"
                  type="button"
                >
                  <Trash size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Área de processamento de arquivo */}
      {isFileProcessing && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative p-2 bg-base-200 rounded-lg border border-base-300 w-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="animate-spin">
                  <Upload className="text-primary size-6" />
                </div>
                <div>
                  <p className="text-sm font-medium">Processando arquivo...</p>
                  <div className="w-48 h-2 bg-base-300 rounded-full mt-1">
                    <div 
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <div className="relative">
          <button
            type="button"
            className="btn btn-circle btn-md hover:bg-base-300 attach-button"
            onClick={() => setShowOptions(!showOptions)}
            disabled={isUploading || isRecording || isFileProcessing}
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
                  setShowOptions(false);
                }}
                disabled={isUploading || isRecording || isFileProcessing}
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
                  setShowOptions(false);
                }}
                disabled={isUploading || isRecording || isFileProcessing}
              >
                <FileText size={20} className="text-base-content opacity-70" />
                <span>Enviar arquivo</span>
              </button>
              
              <button
                type="button"
                className="flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-base-200 rounded-sm transition-colors"
                onClick={() => {
                  startRecording();
                  setShowOptions(false);
                }}
                disabled={isUploading || isRecording || isFileProcessing}
              >
                <Mic size={20} className="text-base-content opacity-70" />
                <span>Mensagem de voz</span>
              </button>
            </div>
          )}
        </div>
        
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            className={`w-full textarea textarea-bordered rounded-md py-2 px-4 min-h-10 resize-none focus:outline-none focus:ring-0 focus:border-base-300 break-words ${lineCount > 2 ? 'overflow-y-auto max-h-20' : 'overflow-hidden'}`}
            placeholder={
              isRecording 
                ? "Gravando mensagem de voz..." 
                : isFileProcessing
                  ? "Processando arquivo..."
                  : "Digite uma mensagem..."
            }
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
            disabled={isUploading || isRecording || isFileProcessing}
          />
        </div>
        
        {/* Botão de gravar áudio ou enviar */}
        {!isRecording && !isFileProcessing && !text.trim() && !imageData && !fileInfo && !audioData ? (
          <button
            type="button"
            className="btn btn-sm btn-circle hover:bg-base-300"
            onClick={startRecording}
            disabled={isUploading}
          >
            <Mic size={22} />
          </button>
        ) : (
          <button
            type="submit"
            className="btn btn-sm btn-circle hover:bg-base-300"
            disabled={((!text.trim() && !imageData && !fileInfo && !audioData) || isUploading) || isRecording || isFileProcessing}
          >
            <Send size={22} />
          </button>
        )}
        
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={imageInputRef}
          onChange={handleImageChange}
          disabled={isUploading || isRecording || isFileProcessing}
        />
        
        <input
          type="file"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
          disabled={isUploading || isRecording || isFileProcessing}
        />
      </form>
    </div>
  );
};

export default GroupMessageInput;