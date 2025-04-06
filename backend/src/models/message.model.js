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
    
    // Texto da mensagem (opcional se houver imagem ou arquivo)
    text: {
      type: String,
      required: function() {
        // Texto obrigatório apenas se não houver imagem ou arquivo
        return !this.image && !this.file;
      }
    },
    
    // URL da imagem (se houver imagens)
    image: {
      type: String,
    },
    
    // Informações do arquivo (se houver arquivo)
    file: {
      name: String,        // Nome original do arquivo
      type: String,        // Tipo MIME do arquivo
      size: String,        // Tamanho formatado do arquivo
      path: String         // Caminho do arquivo no servidor
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