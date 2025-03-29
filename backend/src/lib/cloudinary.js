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

// Configurações avançadas para o Cloudinary
const CLOUDINARY_OPTIONS = {
  resource_type: "auto",      // Detecta automaticamente o tipo de arquivo
  chunk_size: 6000000,        // Aumenta tamanho de chunk para 6MB
  timeout: 120000,            // Timeout de 2 minutos para uploads grandes
  use_filename: true,
  unique_filename: true,
  overwrite: false
};

// Função auxiliar para realizar upload no Cloudinary
const uploadToCloudinary = async (file, folder = "chat_files") => {
  try {
    const result = await cloudinary.uploader.upload(file, {
      ...CLOUDINARY_OPTIONS,
      folder
    });
    
    return {
      url: result.secure_url,
      public_id: result.public_id,
      resource_type: result.resource_type
    };
  } catch (error) {
    console.error("Erro de upload no Cloudinary:", error);
    throw new Error("Falha no upload para o Cloudinary");
  }
};

// Função auxiliar para excluir arquivo do Cloudinary
const deleteFromCloudinary = async (publicId, resourceType = "image") => {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    return { success: true };
  } catch (error) {
    console.error("Erro ao excluir do Cloudinary:", error);
    return { success: false, error };
  }
};

export { uploadToCloudinary, deleteFromCloudinary };
export default cloudinary;