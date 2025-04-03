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
  resource_type: "auto",      
  chunk_size: 50000000,       
  timeout: 600000,            
  use_filename: true,
  unique_filename: true,
  overwrite: false,
  invalidate: true,
  quality: "auto:good",
  fetch_format: "auto",
  max_file_size: 200000000    
};

// Função para upload no Cloudinary com suporte a tipos específicos
export const uploadToCloudinary = async (file, options = {}) => {
  // Implementação original...
};

// Função para exclusão de arquivos no Cloudinary
export const deleteFromCloudinary = async (publicId, resourceType = "image") => {
  // Implementação original...
};

// Função para gerar URL otimizada
export const getOptimizedUrl = (url, options = {}) => {
  // Implementação original...
};

// Exportação default do objeto cloudinary
export default cloudinary;