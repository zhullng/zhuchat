// components/IncomingCallModal.jsx
import { useEffect, useRef } from 'react';
import { Phone, Video, PhoneCall, PhoneOff } from 'lucide-react';

const IncomingCallModal = ({ caller, callType, onAccept, onReject }) => {
  const audioRef = useRef(null);
  
  // Reproduzir som de chamada
  useEffect(() => {
    // Criar o elemento de áudio para o toque de chamada
    const audio = new Audio('/sounds/ringtone.mp3'); // Certifique-se de ter este arquivo
    audio.loop = true;
    audio.play().catch(e => console.log('Não foi possível reproduzir o som: requer interação do usuário'));
    
    audioRef.current = audio;
    
    // Limpar quando o componente for desmontado
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);
  
  // Função para manipular a aceitação da chamada
  const handleAccept = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    onAccept();
  };
  
  // Função para manipular a rejeição da chamada
  const handleReject = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    onReject();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
          
          {/* Botões de ação */}
          <div className="flex items-center gap-4 mt-2">
            {/* Rejeitar */}
            <button
              onClick={handleReject}
              className="p-4 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors flex items-center justify-center"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
            
            {/* Aceitar */}
            <button
              onClick={handleAccept}
              className="p-4 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors flex items-center justify-center"
            >
              <PhoneCall className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;