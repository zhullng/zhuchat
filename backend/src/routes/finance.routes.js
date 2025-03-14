import express from "express";
import { createTransfer, getTransferHistory, transferByQRCode, generateUserQRCode } from "../controllers/transfer.controller.js";
import { depositFunds, depositWithOtherMethod } from "../controllers/deposit.controller.js";
import { withdrawFunds, withdrawWithOtherMethod, getTransactionHistory } from "../controllers/withdrawal.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";  // Corrigido: protectRouteRoute -> protectRoute

const router = express.Router();

// Rotas de transferência
router.post("/transfers", protectRoute, createTransfer);
router.get("/transfers", protectRoute, getTransferHistory);
router.post("/transfers/qr", protectRoute, transferByQRCode);
router.get("/transfers/qr-code", protectRoute, generateUserQRCode);

// Rotas de depósito
router.post("/deposits/card", protectRoute, depositFunds);
router.post("/deposits/other", protectRoute, depositWithOtherMethod);

// Rotas de levantamento
router.post("/withdrawals/card", protectRoute, withdrawFunds);
router.post("/withdrawals/other", protectRoute, withdrawWithOtherMethod);

// Histórico de transações
router.get("/transactions", protectRoute, getTransactionHistory);

export default router;