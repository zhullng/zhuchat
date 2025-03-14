import mongoose from "mongoose";

// Verificar se o modelo já existe para evitar sobrescrever
const transactionSchema = new mongoose.Schema(
  {
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true,
      index: true // Adicionar índice para melhorar performance de consultas
    },
    type: { 
      type: String, 
      enum: ["deposit", "withdrawal"], 
      required: true,
      index: true 
    },
    amount: { 
      type: Number, 
      required: true, 
      min: 0.01 
    },
    method: { 
      type: String, 
      enum: ["card", "paypal", "bank_transfer", "crypto"], 
      required: true 
    },
    details: { 
      type: Object, 
      default: {} 
    },
    status: { 
      type: String, 
      enum: ["pending", "completed", "failed"], 
      default: "pending",
      index: true 
    },
  },
  { 
    timestamps: true,
    // Adicionar toJSON para transformar o objeto ao retorná-lo como JSON
    toJSON: { 
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Verificar se o modelo já existe para evitar erro de sobrescrever modelo
const Transaction = mongoose.models.Transaction || mongoose.model("Transaction", transactionSchema);

export default Transaction;