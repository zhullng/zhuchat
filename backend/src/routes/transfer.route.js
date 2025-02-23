// src/routes/transfer.route.js
import express from "express";
import stripe from "stripe";

const router = express.Router();
const STRIPE_API_SECRET = process.env.STRIPE_API_SECRET; // Sua chave secreta do Stripe (modo de teste ou produção)
const stripeInstance = stripe(STRIPE_API_SECRET);

// Rota para realizar transferência entre usuários
// No backend, você espera o paymentMethodId vindo do frontend
router.post("/transferir", async (req, res) => {
  const { valor, paymentMethodId, destinatarioAccountId } = req.body;

  // Verifica se os dados foram passados corretamente
  if (!valor || !paymentMethodId || !destinatarioAccountId) {
    return res.status(400).json({ error: "Dados incompletos" });
  }

  try {
    // Cria um PaymentIntent para a conta do remetente (fazendo o pagamento)
    const paymentIntent = await stripeInstance.paymentIntents.create({
      amount: valor * 100, // O valor em centavos (para EUR)
      currency: "eur", // Moeda em Euros
      payment_method: paymentMethodId, // ID da conta de pagamento do remetente
      confirm: true,
    });

    // Cria a transferência para o destinatário
    const transfer = await stripeInstance.transfers.create({
      amount: valor * 100, // Transferência do valor em centavos
      currency: "eur", // Moeda em Euros
      destination: destinatarioAccountId, // ID da conta do destinatário
      source_transaction: paymentIntent.id, // A transação de pagamento associada
    });

    res.json({ transfer });
  } catch (error) {
    console.error("Erro ao realizar transferência:", error);
    res.status(500).json({ error: "Erro ao realizar a transferência" });
  }
});

export default router;
