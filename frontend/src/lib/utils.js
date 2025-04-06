export function formatMessageTime(date) {
  const formattedDate = new Date(date);
  const day = String(formattedDate.getDate()).padStart(2, '0');
  const month = String(formattedDate.getMonth() + 1).padStart(2, '0');
  const year = formattedDate.getFullYear();
  const hours = String(formattedDate.getHours()).padStart(2, '0');
  const minutes = String(formattedDate.getMinutes()).padStart(2, '0');
  
  return `${day}/${month}/${year}, ${hours}:${minutes}`;
}

/**
 * Detecta o suporte de navegador para vários formatos de vídeo
 * @returns {Object} Objeto com informações de suporte para cada formato
 */
export const detectVideoSupport = () => {
  const support = {
    mp4: false,
    webm: false,
    ogg: false,
    mov: false
  };
  
  // Testa suporte para vários formatos
  try {
    const video = document.createElement('video');
    
    support.mp4 = video.canPlayType('video/mp4') !== '';
    support.webm = video.canPlayType('video/webm') !== '';
    support.ogg = video.canPlayType('video/ogg') !== '';
    support.mov = video.canPlayType('video/quicktime') !== '';
    
    console.log("Suporte de vídeo detectado:", support);
    return support;
  } catch (error) {
    console.error("Erro ao detectar suporte de vídeo:", error);
    return support;
  }
};

/**
 * Normaliza um Data URI de vídeo para melhorar compatibilidade
 * @param {string} dataURI O data URI original do vídeo
 * @param {string} originalType O tipo MIME original
 * @returns {string} Data URI normalizado
 */
export const normalizeVideoDataURI = (dataURI, originalType) => {
  if (!dataURI) return dataURI;
  
  // Se for QuickTime, tenta converter para MP4
  if (originalType === 'video/quicktime' || originalType.includes('quicktime')) {
    return dataURI.replace('data:video/quicktime', 'data:video/mp4');
  }
  
  return dataURI;
};

/**
 * Tenta extrair um frame do vídeo para usar como poster
 * @param {string} videoSrc Source do vídeo (URL ou data URI)
 * @returns {Promise<string>} URI da imagem do poster
 */
export const extractVideoPoster = (videoSrc) => {
  return new Promise((resolve, reject) => {
    try {
      const video = document.createElement('video');
      video.autoplay = false;
      video.muted = true;
      video.src = videoSrc;
      video.currentTime = 1; // Tenta pegar o frame em 1 segundo
      
      video.onloadeddata = () => {
        try {
          // Tenta capturar o frame quando os dados forem carregados
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          const posterUrl = canvas.toDataURL('image/jpeg', 0.5);
          resolve(posterUrl);
          
          // Limpa recursos
          video.src = '';
          video.load();
        } catch (e) {
          console.error("Erro ao extrair poster:", e);
          resolve(null);
        }
      };
      
      video.onerror = () => {
        console.error("Erro ao carregar vídeo para extração de poster");
        resolve(null);
      };
      
      // Se demorar muito, resolve com null
      setTimeout(() => {
        if (video.src) {
          console.log("Timeout na extração de poster");
          video.src = '';
          video.load();
          resolve(null);
        }
      }, 5000);
      
    } catch (error) {
      console.error("Erro na preparação para extração de poster:", error);
      resolve(null);
    }
  });
};

/**
 * Retorna true se o navegador estiver em um dispositivo móvel
 */
export const isMobileDevice = () => {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  
  // Verifica padrões de user agent de dispositivos móveis
  if (/android|iPad|iPhone|iPod|Windows Phone|webOS|BlackBerry/i.test(userAgent)) {
    return true;
  }
  
  // Tenta usar recursos específicos de detecção de dispositivo
  if (typeof window.orientation !== 'undefined' || navigator.maxTouchPoints > 0) {
    return true;
  }
  
  // Verifica tamanho da tela (dispositivos com telas pequenas geralmente são móveis)
  if (window.innerWidth <= 800) {
    return true;
  }
  
  return false;
};