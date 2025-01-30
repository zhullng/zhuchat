import { generateToken } from "../lib/utils.js"; // Função para gerar token JWT
import User from "../models/user.model.js";
import bcrypt from "bcryptjs"; 
import cloudinary from "../lib/cloudinary.js"; 

export const signup = async (req, res) => {
  const { fullName, email, password, gender } = req.body; // Adicionei gender
  try {
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "Email already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      fullName,
      email,
      gender, // Novo campo
      password: hashedPassword,
    });

    if (newUser) {
      generateToken(newUser._id, res);
      await newUser.save();

      res.status(201).json({
        _id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        profilePic: newUser.profilePic,
        gender: newUser.gender // Adicionado na resposta
      });
    } else {
      res.status(400).json({ message: "Invalid user data" }); 
    }
  } catch (error) {
    console.log("Error in signup controller", error.message);
    res.status(500).json({ message: "Internal Server Error" }); 
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body; // Recebe os dados de login
  try {
    // Procura na bd
    const user = await User.findOne({ email });

    // Se não existir
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Verifica se a pass está bem
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Cria o token JWT e envia na resposta
    generateToken(user._id, res);

    // Recebe os dados do user, exceto a pass
    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
    });
  } catch (error) {
    console.log("Error in login controller", error.message);
    res.status(500).json({ message: "Internal Server Error" }); 
  }
};

export const logout = (req, res) => {
  try {
    // Limpa o cookie que contém o token JWT
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.log("Error in logout controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { profilePic, gender } = req.body; // Adicionei gender
    const userId = req.user._id;

    const updateData = {};
    if (profilePic) {
      const uploadResponse = await cloudinary.uploader.upload(profilePic);
      updateData.profilePic = uploadResponse.secure_url;
    }
    if (gender) {
      updateData.gender = gender; // Adicionei atualização de gênero
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    );

    res.status(200).json(updatedUser);
  } catch (error) {
    console.log("error in update profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Função para verificar se o user está autenticado
export const checkAuth = (req, res) => {
  try {
    // Envia as informações do user autenticado
    res.status(200).json(req.user);
  } catch (error) {
    console.log("Error in checkAuth controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
