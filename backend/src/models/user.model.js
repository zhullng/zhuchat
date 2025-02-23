import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    fullName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    profilePic: {
      type: String,
      default: "",
    },
    gender: {
      type: String,
      enum: ["male", "female"],
      default: "",
    },
    balance: {
      type: Number,
      default: 0, // Campo que representa o saldo do usuário, começando com 0
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
