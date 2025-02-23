import User from "../models/user.model.js";
import stripe from "stripe";
const stripeClient = stripe(process.env.STRIPE_API_SECRET); // Cliente Stripe

// Função para realizar a transferência de fundos
export const transferFunds = async (req, res) => {
  const { senderId, receiverId, amount } = req.body; // Pega os dados da requisição
  const sender = await User.findById(senderId); // Encontra o usuário remetente
  const receiver = await User.findById(receiverId); // Encontra o usuário receptor

  try {
    // Verifica se o remetente e o receptor existem
    if (!sender || !receiver) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    // Verifica se o remetente tem saldo suficiente
    if (sender.balance < amount) {
      return res.status(400).json({ error: "Saldo insuficiente." });
    }

    // Deduz o valor do remetente e adiciona ao receptor
    sender.balance -= amount;
    receiver.balance += amount;

    // Atualiza os saldos no banco de dados
    await sender.save();
    await receiver.save();

    // Cria uma cobrança no Stripe para a transação
    const charge = await stripeClient.charges.create({
      amount: amount * 100, // valor em centavos
      currency: "eur", // moeda
      description: "Transferência de fundos",
      source: req.body.tokenId, // Token enviado pelo frontend
    });

    // Se a cobrança foi bem-sucedida, retorne a resposta com a transação
    return res.status(200).json({ message: "Transferência realizada com sucesso!", charge });

  } catch (error) {
    console.log("Erro ao realizar a transferência: ", error.message);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
};
