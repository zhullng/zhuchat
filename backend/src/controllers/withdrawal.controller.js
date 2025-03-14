import User from "../models/user.model.js";
import Transaction from "../models/transaction.model.js";
import { validateCard } from "../lib/paymentValidation.js";

// Função para levantar fundos para cartão
const withdrawFunds = async (req, res) => {
  console.log("withdrawFunds iniciado", req.body);
  try {
    const { amount, cardDetails } = req.body;
    const userId = req.user?._id;
    
    console.log("UserID:", userId);
    console.log("Amount:", amount);
    console.log("CardDetails:", cardDetails);

    // Verificar se o req.user existe
    if (!userId) {
      console.error("Erro: req.user não definido ou não tem _id");
      return res.status(401).json({ message: "Não autorizado" });
    }

    // Validar montante
    if (!amount || amount <= 0) {
      console.log("Montante inválido");
      return res.status(400).json({ message: "Montante inválido" });
    }

    // Verificar se o user existe antes de verificar o saldo
    const user = await User.findById(userId);
    if (!user) {
      console.error("Usuário não encontrado:", userId);
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    console.log("Usuário encontrado:", user.username || user.email);
    console.log("Saldo do usuário:", user.balance);

    // Verificar saldo
    if (user.balance < amount) {
      console.log("Saldo insuficiente");
      return res.status(400).json({ message: "Saldo insuficiente" });
    }

    // Verificar se a função validateCard existe
    if (typeof validateCard !== 'function') {
      console.error("Erro: validateCard não é uma função");
      return res.status(500).json({ message: "Erro interno do servidor" });
    }

    // Validar detalhes do cartão
    if (!validateCard(cardDetails)) {
      console.log("Detalhes do cartão inválidos");
      return res.status(400).json({ message: "Detalhes do cartão inválidos" });
    }

    // Verificar se o modelo Transaction existe
    if (!Transaction) {
      console.error("Erro: modelo Transaction não encontrado");
      return res.status(500).json({ message: "Erro interno do servidor" });
    }

    // Criar transação
    const transaction = new Transaction({
      user: userId,
      type: "withdrawal",
      amount,
      method: "card",
      details: {
        cardLast4: cardDetails.number.slice(-4)
      },
      status: "completed"
    });

    console.log("Transação criada:", transaction);

    await transaction.save();
    console.log("Transação salva com sucesso");

    // Atualizar saldo do utilizador
    const updatedUser = await User.findByIdAndUpdate(
      userId, 
      { $inc: { balance: -amount } },
      { new: true }
    );
    
    console.log("Saldo atualizado:", updatedUser.balance);

    res.status(201).json({
      message: "Levantamento efetuado com sucesso",
      transaction
    });
  } catch (error) {
    console.error("Error in withdrawFunds controller: ", error);
    
    // Erro mais detalhado para depuração
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      name: error.name
    };
    
    console.error("Detalhes do erro:", JSON.stringify(errorDetails, null, 2));
    
    res.status(500).json({ 
      message: "Erro no servidor",
      error: process.env.NODE_ENV === 'development' ? errorDetails : undefined
    });
  }
};

// Função para levantar fundos com outros métodos
const withdrawWithOtherMethod = async (req, res) => {
  console.log("withdrawWithOtherMethod iniciado", req.body);
  try {
    const { amount, method, details } = req.body;
    const userId = req.user?._id;
    
    console.log("UserID:", userId);
    console.log("Amount:", amount);
    console.log("Method:", method);

    // Verificar se o req.user existe
    if (!userId) {
      console.error("Erro: req.user não definido ou não tem _id");
      return res.status(401).json({ message: "Não autorizado" });
    }

    // Validar montante
    if (!amount || amount <= 0) {
      console.log("Montante inválido");
      return res.status(400).json({ message: "Montante inválido" });
    }
    
    // Verificar se o user existe antes de verificar o saldo
    const user = await User.findById(userId);
    if (!user) {
      console.error("Usuário não encontrado:", userId);
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    console.log("Usuário encontrado:", user.username || user.email);
    console.log("Saldo do usuário:", user.balance);

    // Verificar saldo
    if (user.balance < amount) {
      console.log("Saldo insuficiente");
      return res.status(400).json({ message: "Saldo insuficiente" });
    }

    // Validar método
    if (!["paypal", "bank_transfer", "crypto"].includes(method)) {
      console.log("Método de levantamento inválido:", method);
      return res.status(400).json({ message: "Método de levantamento inválido" });
    }

    // Verificar se o modelo Transaction existe
    if (!Transaction) {
      console.error("Erro: modelo Transaction não encontrado");
      return res.status(500).json({ message: "Erro interno do servidor" });
    }

    // Criar transação
    const transaction = new Transaction({
      user: userId,
      type: "withdrawal",
      amount,
      method,
      details,
      status: "pending" // Levantamentos não-cartão começam pendentes
    });

    console.log("Transação criada:", transaction);

    await transaction.save();
    console.log("Transação salva com sucesso");

    // Reservar o montante (reduzir do saldo disponível)
    const updatedUser = await User.findByIdAndUpdate(
      userId, 
      { $inc: { balance: -amount } },
      { new: true }
    );
    
    console.log("Saldo atualizado:", updatedUser.balance);

    res.status(201).json({
      message: "Pedido de levantamento submetido com sucesso",
      transaction
    });
  } catch (error) {
    console.error("Error in withdrawWithOtherMethod controller: ", error);
    
    // Erro mais detalhado para depuração
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      name: error.name
    };
    
    console.error("Detalhes do erro:", JSON.stringify(errorDetails, null, 2));
    
    res.status(500).json({ 
      message: "Erro no servidor",
      error: process.env.NODE_ENV === 'development' ? errorDetails : undefined
    });
  }
};

// Obter histórico de transações
const getTransactionHistory = async (req, res) => {
  console.log("getTransactionHistory iniciado");
  try {
    const userId = req.user?._id;
    
    console.log("UserID:", userId);

    // Verificar se o req.user existe
    if (!userId) {
      console.error("Erro: req.user não definido ou não tem _id");
      return res.status(401).json({ message: "Não autorizado" });
    }

    // Verificar se o modelo Transaction existe
    if (!Transaction) {
      console.error("Erro: modelo Transaction não encontrado");
      return res.status(500).json({ message: "Erro interno do servidor" });
    }

    const transactions = await Transaction.find({ user: userId })
      .sort({ createdAt: -1 });

    console.log(`Encontradas ${transactions.length} transações`);

    res.status(200).json(transactions);
  } catch (error) {
    console.error("Error in getTransactionHistory controller: ", error);
    
    // Erro mais detalhado para depuração
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      name: error.name
    };
    
    console.error("Detalhes do erro:", JSON.stringify(errorDetails, null, 2));
    
    res.status(500).json({ 
      message: "Erro no servidor",
      error: process.env.NODE_ENV === 'development' ? errorDetails : undefined
    });
  }
};

// Exportar com duas abordagens diferentes para compatibilidade
export { withdrawFunds, withdrawWithOtherMethod, getTransactionHistory };

// Também exportar como default para permitir a importação do módulo completo
export default {
  withdrawFunds,
  withdrawWithOtherMethod,
  getTransactionHistory
};