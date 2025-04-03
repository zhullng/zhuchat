import { v2 as cloudinary } from "cloudinary";
import { config } from "dotenv";

config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Configurações avançadas para o Cloudinary
const CLOUDINARY_OPTIONS = {
  resource_type: "auto",      // Detecta automaticamente o tipo de arquivo
  chunk_size: 50000000,       // Aumenta tamanho de chunk para 50MB
  timeout: 600000,            // Timeout de 10 minutos para uploads grandes
  use_filename: true,
  unique_filename: true,
  overwrite: false,
  invalidate: true,
  quality: "auto:good",
  fetch_format: "auto",
  max_file_size: 200000000    // Permite arquivos até 200MB
};

// Função para upload no Cloudinary com suporte a tipos específicos
const uploadToCloudinary = async (file, options = {}) => {
  try {
    // Validações iniciais
    if (!file || typeof file !== 'string' || !file.startsWith('data:')) {
      throw new Error('Formato de arquivo inválido');
    }

    // Detectar tipo de arquivo automaticamente
    const mimeType = file.split(';')[0].split(':')[1];
    const fileExtension = mimeType.split('/')[1];

    // Configurações específicas por tipo de arquivo
    const uploadOptions = {
      ...CLOUDINARY_OPTIONS,
      ...options,
      resource_type: options.resourceType || 'auto',
      folder: options.folder || 'chat_files',
      public_id: options.public_id || `file_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      format: fileExtension
    };

    // Adicionar transformações específicas por tipo
    if (mimeType.startsWith('image/')) {
      uploadOptions.transformation = [
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ];
    } else if (mimeType.startsWith('audio/') || mimeType.startsWith('video/')) {
      uploadOptions.transformation = [
        { format: 'mp3' },
        { audio_codec: 'aac' }
      ];
    }

    // Fazer upload
    const result = await cloudinary.uploader.upload(file, uploadOptions);

    return {
      url: result.secure_url,
      public_id: result.public_id,
      resource_type: result.resource_type,
      format: result.format,
      bytes: result.bytes,
      original_filename: result.original_filename
    };
  } catch (error) {
    console.error('Erro detalhado no upload do Cloudinary:', {
      message: error.message,
      stack: error.stack,
      cloudinaryError: error
    });

    // Traduzir códigos de erro do Cloudinary
    const errorMap = {
      400: 'Arquivo inválido ou corrompido',
      401: 'Credenciais de API inválidas',
      403: 'Permissão negada',
      413: 'Arquivo muito grande',
      422: 'Erro de processamento de arquivo',
      429: 'Limite de upload excedido'
    };

    const errorCode = error.http_code || 500;
    const errorMessage = errorMap[errorCode] || 'Erro no upload de arquivo';

    throw new Error(`${errorMessage}: ${error.message}`);
  }
};

// Função para exclusão de arquivos no Cloudinary
const deleteFromCloudinary = async (publicId, resourceType = "image") => {
  if (!publicId) return { success: false, error: "ID público não fornecido" };
  
  try {
    // Extrai o caminho correto do publicId se for uma URL completa
    let finalPublicId = publicId;
    if (publicId.includes('cloudinary.com')) {
      const parts = publicId.split('/');
      const uploadIndex = parts.findIndex(part => part === 'upload');
      
      if (uploadIndex !== -1 && uploadIndex < parts.length - 2) {
        const pathParts = parts.slice(uploadIndex + 2);
        const lastPart = pathParts[pathParts.length - 1];
        const lastPartWithoutExt = lastPart.split('.')[0];
        pathParts[pathParts.length - 1] = lastPartWithoutExt;
        
        finalPublicId = pathParts.join('/');
      }
    }
    
    // Tenta excluir o arquivo
    const result = await cloudinary.uploader.destroy(finalPublicId, { 
      resource_type: resourceType,
      invalidate: true 
    });
    
    return { success: true, result };
  } catch (error) {
    console.error("Erro ao excluir do Cloudinary:", error);
    return { 
      success: false, 
      error: error.message || "Erro desconhecido ao excluir arquivo"
    };
  }
};

// Função para gerar URL otimizada
const getOptimizedUrl = (url, options = {}) => {
  if (!url) return null;
  
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const uploadIndex = pathParts.findIndex(part => part === 'upload');
    
    if (uploadIndex === -1) return url;
    
    const resourceType = pathParts[uploadIndex - 1] || 'image';
    const version = pathParts[uploadIndex + 1].startsWith('v') ? pathParts[uploadIndex + 1] : null;
    
    const publicIdParts = version 
      ? pathParts.slice(uploadIndex + 2) 
      : pathParts.slice(uploadIndex + 1);
    
    const filename = publicIdParts[publicIdParts.length - 1];
    const filenameWithoutExt = filename.split('.')[0];
    publicIdParts[publicIdParts.length - 1] = filenameWithoutExt;
    
    const publicId = publicIdParts.join('/');
    
    // Transformações padrão por tipo
    const defaultTransformations = {
      image: { quality: 'auto', fetch_format: 'auto', dpr: 'auto' },
      video: { quality: 'auto', streaming_profile: 'full_hd' },
      raw: {}
    };
    
    const transformation = {
      ...defaultTransformations[resourceType] || {},
      ...options
    };
    
    // Gerar URL com transformações
    return cloudinary.url(publicId, {
      type: 'upload',
      resource_type: resourceType,
      secure: true,
      transformation
    });
  } catch (error) {
    console.error("Erro ao gerar URL otimizada:", error);
    return url; // Retorna a URL original em caso de erro
  }
};

export { 
  uploadToCloudinary, 
  deleteFromCloudinary, 
  getOptimizedUrl 
};