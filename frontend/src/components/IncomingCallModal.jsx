// src/components/IncomingCallModal.jsx
import { useEffect, useRef, useState } from 'react';
import { Phone, Video, PhoneCall, PhoneOff } from 'lucide-react';
import toast from 'react-hot-toast';

const IncomingCallModal = ({ caller, callType, onAccept, onReject }) => {
  const audioRef = useRef(null);
  const [showMobileAlert, setShowMobileAlert] = useState(true);
  
  // Reproduzir som de chamada e mostrar alertas
  useEffect(() => {
    console.log("Modal de chamada recebida montado para:", caller);
    
    // Mostrar um toast adicional para garantir visibilidade
    toast.success(`Chamada recebida de ${caller}`, {
      duration: 10000,
      icon: callType === 'video' ? '📹' : '📞',
      id: 'incoming-call'
    });
    
    // Garantir que a página esteja em foco
    window.focus();
    
    try {
      // Criar o elemento de áudio para o toque de chamada
      const audio = new Audio('/sounds/ringtone.mp3');
      audio.loop = true;
      audio.volume = 1.0; // Volume máximo
      
      // Em alguns navegadores, o áudio só pode ser reproduzido após interação do usuário
      const playAudio = () => {
        audio.play().catch(e => {
          console.log('Não foi possível reproduzir o som automaticamente:', e);
        });
      };
      
      playAudio();
      
      // Tentar tocar novamente a cada segundo (para dispositivos móveis)
      const audioInterval = setInterval(playAudio, 1000);
      
      // Tentar vibrar o dispositivo se disponível
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate([500, 200, 500, 200, 500, 200, 500]);
        } catch (e) {
          console.log('Vibração não suportada:', e);
        }
      }
      
      audioRef.current = audio;
      
      return () => {
        clearInterval(audioInterval);
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
      };
    } catch (error) {
      console.error("Erro ao configurar áudio de chamada:", error);
    }
    
    // Limpar quando o componente for desmontado
    return () => {
      console.log("Modal de chamada recebida desmontado");
      
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      
      toast.dismiss('incoming-call');
    };
  }, [caller, callType]);
  
  // Funções para lidar com os botões
  const handleAccept = () => {
    console.log("Botão de aceitar chamada clicado");
    
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    toast.dismiss('incoming-call');
    onAccept();
  };
  
  const handleReject = () => {
    console.log("Botão de rejeitar chamada clicado");
    
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    toast.dismiss('incoming-call');
    onReject();
  };

  return (
    <>
      {/* Modal principal - Z-index extremamente alto para garantir visibilidade */}
      <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[9999] p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full shadow-lg">
          <div className="flex flex-col items-center justify-center">
            {/* Ícone da chamada */}
            <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-4 animate-pulse">
              {callType === 'video' ? (
                <Video className="w-10 h-10 text-blue-600 dark:text-blue-300" />
              ) : (
                <Phone className="w-10 h-10 text-blue-600 dark:text-blue-300" />
              )}
            </div>
            
            {/* Informações da chamada */}
            <h3 className="text-xl font-semibold mb-1">
              Chamada recebida
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4 text-center">
              {caller} está {callType === 'video' ? 'fazendo uma videochamada' : 'ligando'} para você
            </p>
            
            {/* Botões de ação - botões GRANDES para facilitar em dispositivos móveis */}
            <div className="flex items-center gap-8 mt-4 w-full justify-center">
              {/* Rejeitar */}
              <button
                onClick={handleReject}
                className="p-6 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors flex items-center justify-center"
              >
                <PhoneOff className="w-8 h-8" />
              </button>
              
              {/* Aceitar */}
              <button
                onClick={handleAccept}
                className="p-6 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors flex items-center justify-center"
              >
                <PhoneCall className="w-8 h-8" />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Alerta móvel fixo na parte inferior - Interface alternativa para dispositivos móveis */}
      {showMobileAlert && (
        <div className="fixed bottom-0 left-0 right-0 bg-green-600 p-4 flex justify-between items-center z-[9999]">
          <div className="flex items-center">
            {callType === 'video' ? 
              <Video className="w-6 h-6 text-white mr-2" /> : 
              <Phone className="w-6 h-6 text-white mr-2" />
            }
            <span className="text-white font-medium">Chamada de {caller}</span>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleReject}
              className="bg-red-500 p-2 rounded-full"
            >
              <PhoneOff className="w-6 h-6 text-white" />
            </button>
            <button 
              onClick={handleAccept}
              className="bg-green-700 p-2 rounded-full"
            >
              <PhoneCall className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default IncomingCallModal;