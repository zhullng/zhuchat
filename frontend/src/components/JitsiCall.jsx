// src/components/JitsiCall.jsx
import React, { useEffect, useRef } from 'react';

const JitsiCall = ({ roomName, userName, onClose }) => {
  const apiRef = useRef(null);
  const containerRef = useRef(null);
  const hasTriedToJoin = useRef(false);

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

    // Função para automaticamente clicar no botão de iniciar sessão
    const tryToStartMeeting = () => {
      if (hasTriedToJoin.current) return;
      
      console.log("Tentando iniciar sessão automaticamente...");
      hasTriedToJoin.current = true;
      
      // Tentar encontrar e clicar no botão de iniciar sessão
      setTimeout(() => {
        // Tentativa 1: Botão específico
        let joinButton = document.querySelector('button[data-testid="lobby.joinButton"]');
        if (joinButton) {
          console.log("Botão de iniciar sessão encontrado por data-testid");
          joinButton.click();
          return;
        }
        
        // Tentativa 2: Qualquer botão com o texto "Iniciar sessão"
        const buttons = document.querySelectorAll('button');
        for (const button of buttons) {
          if (button.textContent.includes('Iniciar sessão')) {
            console.log("Botão de iniciar sessão encontrado por texto");
            button.click();
            return;
          }
        }
        
        // Tentativa 3: Elementos da interface com o texto "Iniciar sessão"
        const allElements = document.querySelectorAll('*');
        for (const element of allElements) {
          if (element.textContent === 'Iniciar sessão' && element.tagName.toLowerCase() === 'button') {
            console.log("Botão de iniciar sessão encontrado (busca geral)");
            element.click();
            return;
          }
        }
        
        // Tentativa 4: Usar o API do Jitsi diretamente
        if (apiRef.current) {
          console.log("Tentando usar comandos API para iniciar sessão");
          apiRef.current.executeCommand('startMeeting');
          apiRef.current.executeCommand('joinAsParticipant');
        }
        
        console.log("Botão de iniciar sessão não encontrado automaticamente");
      }, 1500);
    };

    // Função para inicializar o Jitsi
    const initJitsi = async () => {
      if (!window.JitsiMeetExternalAPI) {
        await loadJitsiScript();
      }

      const domain = 'meet.jit.si';
      const options = {
        roomName: roomName,
        width: '100%',
        height: '100%',
        parentNode: containerRef.current,
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
          MOBILE_APP_PROMO: false
        },
        configOverwrite: {
          // Configurações para tentar evitar a tela de moderador
          disableModeratorIndicator: true,
          enableLobbyChat: false,
          requireDisplayName: false,
          enableWelcomePage: false,
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          startAsModerator: true,
          prejoinPageEnabled: false,
          disableDeepLinking: true,
          enableClosePage: true,
          lobby: {
            autoKnock: false,
            enableChat: false
          }
        }
      };

      try {
        console.log("Inicializando Jitsi API");
        apiRef.current = new window.JitsiMeetExternalAPI(domain, options);
        
        // Definir o tema da conferência
        apiRef.current.executeCommand('subject', 'ZhuChat Videochamada');
        
        // Registrar evento para quando a interface estiver pronta
        apiRef.current.addListener('videoConferenceJoined', () => {
          console.log("Entrou na conferência com sucesso");
        });
        
        apiRef.current.addListener('readyToClose', () => {
          console.log("Conferência pronta para fechar");
          if (onClose) onClose();
        });
        
        apiRef.current.addListener('videoConferenceLeft', () => {
          console.log("Saiu da conferência");
          if (onClose) onClose();
        });
        
        // Primeiro método para tentar iniciar automaticamente
        tryToStartMeeting();
        
        // Segunda tentativa após um tempo maior
        setTimeout(tryToStartMeeting, 3000);
        
        // Verificar se precisamos mostrar um botão manual
        setTimeout(() => {
          const moderatorScreen = document.querySelector('[data-testid="lobby.container"]');
          if (moderatorScreen) {
            console.log("Tela de moderador ainda visível após tentativas automáticas");
            
            // Criar botão alternativo direto no DOM
            const buttonContainer = document.createElement('div');
            buttonContainer.style.position = 'fixed';
            buttonContainer.style.bottom = '20px';
            buttonContainer.style.left = '50%';
            buttonContainer.style.transform = 'translateX(-50%)';
            buttonContainer.style.zIndex = '9999';
            
            const startButton = document.createElement('button');
            startButton.innerText = 'Iniciar Sessão Manualmente';
            startButton.style.padding = '12px 24px';
            startButton.style.backgroundColor = '#2196F3';
            startButton.style.color = 'white';
            startButton.style.border = 'none';
            startButton.style.borderRadius = '4px';
            startButton.style.cursor = 'pointer';
            startButton.style.fontSize = '16px';
            
            startButton.onclick = () => {
              const joinButton = document.querySelector('button[data-testid="lobby.joinButton"]');
              if (joinButton) {
                joinButton.click();
              }
            };
            
            buttonContainer.appendChild(startButton);
            document.body.appendChild(buttonContainer);
          }
        }, 5000);
        
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
      hasTriedToJoin.current = false;
    };
  }, [roomName, userName, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div ref={containerRef} className="w-full h-full"></div>
    </div>
  );
};

export default JitsiCall;