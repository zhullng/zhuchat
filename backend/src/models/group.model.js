import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    members: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
  },
  { timestamps: true }
);

// Método estático para verificar se um usuário é membro do grupo
groupSchema.statics.isMember = async function(groupId, userId) {
  const group = await this.findById(groupId);
  return group && group.members.includes(userId);
};

// Método estático para verificar se um usuário é admin do grupo
groupSchema.statics.isAdmin = async function(groupId, userId) {
  const group = await this.findById(groupId);
  return group && group.adminId.equals(userId);
};

const Group = mongoose.model("Group", groupSchema);

export default Group;