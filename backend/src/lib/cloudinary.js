import { v2 as cloudinary } from "cloudinary";
import { config } from "dotenv";

// Carrega as variáveis de ambiente
config();

// Configura o Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Função simplificada para upload no Cloudinary
const uploadToCloudinary = async (fileData, folder = "chat_uploads", options = {}) => {
  try {
    if (!fileData) {
      throw new Error("Dados de arquivo vazios");
    }

    // Configurações padrão
    const uploadOptions = {
      folder,
      resource_type: options.resource_type || "auto",
      ...options
    };

    // Fazer o upload
    const result = await cloudinary.uploader.upload(fileData, uploadOptions);
    
    return {
      url: result.secure_url,
      public_id: result.public_id,
      resource_type: result.resource_type
    };
  } catch (error) {
    console.error("Erro no upload para Cloudinary:", error);
    throw error;
  }
};

// Função para excluir um arquivo do Cloudinary
const deleteFromCloudinary = async (publicId, resourceType = "image") => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, { 
      resource_type: resourceType
    });
    
    return { success: result === "ok" || result.result === "ok" };
  } catch (error) {
    console.error("Erro ao excluir do Cloudinary:", error);
    return { success: false, error };
  }
};

export { uploadToCloudinary, deleteFromCloudinary };
export default cloudinary;