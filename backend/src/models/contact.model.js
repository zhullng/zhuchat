import mongoose from "mongoose";

const contactSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    email: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending"
    },
    // Campo opcional para adicionar uma nota/apelido ao contacto
    note: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

// Índice composto para garantir unicidade de cada relação de contacto
contactSchema.index({ userId: 1, contactId: 1 }, { unique: true });

const Contact = mongoose.model("Contact", contactSchema);

export default Contact;