import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    participants: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    }],
    // Você pode adicionar mais campos, como descrição do grupo, imagem de capa, etc.
  },
  { timestamps: true }
);

const Group = mongoose.model("Group", groupSchema);

export default Group;
