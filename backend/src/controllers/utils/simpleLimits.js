import Transaction from "../../models/transaction.model.js";

// Limites diários simples
const DAILY_LIMITS = {
  deposit: 10000,   
  withdrawal: 10000 
};

// Função para verificar se o usuário já atingiu o limite diário
export const checkDailyLimit = async (userId, transactionType) => {
  try {
    // Obter a data de início do dia atual (00:00:00)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Obter a data de fim do dia atual (23:59:59)
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Buscar todas as transações do mesmo tipo feitas pelo usuário hoje
    const transactions = await Transaction.find({
      user: userId,
      type: transactionType,
      status: { $in: ["completed", "pending"] },
      createdAt: {
        $gte: today,
        $lt: tomorrow
      }
    });
    
    // Calcular o total já movimentado hoje
    const totalToday = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
    
    // Retornar informações sobre o limite
    return {
      limit: DAILY_LIMITS[transactionType],
      used: totalToday,
      remaining: Math.max(0, DAILY_LIMITS[transactionType] - totalToday),
      exceeded: totalToday + 0.01 >= DAILY_LIMITS[transactionType]
    };
  } catch (error) {
    console.error(`Erro ao verificar limite diário para ${transactionType}:`, error);
    // Em caso de erro, retornar valores que permitam a transação
    return {
      limit: DAILY_LIMITS[transactionType],
      used: 0,
      remaining: DAILY_LIMITS[transactionType],
      exceeded: false
    };
  }
};