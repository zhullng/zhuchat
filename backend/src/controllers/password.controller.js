import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Para armazenar tokens de redefinição de senha temporariamente
const passwordResetTokens = {};

// Função para testar as configurações de email
const testEmailConfig = async () => {
  try {
    console.log("🔍 Testando configurações de email...");
    console.log("📧 Configurações carregadas:", {
      host: process.env.EMAIL_HOST || "(não definido)",
      port: process.env.EMAIL_PORT || "(não definido)",
      secure: process.env.EMAIL_SECURE === "true" ? true : false,
      user: process.env.EMAIL_USER ? "✅ Configurado" : "❌ Não configurado",
      pass: process.env.EMAIL_PASS ? "✅ Configurado" : "❌ Não configurado",
    });

    // Tentar criar uma conta de teste
    console.log("🔄 Criando conta de teste Ethereal...");
    const testAccount = await nodemailer.createTestAccount();
    console.log("✅ Conta de teste criada:", {
      user: testAccount.user,
      pass: testAccount.pass
    });

    return testAccount;
  } catch (error) {
    console.error("❌ Erro ao testar configuração de email:", error);
    return null;
  }
};

// Criar transportador para envio de email (versão simplificada para debug)
const createTransporter = async () => {
  try {
    // Tentar usar configurações do ambiente
    if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      console.log("🔄 Criando transportador com credenciais configuradas...");
      return nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || "587"),
        secure: process.env.EMAIL_SECURE === "true",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
    } 
    
    // Criar conta de teste Ethereal como fallback
    console.log("⚠️ Credenciais de email não configuradas, usando Ethereal...");
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
  } catch (error) {
    console.error("❌ Erro ao criar transportador:", error);
    throw error;
  }
};

export const forgotPassword = async (req, res) => {
  try {
    console.log("🔄 Iniciando processo de recuperação de palavra-passe...");
    const { email } = req.body;
    console.log("📧 Email recebido:", email);

    if (!email) {
      console.log("❌ Email não fornecido na requisição");
      return res.status(400).json({ message: "Email é obrigatório" });
    }

    // Verificar se o email existe na base de dados
    console.log("🔍 Verificando se o email existe na base de dados...");
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log("❌ Email não encontrado na base de dados:", email);
      // Por segurança, não informamos que o email não existe
      return res.status(200).json({ 
        message: "Se este email estiver registado, receberá instruções para redefinir a sua palavra-passe"
      });
    }
    
    console.log("✅ Utilizador encontrado:", user._id);

    // Gerar token seguro
    const resetToken = crypto.randomBytes(32).toString("hex");
    console.log("🔑 Token gerado:", resetToken.substring(0, 8) + "..." + resetToken.substring(resetToken.length - 8));
    
    // Definir expiração do token (1 hora)
    const tokenExpires = new Date();
    tokenExpires.setHours(tokenExpires.getHours() + 1);
    console.log("⏱️ Token expira em:", tokenExpires);

    // Armazenar o token
    passwordResetTokens[resetToken] = {
      email: user.email,
      expires: tokenExpires
    };
    console.log("💾 Token armazenado para o email:", user.email);

    // URL do frontend para redefinição de senha
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;
    console.log("🔗 URL de redefinição:", resetUrl);

    // Conteúdo do email
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"ZhuChat" <recuperacao@zhuchat.com>',
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
      console.log("🔄 Tentando criar transportador de email...");
      const transporter = await createTransporter();
      console.log("✅ Transportador criado");

      console.log("📨 Tentando enviar email...");
      const info = await transporter.sendMail(mailOptions);
      console.log("📧 Email enviado, ID:", info.messageId);
      
      // Se estamos usando Ethereal, mostrar a URL de visualização
      if (info.ethereal) {
        console.log("🔍 URL para visualizar o email (apenas para testes):", nodemailer.getTestMessageUrl(info));
      }
      
      // Para fins de desenvolvimento, mostrar o token para testar a funcionalidade
      console.log("🧪 [APENAS PARA DESENVOLVIMENTO] Token completo:", resetToken);
      console.log("🧪 [APENAS PARA DESENVOLVIMENTO] URL completa:", resetUrl);
    } catch (emailError) {
      console.error("❌ Erro ao enviar email:", emailError);
      console.log("⚠️ Continuando o processo apesar do erro de email");
      // Para fins de desenvolvimento, ainda retornamos sucesso e mostramos o token
      console.log("🧪 [APENAS PARA DESENVOLVIMENTO] Use este token para testar:", resetToken);
      console.log("🧪 [APENAS PARA DESENVOLVIMENTO] URL manual:", 
        `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`);
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
    console.log("🔄 Verificando token de redefinição...");
    const { token } = req.params;
    console.log("🔑 Token recebido:", token);
    
    // Verificar se o token existe e não expirou
    const tokenData = passwordResetTokens[token];
    
    if (!tokenData) {
      console.log("❌ Token não encontrado na memória");
      return res.status(400).json({ message: "Token inválido ou expirado" });
    }
    
    console.log("📧 Token associado ao email:", tokenData.email);
    console.log("⏱️ Expiração do token:", tokenData.expires);
    
    if (new Date() > new Date(tokenData.expires)) {
      console.log("⏱️ Token expirado");
      // Token expirado, removê-lo
      delete passwordResetTokens[token];
      return res.status(400).json({ message: "Token expirado" });
    }
    
    console.log("✅ Token válido");
    res.status(200).json({ message: "Token válido" });
  } catch (error) {
    console.error("❌ Erro ao verificar token:", error);
    res.status(500).json({ message: "Erro ao verificar token" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    console.log("🔄 Iniciando redefinição de palavra-passe...");
    const { token } = req.params;
    const { password } = req.body;
    
    console.log("🔑 Token recebido:", token);
    
    // Verificar se o token existe e não expirou
    const tokenData = passwordResetTokens[token];
    
    if (!tokenData) {
      console.log("❌ Token não encontrado na memória");
      return res.status(400).json({ message: "Token inválido ou expirado" });
    }
    
    console.log("📧 Token associado ao email:", tokenData.email);
    
    if (new Date() > new Date(tokenData.expires)) {
      console.log("⏱️ Token expirado");
      // Token expirado, removê-lo
      delete passwordResetTokens[token];
      return res.status(400).json({ message: "Token expirado" });
    }
    
    if (!password || password.length < 6) {
      console.log("❌ Palavra-passe inválida");
      return res.status(400).json({ message: "A palavra-passe deve ter pelo menos 6 caracteres" });
    }
    
    // Encontrar o utilizador
    console.log("🔍 Procurando utilizador com email:", tokenData.email);
    const user = await User.findOne({ email: tokenData.email });
    
    if (!user) {
      console.log("❌ Utilizador não encontrado");
      return res.status(404).json({ message: "Utilizador não encontrado" });
    }
    
    console.log("✅ Utilizador encontrado:", user._id);
    
    // Atualizar a senha
    console.log("🔄 Atualizando palavra-passe...");
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    user.password = hashedPassword;
    await user.save();
    console.log("✅ Palavra-passe atualizada com sucesso");
    
    // Remover o token após uso bem-sucedido
    delete passwordResetTokens[token];
    console.log("🗑️ Token removido após uso");
    
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
    await testEmailConfig();
    console.log("✅ Controlador inicializado com sucesso");
  } catch (error) {
    console.error("❌ Erro ao inicializar controlador:", error);
  }
};

// Chamar inicialização automaticamente
initializePasswordController();