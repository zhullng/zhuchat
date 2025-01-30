import { generateToken } from "../lib/utils.js"; // Função para gerar token JWT
import User from "../models/user.model.js";
import crypto from "crypto";
import { sendPasswordResetEmail } from "../lib/emailService.js"; // Serviço de e-mail
import bcrypt from "bcryptjs";

export const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    // Encontra o usuário com base no token de redefinição e se o token não expirou
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
    user.resetPasswordToken = undefined; // Limpa o token após o uso
    user.resetPasswordExpires = undefined; // Limpa a expiração
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
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "E-mail não encontrado" });
    }

    // Gera o token
    const resetToken = crypto.randomBytes(20).toString("hex");
    const resetTokenExpiry = Date.now() + 3600000; // O token expira em 1 hora

    // Atualiza o usuário com o token e a data de expiração
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();

    // Envia o e-mail de redefinição
    const resetUrl = `https://zhuchat.onrender.com/reset-password?token=${resetToken}`; // URL de redefinição
    await sendPasswordResetEmail(user.email, resetUrl);

    res.status(200).json({ message: "E-mail de redefinição enviado com sucesso" });
  } catch (error) {
    console.error("Erro no servidor:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};
