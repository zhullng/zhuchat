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

// Configurações otimizadas para uploads grandes
const CLOUDINARY_OPTIONS = {
  resource_type: "auto",       // Detecta automaticamente o tipo de ficheiro
  chunk_size: 10000000,        // 10MB por chunk (aumentado para ficheiros grandes)
  timeout: 300000,             // 5 minutos de timeout
  use_filename: true,          // Usar nome original do ficheiro
  unique_filename: true,       // Adicionar sufixo único
  overwrite: false,            // Não sobrescrever ficheiros
  folder: "chat_files",        // Pasta padrão
  max_file_size: 100000000,    // Limite de 100MB (configuração do Cloudinary)
};

// Função auxiliar para realizar upload no Cloudinary com retentativas
const uploadToCloudinary = async (file, folder = "chat_files") => {
  try {
    // Personalizar opções para o upload específico
    const uploadOptions = {
      ...CLOUDINARY_OPTIONS,
      folder
    };
    
    // Sistema de retentativas para uploads grandes
    let attempts = 0;
    const maxAttempts = 3;
    let lastError = null;
    
    while (attempts < maxAttempts) {
      try {
        console.log(`Tentativa ${attempts + 1} de upload para o Cloudinary`);
        const result = await cloudinary.uploader.upload(file, uploadOptions);
        console.log(`Upload bem-sucedido: ${result.public_id}`);
        
        return {
          url: result.secure_url,
          public_id: result.public_id,
          resource_type: result.resource_type
        };
      } catch (uploadError) {
        lastError = uploadError;
        attempts++;
        console.error(`Erro na tentativa ${attempts}:`, uploadError);
        
        if (attempts >= maxAttempts) break;
        
        // Aguardar antes de tentar novamente (backoff exponencial)
        await new Promise(resolve => setTimeout(resolve, 2000 * attempts));
      }
    }
    
    // Se chegou aqui, todas as tentativas falharam
    throw lastError || new Error("Falha no upload para o Cloudinary após múltiplas tentativas");
  } catch (error) {
    console.error("Erro no upload para Cloudinary:", error);
    throw new Error("Falha no upload do ficheiro");
  }
};

// Função auxiliar para excluir arquivo do Cloudinary
const deleteFromCloudinary = async (publicId, resourceType = "auto") => {
  if (!publicId) return { success: false, error: "ID público não fornecido" };
  
  try {
    // Tentar determinar se o publicId já contém o nome da pasta
    const id = publicId.includes('/') ? publicId : `chat_files/${publicId}`;
    
    const result = await cloudinary.uploader.destroy(id, { 
      resource_type: resourceType,
      invalidate: true  // Invalidar CDN para garantir que o ficheiro seja realmente removido
    });
    
    return { 
      success: result === "ok" || result.result === "ok", 
      result 
    };
  } catch (error) {
    console.error("Erro ao excluir do Cloudinary:", error);
    return { success: false, error };
  }
};

export { uploadToCloudinary, deleteFromCloudinary };
export default cloudinary;