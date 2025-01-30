import { generateToken } from "../lib/utils.js"; // Função para gerar token JWT
import User from "../models/user.model.js";
import bcrypt from "bcryptjs"; 
import cloudinary from "../lib/cloudinary.js"; 

export const signup = async (req, res) => {
  const { fullName, username, email, password, gender } = req.body; // Adicione username

  try {
    // Verificar campos obrigatórios
    if (!fullName || !username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Verificar se username ou email já existem
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      const errors = {};
      if (existingUser.email === email) errors.email = "Email already exists";
      if (existingUser.username === username) errors.username = "Username already exists";
      return res.status(400).json({ errors });
    }

    // Resto do código de criação de usuário...
    const newUser = new User({
      fullName,
      username, // Adicionar username
      email,
      gender,
      password: hashedPassword,
    });

    // Na resposta incluir o username
    res.status(201).json({
      _id: newUser._id,
      username: newUser.username,
      fullName: newUser.fullName,
      email: newUser.email,
      profilePic: newUser.profilePic,
      gender: newUser.gender
    });
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
    const { profilePic } = req.body; // Recebe o novo pfp (imagem)
    const userId = req.user._id; // Recebe o ID do user autenticado

    // Verifica se recebeu
    if (!profilePic) {
      return res.status(400).json({ message: "Profile pic is required" });
    }

    // Faz o upload da imagem para o Cloudinary
    const uploadResponse = await cloudinary.uploader.upload(profilePic);
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic: uploadResponse.secure_url }, // Atualiza a URL da imagem de perfil
      { new: true } // Envia o user atualizado
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
