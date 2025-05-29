import User from "../models/user.model.js";
import Transaction from "../models/transaction.model.js";
import { validateCard } from "../lib/paymentValidation.js";
import { checkDailyLimit } from "./utils/simpleLimits.js";

// Função para criar ou atualizar cliente de pagamento
const ensurePaymentCustomer = async (user) => {
  try {
    // Se já tiver ID do cliente, retorná-lo
    if (user.stripeCustomerId) {
      return user.stripeCustomerId;
    }

    // Em uma aplicação real, aqui você conectaria com Stripe ou outro gateway
    // Para este exemplo, simularemos a criação de um ID de cliente
    const customerId = `cust_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    // Atualizar o utilizador com o ID do cliente
    await User.findByIdAndUpdate(user._id, { 
      stripeCustomerId: customerId 
    });

    return customerId;
  } catch (error) {
    console.log("Error in ensurePaymentCustomer: ", error.message);
    throw new Error("Erro ao processar cliente de pagamento");
  }
};

// Depositar fundos com cartão
export const depositFunds = async (req, res) => {
  try {
    const { amount, cardDetails } = req.body;
    const userId = req.user._id;

    // Validar montante
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Montante inválido" });
    }

    // Verificar limite diário
    const limitInfo = await checkDailyLimit(userId, "deposit");
    if (limitInfo.exceeded || amount > limitInfo.remaining) {
      return res.status(400).json({ 
        message: `Limite diário de €${limitInfo.limit} excedido. Disponível: €${limitInfo.remaining}`,
        limitInfo
      });
    }

    // Validar detalhes do cartão
    if (!validateCard(cardDetails)) {
      return res.status(400).json({ message: "Detalhes do cartão inválidos" });
    }

    // Garantir que o utilizador tem ID de cliente
    const customerId = await ensurePaymentCustomer(req.user);

    // Em uma aplicação real, aqui você processaria o pagamento com um gateway
    // Para este exemplo, simularemos um pagamento bem-sucedido
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    // Criar Transferência
    const transaction = new Transaction({
      user: userId,
      type: "deposit",
      amount,
      method: "card",
      details: {
        cardLast4: cardDetails.number.slice(-4),
        paymentId: paymentId
      },
      status: "completed"
    });

    await transaction.save();

    // Atualizar saldo do utilizador
    await User.findByIdAndUpdate(userId, { $inc: { balance: amount } });

    res.status(201).json({
      message: "Depósito efetuado com sucesso",
      transaction,
      limitInfo
    });
  } catch (error) {
    console.log("Error in depositFunds controller: ", error.message);
    res.status(500).json({ message: "Erro no servidor" });
  }
};

// Depositar com outros métodos (PayPal, transferência bancária, etc.)
export const depositWithOtherMethod = async (req, res) => {
  try {
    const { amount, method, details } = req.body;
    const userId = req.user._id;

    // Validar montante
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Montante inválido" });
    }

    // Verificar limite diário
    const limitInfo = await checkDailyLimit(userId, "deposit");
    if (limitInfo.exceeded || amount > limitInfo.remaining) {
      return res.status(400).json({ 
        message: `Limite diário de €${limitInfo.limit} excedido. Disponível: €${limitInfo.remaining}`,
        limitInfo
      });
    }

    // Validar método
    if (!["paypal", "bank_transfer", "crypto"].includes(method)) {
      return res.status(400).json({ message: "Método de pagamento inválido" });
    }

    // Determinar status inicial
    const initialStatus = method === "bank_transfer" ? "pending" : "completed";

    // Criar Transferência
    const transaction = new Transaction({
      user: userId,
      type: "deposit",
      amount,
      method,
      details,
      status: initialStatus
    });

    await transaction.save();

    // Atualizar saldo apenas para Transferências completas
    if (initialStatus === "completed") {
      await User.findByIdAndUpdate(userId, { $inc: { balance: amount } });
    }

    res.status(201).json({
      message: initialStatus === "pending" ? "Depósito pendente de aprovação" : "Depósito efetuado com sucesso",
      transaction,
      limitInfo
    });
  } catch (error) {
    console.log("Error in depositWithOtherMethod controller: ", error.message);
    res.status(500).json({ message: "Erro no servidor" });
  }
};

// Exportar métodos
export default {
  depositFunds,
  depositWithOtherMethod
};