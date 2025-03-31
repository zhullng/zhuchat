// src/components/JitsiCall.jsx
import React, { useEffect, useRef } from 'react';

const JitsiCall = ({ roomName, userName, onClose }) => {
  const apiRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    // Função para carregar a API do Jitsi
    const loadJitsiScript = () => {
      return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://meet.jit.si/external_api.js';
        script.async = true;
        script.onload = resolve;
        document.body.appendChild(script);
      });
    };

    // Função para inicializar o Jitsi
    const initJitsi = async () => {
      if (!window.JitsiMeetExternalAPI) {
        await loadJitsiScript();
      }

      const domain = 'meet.jit.si';
      const options = {
        roomName,
        width: '100%',
        height: '100%',
        parentNode: containerRef.current,
        userInfo: {
          displayName: userName
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: [
            'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
            'fodeviceselection', 'hangup', 'chat', 'settings', 'raisehand'
          ],
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          DEFAULT_BACKGROUND: '#3c4043',
          DEFAULT_REMOTE_DISPLAY_NAME: 'Usuário',
          TOOLBAR_ALWAYS_VISIBLE: true,
          GENERATE_ROOMNAMES_ON_WELCOME_PAGE: false,
          MOBILE_APP_PROMO: false
        },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          prejoinPageEnabled: false,
          disableDeepLinking: true
        }
      };

      try {
        apiRef.current = new window.JitsiMeetExternalAPI(domain, options);
        
        // Adicionar event listeners
        apiRef.current.addListener('videoConferenceLeft', () => {
          if (onClose) onClose();
        });
        
        apiRef.current.addListener('readyToClose', () => {
          if (onClose) onClose();
        });
      } catch (error) {
        console.error('Erro ao inicializar Jitsi:', error);
      }
    };

    initJitsi();

    // Cleanup ao desmontar
    return () => {
      if (apiRef.current) {
        apiRef.current.dispose();
      }
    };
  }, [roomName, userName, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div ref={containerRef} className="w-full h-full"></div>
    </div>
  );
};

export default JitsiCall;