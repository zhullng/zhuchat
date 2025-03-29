import User from "../models/user.model.js";
import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();
const stripe = new Stripe(process.env.STRIPE_API_SECRET);

// Eliminar conta diretamente (sem confirmação por email)
export const deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Verificar se o utilizador existe
    const user = await User.findById(userId);
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
    await User.findByIdAndDelete(userId);
    
    // Limpar cookie JWT
    res.cookie("jwt", "", { maxAge: 0 });
    
    res.status(200).json({ message: "Conta eliminada com sucesso" });
    
  } catch (error) {
    console.error("Erro ao eliminar conta:", error);
    res.status(500).json({ message: "Erro ao eliminar conta" });
  }
};