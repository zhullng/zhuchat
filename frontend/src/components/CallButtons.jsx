// src/components/CallButtons.jsx
import { useState } from 'react';
import { Video, Phone } from 'lucide-react';
import useCallStore from '../store/useCallStore';

const CallButtons = ({ userId, username, isGroup = false, disabled = false }) => {
  const { startCall } = useCallStore();
  const [isCallLoading, setIsCallLoading] = useState(false);

  const handleVoiceCall = async () => {
    if (disabled || isCallLoading) return;
    
    try {
      setIsCallLoading(true);
      await startCall(userId, username, 'voice');
    } catch (error) {
      console.error('Erro ao iniciar chamada de voz:', error);
    } finally {
      setIsCallLoading(false);
    }
  };

  const handleVideoCall = async () => {
    if (disabled || isCallLoading) return;
    
    try {
      setIsCallLoading(true);
      await startCall(userId, username, 'video');
    } catch (error) {
      console.error('Erro ao iniciar chamada de vídeo:', error);
    } finally {
      setIsCallLoading(false);
    }
  };

  if (isGroup) return null;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleVoiceCall}
        disabled={disabled || isCallLoading}
        className="btn btn-ghost btn-sm btn-circle"
        title="Chamada de voz"
      >
        <Phone size={18} className={isCallLoading ? 'animate-pulse' : ''} />
      </button>

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