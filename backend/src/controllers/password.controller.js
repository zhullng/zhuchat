import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Para armazenar tokens de redefinição de senha temporariamente
const passwordResetTokens = {};

// Criar transportador para envio de email
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

export const forgotPassword = async (req, res) => {
  try {
    console.log("🔄 Iniciando processo de recuperação de palavra-passe...");
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: "Email é obrigatório" });
    }

    // Verificar se o email existe na base de dados
    const user = await User.findOne({ email });
    
    if (!user) {
      // Por segurança, não informamos que o email não existe
      return res.status(200).json({ 
        message: "Se este email estiver registado, receberá instruções para redefinir a sua palavra-passe"
      });
    }

    // Gerar token seguro
    const resetToken = crypto.randomBytes(32).toString("hex");
    
    // Definir expiração do token (1 hora)
    const tokenExpires = new Date();
    tokenExpires.setHours(tokenExpires.getHours() + 1);

    // Armazenar o token
    passwordResetTokens[resetToken] = {
      email: user.email,
      expires: tokenExpires
    };

    // URL do frontend para redefinição de senha
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

    // Conteúdo do email
    const mailOptions = {
      from: process.env.EMAIL_FROM || `"ZhuChat" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Redefinição de Palavra-passe - ZhuChat",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #333;">Redefinição de Palavra-passe</h2>
          </div>
          
          <p>Olá ${user.fullName},</p>
          
          <p>Recebemos um pedido para redefinir a palavra-passe da sua conta ZhuChat. Para prosseguir com a redefinição, clique no botão abaixo:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Redefinir Palavra-passe</a>
          </div>
          
          <p><strong>Link alternativo:</strong> <a href="${resetUrl}">${resetUrl}</a></p>
          
          <p>Este link é válido por 1 hora. Se não solicitou a redefinição da sua palavra-passe, pode ignorar este email.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center; color: #666; font-size: 12px;">
            <p>© ${new Date().getFullYear()} ZhuChat. Todos os direitos reservados.</p>
          </div>
        </div>
      `
    };

    try {
      const transporter = createTransporter();
      const info = await transporter.sendMail(mailOptions);
      console.log("📧 Email enviado, ID:", info.messageId);
    } catch (emailError) {
      console.error("❌ Erro ao enviar email:", emailError);
      // Continuar o processo mesmo com erro de email (para desenvolvimento)
    }

    // Sempre retornamos uma resposta de sucesso por razões de segurança
    res.status(200).json({ 
      message: "Se este email estiver registado, receberá instruções para redefinir a sua palavra-passe",
      // Apenas para desenvolvimento, incluir o token na resposta
      _devToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
    });
  } catch (error) {
    console.error("❌ Erro no processo de recuperação de palavra-passe:", error);
    res.status(500).json({ message: "Erro ao processar o pedido de recuperação" });
  }
};

export const verifyResetToken = (req, res) => {
  try {
    const { token } = req.params;
    
    // Verificar se o token existe e não expirou
    const tokenData = passwordResetTokens[token];
    
    if (!tokenData) {
      return res.status(400).json({ message: "Token inválido ou expirado" });
    }
    
    if (new Date() > new Date(tokenData.expires)) {
      // Token expirado, removê-lo
      delete passwordResetTokens[token];
      return res.status(400).json({ message: "Token expirado" });
    }
    
    res.status(200).json({ message: "Token válido" });
  } catch (error) {
    console.error("❌ Erro ao verificar token:", error);
    res.status(500).json({ message: "Erro ao verificar token" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    
    // Verificar se o token existe e não expirou
    const tokenData = passwordResetTokens[token];
    
    if (!tokenData) {
      return res.status(400).json({ message: "Token inválido ou expirado" });
    }
    
    if (new Date() > new Date(tokenData.expires)) {
      // Token expirado, removê-lo
      delete passwordResetTokens[token];
      return res.status(400).json({ message: "Token expirado" });
    }
    
    if (!password || password.length < 6) {
      return res.status(400).json({ message: "A palavra-passe deve ter pelo menos 6 caracteres" });
    }
    
    // Encontrar o utilizador
    const user = await User.findOne({ email: tokenData.email });
    
    if (!user) {
      return res.status(404).json({ message: "Utilizador não encontrado" });
    }
    
    // Atualizar a senha
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    user.password = hashedPassword;
    await user.save();
    
    // Remover o token após uso bem-sucedido
    delete passwordResetTokens[token];
    
    res.status(200).json({ message: "Palavra-passe redefinida com sucesso" });
  } catch (error) {
    console.error("❌ Erro ao redefinir palavra-passe:", error);
    res.status(500).json({ message: "Erro ao redefinir palavra-passe" });
  }
};

// Função de inicialização para testar a configuração de email
export const initializePasswordController = async () => {
  try {
    console.log("🚀 Inicializando controlador de recuperação de senha...");
    const transporter = createTransporter();
    const isEmailConfigured = await transporter.verify().catch(e => false);
    console.log("📧 Configuração de email:", isEmailConfigured ? "✅ Funcionando" : "⚠️ Com problemas");
  } catch (error) {
    console.error("❌ Erro ao inicializar controlador:", error);
  }
};

// Chamar inicialização automaticamente
initializePasswordController();