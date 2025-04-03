// components/UploadProgressToast.jsx
// Este componente mostra o progresso de uploads grandes

import { useState, useEffect } from 'react';
import { useAuthStore } from "../store/useAuthStore";
import { X, Upload } from "lucide-react";

const UploadProgressToast = () => {
  const [uploads, setUploads] = useState({});
  const { socket } = useAuthStore();

  useEffect(() => {
    if (!socket) return;

    // Escutar eventos de progresso de upload
    const handleUploadProgress = (data) => {
      // Gerar um ID único para cada upload (combinação de nome de arquivo e remetente)
      const uploadId = `${data.fileName}_${data.senderId || 'unknown'}_${data.groupId || ''}`;
      
      setUploads(prev => ({
        ...prev,
        [uploadId]: {
          progress: data.progress,
          senderId: data.senderId,
          time: new Date(),
          fileName: data.fileName,
          groupId: data.groupId,
          error: data.error || false
        }
      }));
    };

    socket.on("uploadProgress", handleUploadProgress);

    // Limpar uploads concluídos após um tempo
    const interval = setInterval(() => {
      const now = new Date();
      setUploads(prev => {
        const newUploads = { ...prev };
        Object.entries(newUploads).forEach(([key, upload]) => {
          // Remover uploads concluídos depois de 5 segundos
          if (upload.progress === 100 && (now - upload.time) > 5000) {
            delete newUploads[key];
          }
          // Remover uploads com erro depois de 10 segundos
          else if (upload.error && (now - upload.time) > 10000) {
            delete newUploads[key];
          }
          // Remover uploads parados depois de 60 segundos
          else if ((now - upload.time) > 60000) {
            delete newUploads[key];
          }
        });
        return newUploads;
      });
    }, 1000);

    return () => {
      socket.off("uploadProgress", handleUploadProgress);
      clearInterval(interval);
    };
  }, [socket]);

  const dismissUpload = (uploadId) => {
    setUploads(prev => {
      const newUploads = { ...prev };
      delete newUploads[uploadId];
      return newUploads;
    });
  };

  // Não renderizar se não houver uploads
  if (Object.keys(uploads).length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 max-w-sm z-50 space-y-2">
      {Object.entries(uploads).map(([uploadId, upload]) => (
        <div 
          key={uploadId}
          className={`bg-base-200 rounded-md p-3 shadow-md border border-base-300 min-w-72 ${
            upload.error ? 'border-error' : ''
          }`}
        >
          <div className="flex justify-between items-center mb-1">
            <p className="text-sm font-medium truncate max-w-52">
              {upload.fileName}
              {upload.groupId && <span className="text-xs ml-1 opacity-70">(Grupo)</span>}
            </p>
            <button 
              onClick={() => dismissUpload(uploadId)}
              className="p-1 hover:bg-base-300 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="w-full bg-base-300 rounded-full h-2 mb-1">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ease-out ${
                upload.error ? 'bg-error' : 'bg-primary'
              }`}
              style={{ width: `${upload.progress}%` }}
            ></div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-xs opacity-70">
              {upload.error 
                ? 'Erro no upload' 
                : upload.progress < 100 
                  ? 'Enviando...' 
                  : 'Completo!'}
            </span>
            <span className="text-xs font-medium">
              {upload.progress}%
            </span>
          </div>
          
          {upload.progress < 100 && !upload.error && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-5">
              <Upload size={40} className="text-primary animate-pulse" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default UploadProgressToast;