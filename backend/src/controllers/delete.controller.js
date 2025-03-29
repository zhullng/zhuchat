import User from "../models/user.model.js";
import Token from "../models/token.model.js";
import crypto from "crypto";
import { sendEmail } from "../lib/email.js";
import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();
const stripe = new Stripe(process.env.STRIPE_API_SECRET);

// Enviar email para confirmar eliminação da conta
export const requestAccountDeletion = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Verificar se o utilizador existe
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilizador não encontrado" });
    }

    // Gerar token único
    const token = await Token.findOneAndDelete({ userId: user._id, type: "delete-account" });
    
    // Gerar novo token
    const newToken = await new Token({
      userId: user._id,
      token: crypto.randomBytes(32).toString("hex"),
      type: "delete-account",
      expiresAt: new Date(Date.now() + 3600000) // Expira em 1 hora
    }).save();

    // Construir URL para eliminação
    const deleteUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/security/delete-account/${newToken.token}`;

    // Enviar email
    const mailOptions = {
      to: user.email,
      subject: "Eliminação da sua conta ZhuChat",
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif; color: #333;">
          <h2 style="color: #e11d48; text-align: center;">Eliminação da sua conta ZhuChat</h2>
          <p>Olá ${user.fullName},</p>
          <p>Recebemos um pedido para eliminar a sua conta ZhuChat. Se não foi você a fazer este pedido, por favor ignore este email ou contacte o suporte.</p>
          <p>Se realmente deseja eliminar a sua conta, clique no link abaixo. <strong>Esta ação é irreversível e todos os seus dados serão permanentemente eliminados.</strong></p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${deleteUrl}" style="background-color: #e11d48; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Confirmar Eliminação da Conta</a>
          </div>
          <p>Este link expira em 1 hora por motivos de segurança.</p>
          <p>Se o botão não funcionar, copie e cole o seguinte link no seu navegador:</p>
          <p style="word-break: break-all; font-size: 14px; color: #666;">${deleteUrl}</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
          <p style="font-size: 12px; color: #999; text-align: center;">
            &copy; ${new Date().getFullYear()} ZhuChat. Todos os direitos reservados.
          </p>
        </div>
      `
    };

    await sendEmail(mailOptions);

    // Retornar token apenas em desenvolvimento para facilitar testes
    if (process.env.NODE_ENV === "development") {
      return res.status(200).json({ 
        message: "Email de confirmação enviado. Por favor, verifique a sua caixa de email.",
        _devToken: newToken.token
      });
    }

    res.status(200).json({ message: "Email de confirmação enviado. Por favor, verifique a sua caixa de email." });
    
  } catch (error) {
    console.error("Erro ao enviar email de eliminação de conta:", error);
    res.status(500).json({ message: "Erro ao processar pedido de eliminação de conta" });
  }
};

// Verificar token de eliminação
export const verifyDeleteToken = async (req, res) => {
  try {
    const { token } = req.params;
    
    // Verificar se o token existe e não expirou
    const tokenDoc = await Token.findOne({ 
      token, 
      type: "delete-account",
      expiresAt: { $gt: Date.now() }
    });
    
    if (!tokenDoc) {
      return res.status(400).json({ message: "Token inválido ou expirado" });
    }
    
    // Verificar se o utilizador ainda existe
    const user = await User.findById(tokenDoc.userId);
    if (!user) {
      return res.status(404).json({ message: "Utilizador não encontrado" });
    }
    
    res.status(200).json({ message: "Token válido", email: user.email });
    
  } catch (error) {
    console.error("Erro ao verificar token de eliminação:", error);
    res.status(500).json({ message: "Erro ao verificar token" });
  }
};

// Confirmar eliminação de conta
export const confirmAccountDeletion = async (req, res) => {
  try {
    const { token } = req.params;
    
    // Verificar se o token existe e não expirou
    const tokenDoc = await Token.findOne({ 
      token, 
      type: "delete-account",
      expiresAt: { $gt: Date.now() }
    });
    
    if (!tokenDoc) {
      return res.status(400).json({ message: "Token inválido ou expirado" });
    }
    
    // Encontrar o utilizador
    const user = await User.findById(tokenDoc.userId);
    if (!user) {
      return res.status(404).json({ message: "Utilizador não encontrado" });
    }

    // Se existir uma conta Stripe associada, marcar como excluída
    if (user.stripeCustomerId) {
      try {
        await stripe.customers.del(user.stripeCustomerId);
      } catch (stripeError) {
        console.error("Erro ao excluir cliente no Stripe:", stripeError);
        // Continuar com a exclusão mesmo se houver erro no Stripe
      }
    }

    // Excluir o utilizador
    await User.findByIdAndDelete(user._id);
    
    // Excluir todos os tokens associados
    await Token.deleteMany({ userId: user._id });
    
    // Limpar cookie JWT
    res.cookie("jwt", "", { maxAge: 0 });
    
    res.status(200).json({ message: "Conta eliminada com sucesso" });
    
  } catch (error) {
    console.error("Erro ao eliminar conta:", error);
    res.status(500).json({ message: "Erro ao eliminar conta" });
  }
};