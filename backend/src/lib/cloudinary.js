import { v2 as cloudinary } from "cloudinary";
import { config } from "dotenv";

// Carrega as variáveis de ambiente do ficheiro .env
config();

// Configura a Cloudinary com as credenciais armazenadas nas variáveis de ambiente
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Log das configurações (sem mostrar secrets completos)
console.log("Configuração Cloudinary:", {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "Não definido",
  api_key: process.env.CLOUDINARY_API_KEY ? "Definido (primeiros 4 caracteres: " + 
    process.env.CLOUDINARY_API_KEY.substring(0, 4) + "...)" : "Não definido",
  api_secret: process.env.CLOUDINARY_API_SECRET ? "Definido (***)" : "Não definido"
});

// Configurações otimizadas para uploads grandes
const CLOUDINARY_OPTIONS = {
  resource_type: "auto",       // Detecta automaticamente o tipo de ficheiro
  chunk_size: 6000000,         // 6MB por chunk (reduzido para maior estabilidade)
  timeout: 600000,             // 10 minutos de timeout
  use_filename: true,          // Usar nome original
  unique_filename: true,       // Adicionar sufixo único
  overwrite: false,            // Não sobrescrever ficheiros
  folder: "chat_uploads",      // Pasta padrão para uploads
  max_file_size: 50000000,     // Limite de 50MB para arquivos
};

// Extrai o tipo MIME da string base64 se disponível
function getMimeTypeFromBase64(base64String) {
  try {
    if (!base64String || typeof base64String !== 'string') return null;
    const matches = base64String.match(/^data:([A-Za-z-+/]+);base64,/);
    return matches && matches.length > 1 ? matches[1] : null;
  } catch (error) {
    console.error("Erro ao extrair MIME type:", error);
    return null;
  }
}

// Determina o resource_type baseado no MIME type
function getResourceType(mimeType) {
  if (!mimeType) return "auto";
  
  if (mimeType.startsWith('image/')) return "image";
  if (mimeType.startsWith('video/')) return "video";
  if (mimeType === 'application/pdf') return "image"; // PDFs podem ser visualizados como imagens
  
  return "raw"; // Para outros tipos de arquivos
}

// Função auxiliar para realizar upload no Cloudinary com retentativas
const uploadToCloudinary = async (fileData, folder = "chat_uploads", options = {}) => {
  try {
    console.log("Iniciando upload para Cloudinary:", {
      folder,
      isString: typeof fileData === 'string',
      dataLength: typeof fileData === 'string' ? fileData.length : 'N/A',
      dataPrefix: typeof fileData === 'string' ? fileData.substring(0, 50) + '...' : 'N/A',
      options: { ...options }
    });

    // Verificação básica de integridade de dados
    if (!fileData) {
      throw new Error("Dados de arquivo vazios ou nulos");
    }

    if (typeof fileData !== 'string') {
      throw new Error(`Tipo de dados inválido: ${typeof fileData}`);
    }

    if (!fileData.startsWith('data:')) {
      throw new Error("Formato base64 inválido: falta prefixo 'data:'");
    }

    // Detectar tipo MIME da string base64
    const mimeType = getMimeTypeFromBase64(fileData);
    console.log("Tipo MIME detectado:", mimeType);

    // Determinar resource_type baseado no MIME
    const resourceType = getResourceType(mimeType);
    console.log("Resource type selecionado:", resourceType);

    // Personalizar opções para o upload específico
    const uploadOptions = {
      ...CLOUDINARY_OPTIONS,
      ...options,
      folder,
      resource_type: options.resource_type || resourceType
    };
    
    console.log("Opções de upload:", {
      ...uploadOptions,
      resource_type: uploadOptions.resource_type,
      chunk_size: uploadOptions.chunk_size,
      folder: uploadOptions.folder
    });

    // Sistema de retentativas para uploads
    let attempts = 0;
    const maxAttempts = 3;
    let lastError = null;
    
    while (attempts < maxAttempts) {
      try {
        console.log(`Tentativa ${attempts + 1} de upload para o Cloudinary`);
        const result = await cloudinary.uploader.upload(fileData, uploadOptions);
        console.log(`Upload bem-sucedido: ${result.public_id}`);
        
        return {
          url: result.secure_url,
          public_id: result.public_id,
          resource_type: result.resource_type
        };
      } catch (uploadError) {
        lastError = uploadError;
        attempts++;
        
        console.error(`Erro na tentativa ${attempts}:`, {
          message: uploadError.message,
          name: uploadError.name,
          details: JSON.stringify(uploadError, Object.getOwnPropertyNames(uploadError))
        });
        
        if (attempts >= maxAttempts) break;
        
        // Aguardar antes de tentar novamente (backoff exponencial)
        const delay = 2000 * Math.pow(2, attempts - 1); // 2s, 4s, 8s
        console.log(`Aguardando ${delay}ms antes da próxima tentativa...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // Se chegou aqui, todas as tentativas falharam
    const errorMsg = lastError?.message || "Falha no upload para o Cloudinary após múltiplas tentativas";
    throw new Error(`Erro de upload: ${errorMsg}`);
  } catch (error) {
    console.error("ERRO DETALHADO NO UPLOAD PARA CLOUDINARY:", {
      message: error.message,
      stack: error.stack,
      details: JSON.stringify(error, Object.getOwnPropertyNames(error))
    });
    
    throw error; // Propagar o erro completo para tratamento
  }
};

// Função auxiliar para excluir arquivo do Cloudinary
const deleteFromCloudinary = async (publicId, resourceType = "image") => {
  if (!publicId) return { success: false, error: "ID público não fornecido" };
  
  try {
    // Verificar se o publicId já contém o nome da pasta
    const id = publicId.includes('/') ? publicId : `chat_uploads/${publicId}`;
    
    console.log(`Excluindo recurso do Cloudinary: ${id} (tipo: ${resourceType})`);
    
    const result = await cloudinary.uploader.destroy(id, { 
      resource_type: resourceType,
      invalidate: true  // Invalidar CDN para garantir que o ficheiro seja realmente removido
    });
    
    console.log("Resultado da exclusão:", result);
    
    return { 
      success: result === "ok" || result.result === "ok", 
      result 
    };
  } catch (error) {
    console.error("Erro ao excluir do Cloudinary:", {
      message: error.message,
      publicId,
      resourceType,
      details: JSON.stringify(error, Object.getOwnPropertyNames(error))
    });
    return { success: false, error };
  }
};

export { uploadToCloudinary, deleteFromCloudinary };
export default cloudinary;