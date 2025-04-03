import { v2 as cloudinary } from "cloudinary";
import { config } from "dotenv";

// Carrega as variáveis de ambiente do ficheiro .env
config();

// Configura a Cloudinary com as credenciais armazenadas nas variáveis de ambiente
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Configurações avançadas para o Cloudinary
const CLOUDINARY_OPTIONS = {
  resource_type: "auto",      // Detecta automaticamente o tipo de arquivo
  chunk_size: 20000000,       // Aumenta tamanho de chunk para 20MB (era 6MB)
  timeout: 300000,            // Timeout de 5 minutos para uploads grandes (era 2 minutos)
  use_filename: true,
  unique_filename: true,
  overwrite: false,
  invalidate: true,           // Invalida o CDN ao substituir arquivos
  quality: "auto:good",       // Otimização automática da qualidade
  fetch_format: "auto",       // Automaticamente usa o melhor formato
  max_file_size: 100000000    // Permite arquivos até 100MB
};

// Função auxiliar para realizar upload no Cloudinary com suporte a tipos específicos
const uploadToCloudinary = async (file, options = {}) => {
  try {
    const folder = options.folder || "chat_files";
    let fileType = options.resourceType || "auto";
    
    // Configurações específicas baseadas no tipo de arquivo
    const typeSpecificOptions = {};
    
    // Se for uma string de arquivo (base64), tenta detectar o tipo
    if (typeof file === 'string' && file.startsWith('data:')) {
      // Detecção de tipo para ajustar configurações
      if (file.includes('image/')) {
        fileType = 'image';
        typeSpecificOptions.eager = [{ width: 1200, crop: "limit" }];
        typeSpecificOptions.eager_async = true;
      } else if (file.includes('video/')) {
        fileType = 'video';
        typeSpecificOptions.eager = [{ streaming_profile: "full_hd" }];
        typeSpecificOptions.eager_async = true;
      } else if (file.includes('audio/')) {
        fileType = 'video'; // Áudio usa o tipo 'video' no Cloudinary
      }
    }
    
    // Gerar um ID único com timestamp
    const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    
    // Configurações finais
    const uploadOptions = {
      ...CLOUDINARY_OPTIONS,
      ...typeSpecificOptions,
      ...options,
      resource_type: fileType,
      folder,
      public_id: options.public_id || uniqueId
    };
    
    // Fazer upload com tratamento de erro aprimorado
    const result = await cloudinary.uploader.upload(file, uploadOptions);
    
    return {
      url: result.secure_url,
      public_id: result.public_id,
      resource_type: result.resource_type,
      format: result.format,
      original_filename: result.original_filename,
      bytes: result.bytes
    };
  } catch (error) {
    console.error("Erro detalhado de upload no Cloudinary:", error);
    
    // Mensagem de erro mais específica baseada no código de erro
    let errorMessage = "Falha no upload para o Cloudinary";
    
    if (error.http_code === 400) {
      errorMessage = "Arquivo inválido ou corrompido";
    } else if (error.http_code === 401) {
      errorMessage = "Credenciais de API inválidas";
    } else if (error.http_code === 403) {
      errorMessage = "Permissão negada para este upload";
    } else if (error.http_code === 404) {
      errorMessage = "Recurso não encontrado";
    } else if (error.http_code === 413) {
      errorMessage = "Arquivo muito grande para upload";
    } else if (error.http_code === 420) {
      errorMessage = "Taxa de upload excedida";
    } else if (error.http_code === 500) {
      errorMessage = "Erro interno do servidor Cloudinary";
    } else if (error.message && error.message.includes("timeout")) {
      errorMessage = "Tempo esgotado durante o upload. Tente um arquivo menor ou verifique sua conexão.";
    }
    
    throw new Error(errorMessage);
  }
};

// Função auxiliar melhorada para excluir arquivo do Cloudinary
const deleteFromCloudinary = async (publicId, resourceType = "image") => {
  if (!publicId) return { success: false, error: "ID público não fornecido" };
  
  try {
    // Extrai o caminho correto do publicId se for uma URL completa
    let finalPublicId = publicId;
    if (publicId.includes('cloudinary.com')) {
      // Extrair o public_id de uma URL do Cloudinary
      const parts = publicId.split('/');
      const uploadIndex = parts.findIndex(part => part === 'upload');
      
      if (uploadIndex !== -1 && uploadIndex < parts.length - 2) {
        // Remove versão e pega pasta/arquivo
        // Format: https://res.cloudinary.com/cloud_name/[resource_type]/upload/v[version]/[folder]/[filename].[ext]
        const pathParts = parts.slice(uploadIndex + 2);
        
        // Remover extensão do último item
        const lastPart = pathParts[pathParts.length - 1];
        const lastPartWithoutExt = lastPart.split('.')[0];
        pathParts[pathParts.length - 1] = lastPartWithoutExt;
        
        finalPublicId = pathParts.join('/');
      }
    }
    
    // Tenta excluir o arquivo com várias tentativas e tipos
    let result;
    try {
      // Primeira tentativa com o tipo especificado
      result = await cloudinary.uploader.destroy(finalPublicId, { 
        resource_type: resourceType,
        invalidate: true 
      });
    } catch (firstError) {
      console.warn(`Primeira tentativa falhou, tentando outros tipos: ${firstError.message}`);
      
      // Segunda tentativa com tipo 'auto' se a primeira falhar
      try {
        result = await cloudinary.uploader.destroy(finalPublicId, { 
          resource_type: "auto",
          invalidate: true 
        });
      } catch (secondError) {
        // Terceira tentativa com outros tipos comuns
        const resourceTypes = ["image", "video", "raw"];
        let success = false;
        
        for (const type of resourceTypes) {
          if (type === resourceType) continue; // Já tentamos este
          
          try {
            result = await cloudinary.uploader.destroy(finalPublicId, { 
              resource_type: type,
              invalidate: true 
            });
            success = true;
            break;
          } catch (err) {
            console.warn(`Falha ao excluir como ${type}: ${err.message}`);
          }
        }
        
        if (!success) {
          throw secondError; // Re-lança o erro se todas as tentativas falharem
        }
      }
    }
    
    return { success: true, result };
  } catch (error) {
    console.error("Erro ao excluir do Cloudinary:", error);
    return { 
      success: false, 
      error: error.message || "Erro desconhecido ao excluir arquivo"
    };
  }
};

// Função para gerar uma URL assinada e otimizada
const getOptimizedUrl = (url, options = {}) => {
  if (!url) return null;
  
  try {
    // Extrair o publicId e resourceType da URL
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const uploadIndex = pathParts.findIndex(part => part === 'upload');
    
    if (uploadIndex === -1) return url;
    
    const resourceType = pathParts[uploadIndex - 1] || 'image';
    const version = pathParts[uploadIndex + 1].startsWith('v') ? pathParts[uploadIndex + 1] : null;
    
    // Montar o publicId
    const publicIdParts = version 
      ? pathParts.slice(uploadIndex + 2) 
      : pathParts.slice(uploadIndex + 1);
    
    // Remover extensão do último item
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

export { uploadToCloudinary, deleteFromCloudinary, getOptimizedUrl, CLOUDINARY_OPTIONS };
export default cloudinary;  