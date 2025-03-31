// src/components/JitsiCall.jsx
import React, { useEffect, useRef } from 'react';

const JitsiCall = ({ roomName, userName, onClose }) => {
  const apiRef = useRef(null);
  const containerRef = useRef(null);
  const hasTriedToJoin = useRef(false);

  // Função para encontrar e clicar no botão "Iniciar sessão"
  const clickStartButton = () => {
    // Tentar diretamente pelo atributo data-testid primeiro
    const startButton = document.querySelector('button[data-testid="lobby.joinButton"]');
    if (startButton) {
      console.log("Botão iniciar sessão encontrado! Clicando...");
      startButton.click();
      return true;
    }

    // Tentar por conteúdo de texto
    const allButtons = document.querySelectorAll('button');
    for (const btn of allButtons) {
      if (btn.textContent.includes('Iniciar sessão')) {
        console.log("Botão iniciar sessão encontrado por texto! Clicando...");
        btn.click();
        return true;
      }
    }

    // Última tentativa: procurar por qualquer elemento que pareça um botão de iniciar
    const elements = document.querySelectorAll('div[role="button"]');
    for (const el of elements) {
      if (el.textContent.includes('Iniciar') || el.textContent.includes('Start')) {
        console.log("Elemento tipo botão encontrado! Clicando...");
        el.click();
        return true;
      }
    }

    console.log("Nenhum botão de iniciar sessão encontrado");
    return false;
  };

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

      // Criar o botão de iniciar manualmente
      const createManualButton = () => {
        const existingButton = document.getElementById('manual-start-button');
        if (existingButton) return;

        const buttonContainer = document.createElement('div');
        buttonContainer.id = 'manual-start-container';
        buttonContainer.style.position = 'fixed';
        buttonContainer.style.bottom = '30px';
        buttonContainer.style.left = '50%';
        buttonContainer.style.transform = 'translateX(-50%)';
        buttonContainer.style.zIndex = '9999';
        
        const startButton = document.createElement('button');
        startButton.id = 'manual-start-button';
        startButton.innerText = 'Iniciar Reunião';
        startButton.style.padding = '12px 24px';
        startButton.style.backgroundColor = '#2196F3';
        startButton.style.color = 'white';
        startButton.style.border = 'none';
        startButton.style.borderRadius = '4px';
        startButton.style.cursor = 'pointer';
        startButton.style.fontSize = '16px';
        startButton.style.fontWeight = 'bold';
        
        startButton.onclick = clickStartButton;
        
        buttonContainer.appendChild(startButton);
        document.body.appendChild(buttonContainer);
      };

      const domain = 'meet.jit.si';
      const options = {
        roomName: roomName,
        width: '100%',
        height: '100%',
        parentNode: containerRef.current,
        lang: 'pt',
        userInfo: {
          displayName: userName
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: [
            'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
            'fodeviceselection', 'hangup', 'chat', 'settings', 'raisehand',
            'invite', 'security'
          ],
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          DEFAULT_BACKGROUND: '#3c4043',
          DEFAULT_REMOTE_DISPLAY_NAME: 'Usuário',
          TOOLBAR_ALWAYS_VISIBLE: true,
          GENERATE_ROOMNAMES_ON_WELCOME_PAGE: false,
          MOBILE_APP_PROMO: false,
        },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          prejoinPageEnabled: false,
          disableDeepLinking: true,
          enableClosePage: true
        }
      };

      try {
        console.log("Inicializando Jitsi API");
        apiRef.current = new window.JitsiMeetExternalAPI(domain, options);
        
        // Definir o tema da conferência
        apiRef.current.executeCommand('subject', 'ZhuChat Videochamada');
        
        // Tentar clicar no botão após um tempo
        setTimeout(() => {
          if (!clickStartButton()) {
            createManualButton();
          }
        }, 2000);

        // Segunda tentativa
        setTimeout(() => {
          if (!clickStartButton()) {
            createManualButton();
          }
        }, 4000);
        
        // Adicionar event listeners
        apiRef.current.addListener('videoConferenceJoined', () => {
          console.log("Entrou na conferência com sucesso");
          // Remover o botão manual se existir
          const manualButton = document.getElementById('manual-start-container');
          if (manualButton) manualButton.remove();
        });
        
        apiRef.current.addListener('readyToClose', () => {
          if (onClose) onClose();
        });
        
        apiRef.current.addListener('videoConferenceLeft', () => {
          console.log("Saiu da conferência");
          if (onClose) onClose();
        });
      } catch (error) {
        console.error('Erro ao inicializar Jitsi:', error);
      }
    };

    initJitsi();

    // Cleanup ao desmontar
    return () => {
      console.log("Desmontando componente Jitsi");
      if (apiRef.current) {
        apiRef.current.dispose();
      }
      
      // Remover o botão manual
      const manualButton = document.getElementById('manual-start-container');
      if (manualButton) manualButton.remove();
    };
  }, [roomName, userName, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div ref={containerRef} className="w-full h-full"></div>
    </div>
  );
};

export default JitsiCall;