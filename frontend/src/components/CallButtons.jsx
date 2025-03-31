// src/components/CallButtons.jsx
import { useState } from 'react';
import { Video, Phone } from 'lucide-react';
import useCallStore from '../store/useCallStore';
import toast from 'react-hot-toast';

const CallButtons = ({ userId, username, isGroup = false, disabled = false }) => {
  const { startCall } = useCallStore();
  const [isCallLoading, setIsCallLoading] = useState(false);

  // Iniciar chamada de voz
  const handleVoiceCall = async () => {
    if (disabled || isCallLoading) return;
    
    try {
      console.log(`Iniciando chamada de voz para ${username} (${userId})`);
      setIsCallLoading(true);
      
      // Verificar se o dispositivo tem permissão para mídia
      try {
        // Solicite permissão para áudio antes de iniciar
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (permError) {
        console.error("Erro de permissão de áudio:", permError);
        toast.error("Permissão de microfone necessária para fazer chamadas");
        setIsCallLoading(false);
        return;
      }
      
      // Iniciar a chamada
      await startCall(userId, username, 'voice');
    } catch (error) {
      console.error('Erro ao iniciar chamada de voz:', error);
      toast.error(`Erro ao iniciar chamada: ${error.message}`);
    } finally {
      setIsCallLoading(false);
    }
  };

  // Iniciar chamada de vídeo
  const handleVideoCall = async () => {
    if (disabled || isCallLoading) return;
    
    try {
      console.log(`Iniciando chamada de vídeo para ${username} (${userId})`);
      setIsCallLoading(true);
      
      // Verificar se o dispositivo tem permissão para mídia
      try {
        // Solicite permissão para áudio e vídeo antes de iniciar
        await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      } catch (permError) {
        console.error("Erro de permissão de mídia:", permError);
        
        // Tente com apenas áudio se o vídeo falhar
        if (permError.name === 'NotFoundError' || permError.name === 'NotAllowedError') {
          toast.error("Câmera não disponível. Fazendo chamada de voz.");
          await startCall(userId, username, 'voice');
          setIsCallLoading(false);
          return;
        }
        
        toast.error("Permissões de mídia necessárias para fazer chamadas");
        setIsCallLoading(false);
        return;
      }
      
      // Iniciar a chamada
      await startCall(userId, username, 'video');
    } catch (error) {
      console.error('Erro ao iniciar chamada de vídeo:', error);
      toast.error(`Erro ao iniciar chamada: ${error.message}`);
    } finally {
      setIsCallLoading(false);
    }
  };

  // Renderizar botões apenas para chat individual (não grupo) por enquanto
  if (isGroup) return null;

  return (
    <div className="flex items-center gap-2">
      {/* Botão de chamada de voz */}
      <button
        onClick={handleVoiceCall}
        disabled={disabled || isCallLoading}
        className="btn btn-ghost btn-sm btn-circle"
        title="Chamada de voz"
      >
        <Phone size={18} className={isCallLoading ? 'animate-pulse' : ''} />
      </button>

      {/* Botão de chamada de vídeo */}
      <button
        onClick={handleVideoCall}
        disabled={disabled || isCallLoading}
        className="btn btn-ghost btn-sm btn-circle"
        title="Chamada de vídeo"
      >
        <Video size={18} className={isCallLoading ? 'animate-pulse' : ''} />
      </button>
    </div>
  );
};

export default CallButtons;