import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/\S+@\S+\.\S+/, 'Email inválido']
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 50,
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
      enum: ["masculino", "feminino", "outro", "prefiro não dizer"],
      default: "não especificado",
    },
    phone: {
      type: String,
      trim: true,
      default: "",
      validate: {
        validator: function(v) {
          // International phone number validation
          // Optional input, but if provided, must be valid
          return v === "" || /^(\+|00)?[1-9]\d{1,14}$/.test(v.replace(/[\s-().]/g, ''));
        },
        message: props => `${props.value} não é um número de telefone válido!`
      }
    },
    country: {
      type: String,
      trim: true,
      default: ""
    },
    city: {
      type: String,
      trim: true,
      default: ""
    },
    balance: {
      type: Number,
      default: 0,
      min: 0
    },
    stripeCustomerId: {
      type: String,
      unique: true,
      sparse: true
    },
  },
  { 
    timestamps: true 
  }
);

const User = mongoose.model("User", userSchema);

export default User;