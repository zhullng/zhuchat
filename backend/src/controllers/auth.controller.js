import { generateToken } from "../lib/utils.js"; // Função para gerar token JWT
import User from "../models/user.model.js";
import bcrypt from "bcryptjs"; 
import cloudinary from "../lib/cloudinary.js"; 

export const signup = async (req, res) => {
  const { fullName, email, password, gender } = req.body; // Removi o username

  try {
    // Verificação melhorada dos campos
    if (!fullName?.trim() || !email?.trim() || !password || !gender?.trim()) {
      return res.status(400).json({
        message: "Todos os campos são obrigatórios",
        requiredFields: ["fullName", "email", "password", "gender"],
        received: req.body
      });
    }

    // Verificar se email já existe
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        message: "Email já registado",
        errorField: "email"
      });
    }

    // Hash da password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Criar novo usuário
    const newUser = new User({
      fullName,
      email,
      gender,
      password: hashedPassword,
    });

    if (newUser) {
      // Cria o token JWT e envia na resposta
      generateToken(newUser._id, res);
      await newUser.save(); // Guarda o novo user na bd

    // Resposta sem a password
    res.status(201).json({
      _id: newUser._id,
      fullName: newUser.fullName,
      email: newUser.email,
      profilePic: newUser.profilePic,
      gender: newUser.gender
    });
  }
  } catch (error) {
    console.log("Erro no controlador de registo:", error.message);
    res.status(500).json({ message: "Erro interno do servidor" });
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
    const userId = req.user._id;
    const updates = req.body;
    const errors = {};

    if (updates.email) {
      const emailExists = await User.findOne({ 
        email: updates.email,
        _id: { $ne: userId }
      });
      if (emailExists) errors.email = "Email já está em uso";
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ errors });
    }

    // Atualiza os campos permitidos
    const allowedUpdates = ['fullName', 'email', 'gender', 'profilePic'];
    const filteredUpdates = Object.keys(updates)
      .filter(key => allowedUpdates.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key];
        return obj;
      }, {});

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      filteredUpdates,
      { new: true }
    ).select('-password');

    res.status(200).json(updatedUser);
    
  } catch (error) {
    console.log("Erro na atualização do perfil:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
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
