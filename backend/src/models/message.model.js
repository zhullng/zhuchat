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
    
    // URL da imagem
    image: {
      type: String,
    },
    
    // Informações do arquivo
    file: {
      name: String,
      type: String,
      size: String,
      url: String
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