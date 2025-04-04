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
    
    // Texto da mensagem (opcional se houver imagem ou ficheiro)
    text: {
      type: String,
      required: function() {
        // Texto obrigatório apenas se não houver imagem ou ficheiro
        return !this.image && !this.file;
      }
    },
    
    // URL da imagem no Cloudinary (se houver)
    image: {
      type: String,
    },
    
    // Informações do ficheiro (se houver)
    file: {
      name: String,       // Nome original do ficheiro
      type: String,       // Tipo MIME
      size: String,       // Tamanho formatado para exibição
      url: String,        // URL do Cloudinary
      public_id: String,  // ID público do Cloudinary (para exclusão)
    },
    
    // Status de leitura
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Índices para melhorar a performance nas consultas
messageSchema.index({ senderId: 1, receiverId: 1 });
messageSchema.index({ createdAt: -1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;