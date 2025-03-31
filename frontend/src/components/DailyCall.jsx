// src/components/DailyCall.jsx
import React, { useEffect, useRef, useState } from 'react';
import { X, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import toast from "react-hot-toast";

const DailyCall = ({ roomName, userName, onClose }) => {
  const wrapperRef = useRef(null);
  const callFrameRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Função para carregar o SDK do Daily.co
    const loadDailyScript = () => {
      return new Promise((resolve, reject) => {
        // Verificar se o script já foi carregado
        if (window.DailyIframe) {
          resolve(window.DailyIframe);
          return;
        }

        // Carregar o script
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/@daily-co/daily-js/dist/daily-iframe.js';
        script.async = true;
        script.onload = () => resolve(window.DailyIframe);
        script.onerror = (err) => reject(new Error('Falha ao carregar Daily.co SDK'));
        document.body.appendChild(script);
      });
    };

    const initializeCall = async () => {
      try {
        // Carregar o SDK
        const DailyIframe = await loadDailyScript();
        
        // Gerar URL da sala no Daily.co baseado no roomName
        // Em produção: Você deve criar salas via API do Daily.co no seu backend
        // Para este exemplo, usaremos uma demo domain
        const roomUrl = `https://zhuchat.daily.co/${roomName}`;
        
        // Configurações do iframe
        const callFrameOptions = {
          url: roomUrl,
          showLeaveButton: true,
          userName: userName,
          iframeStyle: {
            position: 'relative',
            width: '100%',
            height: '100%',
            border: '0',
            borderRadius: '0',
            zIndex: 1
          }
        };
        
        // Criar o iframe para a chamada
        if (wrapperRef.current) {
          callFrameRef.current = DailyIframe.createFrame(wrapperRef.current, callFrameOptions);
          
          // Adicionar event listeners
          callFrameRef.current
            .on('loaded', () => {
              console.log('Daily iframe carregado');
            })
            .on('joining-meeting', () => {
              console.log('Entrando na reunião...');
              toast.success("Conectando à chamada...");
            })
            .on('joined-meeting', () => {
              console.log('Entrou na reunião');
              setIsLoading(false);
              toast.success("Chamada conectada com sucesso!");
            })
            .on('left-meeting', () => {
              console.log('Saiu da reunião');
              onClose();
            })
            .on('error', (err) => {
              console.error('Erro Daily:', err);
              setError(`Erro na chamada: ${err.errorMsg || 'Erro desconhecido'}`);
              toast.error(`Erro na chamada: ${err.errorMsg || 'Erro desconhecido'}`);
              setIsLoading(false);
            });
            
          // Iniciar a reunião
          await callFrameRef.current.join();
        }
      } catch (err) {
        console.error('Falha ao inicializar chamada:', err);
        setError(err.message || 'Erro ao iniciar a chamada de vídeo');
        toast.error("Não foi possível iniciar a chamada de vídeo");
        setIsLoading(false);
      }
    };

    initializeCall();

    // Cleanup ao desmontar o componente
    return () => {
      if (callFrameRef.current) {
        callFrameRef.current.destroy();
      }
    };
  }, [roomName, userName, onClose]);

  // Se houver erro, mostrar mensagem
  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        <div className="p-4 flex justify-between items-center bg-gray-900">
          <h2 className="text-white font-medium">Erro na chamada</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full bg-red-500 text-white"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 flex items-center justify-center bg-gray-800">
          <div className="text-center text-white p-4">
            <div className="bg-red-500 p-4 rounded-lg mb-4">
              <X size={48} className="mx-auto mb-2" />
              <h3 className="text-xl font-bold mb-2">Não foi possível iniciar a chamada</h3>
              <p>{error}</p>
            </div>
            <button
              onClick={onClose}
              className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded"
            >
              Voltar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Cabeçalho da chamada */}
      <div className="p-4 flex justify-between items-center bg-gray-900">
        <h2 className="text-white font-medium">
          {isLoading ? 'Iniciando chamada...' : 'Chamada em andamento'}
        </h2>
        <button 
          onClick={() => {
            if (callFrameRef.current) {
              callFrameRef.current.leave();
            } else {
              onClose();
            }
          }}
          className="p-2 rounded-full bg-red-500 text-white"
          title="Encerrar chamada"
        >
          <X size={20} />
        </button>
      </div>
      
      {/* Área da chamada */}
      <div className="flex-1 relative bg-gray-800">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
            <p className="text-white ml-4">Conectando à chamada...</p>
          </div>
        )}
        <div ref={wrapperRef} className="w-full h-full"></div>
      </div>
    </div>
  );
};

export default DailyCall;