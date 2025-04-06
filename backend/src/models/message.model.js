import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    // ID do remetente
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    
    // ID do destinatário
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    
    // Texto da mensagem
    text: {
      type: String,
      default: "",
    },
    
    // URL da imagem (para uploads via Cloudinary)
    image: {
      type: String,
    },
    
    // Informações de arquivo codificadas como JSON
    fileData: {
      type: String, // Armazena o JSON do arquivo
    },
    
    // Status de leitura
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Índices para melhorar a performance
messageSchema.index({ senderId: 1, receiverId: 1 });
messageSchema.index({ createdAt: -1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;