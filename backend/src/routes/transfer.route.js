import express from "express";
import { makeTransfer, getTransferHistory, depositMoney, withdrawMoney, getBalance } from "../controllers/transfer.controller.js"; // Corrigido import para pegar todos os controllers
import { protectRoute } from "../middleware/auth.middleware.js"; // Certifique-se de que você tem esse middleware de proteção de rota

const router = express.Router();

// 🔹 Rota para fazer uma transferência
router.post("/transfer", protectRoute, makeTransfer);

// 🔹 Rota para buscar o histórico de transferências de um usuário
router.get("/history/:userId", protectRoute, getTransferHistory);

// 🔹 Rota para depósito de dinheiro
router.post("/deposit", protectRoute, depositMoney);

// 🔹 Rota para saque de dinheiro
router.post("/withdraw", protectRoute, withdrawMoney);

// 🔹 Rota para mostrar o saldo de um usuário
router.get("/balance/:userId", protectRoute, getBalance);  // Rota de exibição do saldo

export default router;
