  import mongoose from "mongoose";

  const transferSchema = new mongoose.Schema(
    {
      sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // ID do remetente
      receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // ID do destinatário
      amount: { type: Number, required: true, min: 0.01 }, // Valor da transferência (mínimo 0.01)
      status: { type: String, enum: ["completed", "pending", "failed"], default: "completed" }, // Estado da transferência
    },
    { timestamps: true } // Salva data de criação automaticamente
  );

  const Transfer = mongoose.model("Transfer", transferSchema);

  export default Transfer;
