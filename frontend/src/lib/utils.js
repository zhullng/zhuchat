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
 * Verifica se o arquivo é um vídeo QuickTime/MOV
 * @param {File} file O arquivo a ser verificado
 * @returns {boolean} True se for um vídeo MOV/QuickTime
 */
export const isQuickTimeVideo = (file) => {
  if (!file) return false;
  
  return (
    file.type === 'video/quicktime' || 
    file.name.toLowerCase().endsWith('.mov') || 
    file.type === 'video/mov'
  );
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

/**
 * Verifica se o dispositivo é iOS
 * @returns {boolean} True se for um dispositivo iOS
 */
export const isIOSDevice = () => {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  return /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
};