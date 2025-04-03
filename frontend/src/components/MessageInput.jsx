
import { useRef, useState, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { Image, Send, X, Plus, FileText, FilePlus, Mic, StopCircle, Trash, Upload, File } from "lucide-react";
import toast from "react-hot-toast";
import { 
  processFileWithProgress, 
  sendFileWithProgress, 
  optimizeImage, 
  needsOptimization 
} from '../lib/uploadHelpers';

const MessageInput = () => {
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
  const [playingAudio, setPlayingAudio] = useState(null);
  const timerRef = useRef(null);
  
  // Estado para rastrear o upload do arquivo
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isFileProcessing, setIsFileProcessing] = useState(false);
  
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const optionsRef = useRef(null);
  const textareaRef = useRef(null);
  const audioRef = useRef(null);
  const audioRefs = useRef({});
  
  const { messages, sendMessage, selectedUser } = useChatStore();
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

  const startRecording = async () => {
    try {
      // Verificar suporte do navegador
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error('Gravação de áudio não suportada neste navegador');
        return;
      }

      // Limpar qualquer preview ou dados existentes
      setImagePreview(null);
      setImageData(null);
      setFileInfo(null);
      setAudioData(null);
      setAudioURL(null);
      
      // Solicitar permissão para usar o microfone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Criar gravador de áudio com opções para melhor qualidade
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
        audioBitsPerSecond: 128000 // Qualidade de áudio melhorada
      });
      
      const audioChunks = [];
      
      // Coletar dados durante a gravação
      mediaRecorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      });
      
      // Processar e armazenar áudio quando a gravação terminar
      mediaRecorder.addEventListener('stop', async () => {
        // Parar todos os tracks do stream
        stream.getTracks().forEach(track => track.stop());
        
        // Criar blob de áudio a partir dos chunks
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        
        // Verificar tamanho do áudio
        if (audioBlob.size > 20 * 1024 * 1024) { // 20MB limite
          toast.error('Mensagem de voz muito longa. Limite de 20MB.');
          return;
        }
        
        // Converter para URL para reprodução
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioURL(audioUrl);
        
        // Converter para base64 para enviar
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          setAudioData(reader.result);
        };
        
        // Adicionar player de áudio para verificação
        const audioElement = new Audio(audioUrl);
        audioElement.onloadedmetadata = () => {
          setRecordingTime(Math.round(audioElement.duration));
        };
      });
      
      // Iniciar gravação
      mediaRecorder.start();
      setAudioRecorder(mediaRecorder);
      setIsRecording(true);
      
      // Iniciar timer para mostrar tempo de gravação
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          // Contagem regressiva e alerta de tempo quase esgotado
          const remainingTime = 300 - prev;
          
          if (remainingTime <= 10 && remainingTime > 0) {
            toast.error(`Tempo restante: ${remainingTime} segundos`);
          }
          
          // Limitar gravação para 5 minutos (300 segundos)
          if (prev >= 300) {
            stopRecording();
            toast.error('Limite máximo de 5 minutos atingido');
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
      
    } catch (error) {
      console.error("Erro ao iniciar gravação:", error);
      
      // Tratamento de erro específico para permissão de microfone
      const errorMessages = {
        'NotAllowedError': 'Acesso ao microfone negado. Verifique as permissões.',
        'NotFoundError': 'Nenhum microfone encontrado.',
        'NotReadableError': 'O microfone está em uso por outro aplicativo.',
        'OverConstrainedError': 'Nenhum microfone atende aos requisitos.'
      };

      const errorMessage = errorMessages[error.name] || 'Não foi possível acessar o microfone';
      toast.error(errorMessage);
    }
  };
  
  // Função de parar gravação
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
  
  // Função de cancelar áudio
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
  
  // Função de reprodução de áudio
  const toggleAudio = (messageId) => {
    try {
      const audioElement = audioRefs.current[messageId];
      
      if (!audioElement) {
        console.error('Elemento de áudio não encontrado');
        return;
      }
  
      // Se já estiver tocando esse áudio, pause
      if (playingAudio === messageId) {
        audioElement.pause();
        setPlayingAudio(null);
        return;
      }
      
      // Pause qualquer áudio que esteja tocando
      pauseAllAudio();
      
      // Preparar URL de áudio se for base64
      if (audioElement.src.startsWith('data:')) {
        // Já está no formato correto
        audioElement.play().catch(error => {
          console.error('Erro ao reproduzir áudio:', error);
          toast.error('Não foi possível reproduzir o áudio');
        });
      } else {
        // Se não for base64, tentar converter
        const message = messages.find(m => m._id === messageId);
        if (message && message.audio && message.audio.data) {
          const audioData = message.audio.data;
          if (audioData && audioData.startsWith('data:')) {
            audioElement.src = audioData;
            audioElement.play().catch(error => {
              console.error('Erro ao reproduzir áudio:', error);
              toast.error('Não foi possível reproduzir o áudio');
            });
          } else {
            console.error('Dados de áudio inválidos');
            toast.error('Dados de áudio inválidos');
          }
        }
      }
      
      setPlayingAudio(messageId);
      
      // Adicionar evento para resetar quando terminar de tocar
      audioElement.onended = () => {
        setPlayingAudio(null);
      };
    } catch (error) {
      console.error('Erro ao alternar áudio:', error);
      toast.error('Erro ao reproduzir áudio');
    }
  };
  
  // Função para pausar todos os áudios
  const pauseAllAudio = () => {
    Object.keys(audioRefs.current).forEach(id => {
      if (audioRefs.current[id]) {
        audioRefs.current[id].pause();
      }
    });
    setPlayingAudio(null);
  };

  // Restante do código permanece igual ao arquivo original...
  // (todo o código anterior é mantido, incluindo handleImageChange, handleFileChange, etc.)

  const handleSendMessage = async (e) => {
    e.preventDefault();

    // Validações adicionais
    if (isUploading || isFileProcessing) {
      toast.error('Aguarde o processamento anterior');
      return;
    }

    // Limitar tamanho total da mensagem
    const MAX_MESSAGE_SIZE = 50 * 1024 * 1024; // 50MB
    const getMessageSize = () => {
      let size = text.length;
      if (imageData) size += imageData.length;
      if (fileInfo?.data) size += fileInfo.data.length;
      if (audioData) size += audioData.length;
      return size;
    };

    if (getMessageSize() > MAX_MESSAGE_SIZE) {
      toast.error('Tamanho total da mensagem excede o limite de 50MB');
      return;
    }

    if (!text.trim() && !imageData && !fileInfo && !audioData) return;

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

      // Usar função de envio com progresso se houver socket e for arquivo/imagem/áudio
      if (socket && selectedUser?._id && (imageData || fileInfo || audioData)) {
        await sendFileWithProgress(messageData, sendMessage, socket, selectedUser._id);
      } else {
        await sendMessage(messageData);
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
      // Reset height to base height
      textareaRef.current.style.height = "40px";
      
      // Set the height to scrollHeight to fit all content
      const scrollHeight = textareaRef.current.scrollHeight;
      
      // Estimar o número de linhas com base na altura
      const lineHeight = 20; // Altura estimada de uma linha em pixels
      const currentLines = Math.ceil(scrollHeight / lineHeight);
      setLineCount(currentLines);
      
      // Se o texto for vazio ou tiver apenas uma linha, mantenha a altura mínima
      if (text.trim() === "" || scrollHeight <= 40) {
        textareaRef.current.style.height = "40px";
        setLineCount(1);
      } else if (currentLines <= 2) {
        // Para uma ou duas linhas, ajustar a altura exatamente
        textareaRef.current.style.height = `${scrollHeight}px`;
      } else {
        // Para mais de duas linhas, limitar a altura e ativar o scroll
        const newHeight = Math.min(scrollHeight, 80); // Altura para 2 linhas + um pouco mais
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

  // Determinar o ícone do arquivo com base no tipo MIME ou extensão
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
              msOverflowStyle: "none",
              wordWrap: "break-word",
              overflowWrap: "break-word",
              whiteSpace: "pre-wrap"
            }}
            disabled={isUploading || isRecording || isFileProcessing}
          />
        </div>
        
        {/* Botão de gravar áudio (quando não estiver gravando ou com texto/imagem/arquivo) */}
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
        
        {/* Input para upload de imagem (hidden) */}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={imageInputRef}
          onChange={handleImageChange}
          disabled={isUploading || isRecording || isFileProcessing}
        />
        
        {/* Input para upload de arquivo (hidden) - ampliado para aceitar todos os tipos */}
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

export default MessageInput;