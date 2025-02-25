import express from "express";
import { makeTransfer, getTransferHistory, depositMoney, withdrawMoney, getBalance } from "../controllers/transfer.controller.js"; // Certifique-se de que está importando os controllers corretamente
import { protectRoute } from "../middleware/auth.middleware.js"; // Middleware de autenticação

const router = express.Router();

// 🔹 Rota para fazer uma transferência
// Alteração: O middleware de balance não deve ser aplicado aqui, pois o saldo já está sendo retornado pela função `makeTransfer`
router.post("/transfer", protectRoute, makeTransfer);

// 🔹 Rota para buscar o histórico de transferências de um usuário
// A rota para buscar o histórico está correta. Apenas retornando o histórico de transferências.
router.get("/history/:userId", protectRoute, getTransferHistory);

// 🔹 Rota para depósito de dinheiro
// A operação de depósito também deve retornar o saldo atualizado do usuário
router.post("/deposit", protectRoute, depositMoney);

// 🔹 Rota para saque de dinheiro
// A operação de saque também deve retornar o saldo atualizado do usuário
router.post("/withdraw", protectRoute, withdrawMoney);

export default router;
