import { generateToken } from "../lib/utils.js"; // Função para gerar token JWT
import User from "../models/user.model.js";
import crypto from "crypto";
import { sendPasswordResetEmail } from "../lib/emailService.js"; // Serviço de e-mail
import bcrypt from "bcryptjs"; 
//import cloudinary from "../lib/cloudinary.js"; 

export const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }, // Verifica se o token ainda é válido
    });

    if (!user) {
      return res.status(400).json({ message: "Token inválido ou expirado" });
    }

    // Atualiza a senha
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Senha redefinida com sucesso" });
  } catch (error) {
    console.error("Erro ao redefinir senha:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};

export const requestPasswordReset = async (req, res) => {
  const { email } = req.body;

  try {
    // Verifica se o e-mail existe
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "E-mail não encontrado" });
    }

    // Gera um token de redefinição de senha
    const resetToken = crypto.randomBytes(20).toString("hex");
    const resetTokenExpiry = Date.now() + 3600000; // 1 hora de validade

    // Salva o token no banco de dados
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();

    // Envia o e-mail com o link de redefinição
    const resetUrl = `https://zhuchat.onrender.com/reset-password?token=${resetToken}`;
    await sendPasswordResetEmail(user.email, resetUrl);

    res.status(200).json({ message: "E-mail de redefinição enviado com sucesso" });
  } catch (error) {
    console.error("Erro ao solicitar redefinição de senha:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};

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

    // Verifica se o email já existe (exceto para o próprio usuário)
    if (updates.email) {
      const emailExists = await User.findOne({
        email: updates.email,
        _id: { $ne: userId }, // Exclui o próprio usuário da verificação
      });
      if (emailExists) {
        errors.email = "Email já está em uso";
      }
    }

    // Verifica se o fullName já existe (exceto para o próprio usuário)
    if (updates.fullName) {
      const fullNameExists = await User.findOne({
        fullName: updates.fullName,
        _id: { $ne: userId }, // Exclui o próprio usuário da verificação
      });
      if (fullNameExists) {
        errors.fullName = "Nome completo já está em uso";
      }
    }

    // Se houver erros, retorna os erros específicos
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ errors });
    }

    // Define os campos permitidos para atualização
    const allowedUpdates = ["fullName", "email", "gender", "profilePic"];
    const filteredUpdates = Object.keys(updates)
      .filter((key) => allowedUpdates.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key];
        return obj;
      }, {});

    // Atualiza o usuário no banco de dados
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      filteredUpdates,
      { new: true } // Retorna o usuário atualizado
    ).select("-password"); // Exclui a senha da resposta

    // Retorna o usuário atualizado
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
