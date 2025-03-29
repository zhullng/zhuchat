import mongoose from "mongoose";

const tokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User"
  },
  token: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ["delete-account"]  // Apenas para eliminação de conta
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 3600000) // 1 hora de validade padrão
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 3600 // Expiração automática após 1 hora
  }
});

// Índice para otimizar consultas
tokenSchema.index({ userId: 1, type: 1 });
tokenSchema.index({ token: 1, type: 1 });

const Token = mongoose.model("Token", tokenSchema);

export default Token;