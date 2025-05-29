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

    // Verificação básica de formato
    if (typeof fileData !== 'string' || !fileData.startsWith('data:')) {
      throw new Error("Formato de dados inválido");
    }

    // Configurações de upload com valores padrão mais seguros
    const uploadOptions = {
      folder,
      resource_type: options.resource_type || "auto",
      timeout: 120000, // 2 minutos
      ...options
    };

    console.log(`Iniciando upload para Cloudinary (${uploadOptions.resource_type})`);

    // Fazer upload com captura explícita de erros
    try {
      const result = await cloudinary.uploader.upload(fileData, uploadOptions);
      return {
        url: result.secure_url,
        public_id: result.public_id,
        resource_type: result.resource_type
      };
    } catch (cloudinaryError) {
      console.error("Erro específico do Cloudinary:", cloudinaryError);
      throw new Error(`Erro do Cloudinary: ${cloudinaryError.message}`);
    }
  } catch (error) {
    console.error("Erro ao fazer upload:", error);
    throw error;
  }
};
// Função para Eliminar um arquivo do Cloudinary
const deleteFromCloudinary = async (publicId, resourceType = "image") => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, { 
      resource_type: resourceType
    });
    
    return { success: result === "ok" || result.result === "ok" };
  } catch (error) {
    console.error("Erro ao Eliminar do Cloudinary:", error);
    return { success: false, error };
  }
};

export { uploadToCloudinary, deleteFromCloudinary };
export default cloudinary;