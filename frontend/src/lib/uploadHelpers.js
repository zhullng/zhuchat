// lib/uploadHelpers.js
// Funções auxiliares para upload de arquivos no cliente

/**
 * Processa um arquivo para fazer upload com notificação de progresso
 * @param {File} file - O arquivo a ser processado
 * @param {Function} onProgress - Função de callback para progresso (0-100)
 * @returns {Promise<string>} - Promise que resolve para string base64 do arquivo
 */
export const processFileWithProgress = (file, onProgress = () => {}) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      // Configurar evento de progresso
      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentLoaded = Math.round((event.loaded / event.total) * 100);
          onProgress(percentLoaded);
        }
      };
      
      // Configurar manipuladores de eventos
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Erro ao ler o arquivo'));
      
      // Iniciar leitura do arquivo
      reader.readAsDataURL(file);
    });
  };
  
  /**
   * Envia uma mensagem com arquivo e notificação de progresso
   * @param {Object} messageData - Dados da mensagem
   * @param {Function} sendMessage - Função para enviar mensagem
   * @param {Object} socket - Socket.IO para notificações de progresso
   * @param {String} receiverId - ID do destinatário
   * @returns {Promise<Object>} - Promise que resolve para a mensagem enviada
   */
  export const sendFileWithProgress = async (messageData, sendMessage, socket, receiverId) => {
    try {
      // Notificar início do upload
      if (socket && receiverId) {
        socket.emit("uploadProgress", {
          receiverId,
          fileName: messageData.file?.name || "arquivo",
          progress: 0
        });
      }
      
      // Atualizar progresso a cada 10%
      for (let i = 10; i <= 90; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 300));
        
        if (socket && receiverId) {
          socket.emit("uploadProgress", {
            receiverId,
            fileName: messageData.file?.name || "arquivo",
            progress: i
          });
        }
      }
      
      // Enviar a mensagem
      const result = await sendMessage(messageData);
      
      // Notificar conclusão
      if (socket && receiverId) {
        socket.emit("uploadProgress", {
          receiverId,
          fileName: messageData.file?.name || "arquivo",
          progress: 100
        });
      }
      
      return result;
    } catch (error) {
      // Notificar erro
      if (socket && receiverId) {
        socket.emit("uploadProgress", {
          receiverId,
          fileName: messageData.file?.name || "arquivo",
          progress: 0,
          error: true
        });
      }
      throw error;
    }
  };
  
  /**
   * Otimiza imagem antes do upload para reduzir tamanho
   * @param {File} imageFile - O arquivo de imagem
   * @param {Object} options - Opções de otimização
   * @returns {Promise<Blob>} - Promise que resolve para Blob otimizado
   */
  export const optimizeImage = (imageFile, options = {}) => {
    const { maxWidth = 1920, maxHeight = 1080, quality = 0.8 } = options;
    
    return new Promise((resolve, reject) => {
      // Criamos um elemento de imagem para carregar o arquivo
      const img = new Image();
      img.onload = () => {
        // Calcular as dimensões mantendo a proporção
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
        
        // Criar canvas para redimensionar
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        // Desenhar imagem redimensionada
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Converter para blob
        canvas.toBlob(
          (blob) => resolve(blob),
          imageFile.type || 'image/jpeg',
          quality
        );
      };
      
      img.onerror = () => reject(new Error('Erro ao carregar imagem'));
      
      // Carregar a imagem do arquivo
      img.src = URL.createObjectURL(imageFile);
    });
  };
  
  /**
   * Verifica se um arquivo é muito grande e precisa ser otimizado
   * @param {File} file - O arquivo a verificar
   * @param {Number} threshold - Tamanho limite em bytes 
   * @returns {Boolean} - True se o arquivo precisa de otimização
   */
  export const needsOptimization = (file, threshold = 5 * 1024 * 1024) => {
    // Se não for imagem ou for menor que o limite, não precisa otimizar
    if (!file.type.startsWith('image/') || file.size <= threshold) {
      return false;
    }
    
    // Não otimizar GIFs (para preservar animação)
    if (file.type === 'image/gif') {
      return false;
    }
    
    return true;
  };