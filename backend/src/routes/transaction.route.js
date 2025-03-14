import express from "express";
import { depositFunds, depositWithOtherMethod } from "../controllers/deposit.controller.js";
import { withdrawFunds, withdrawWithOtherMethod, getTransactionHistory } from "../controllers/withdrawal.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Rotas de depósito
router.post("/deposits/card", protectRoute, depositFunds);
router.post("/deposits/other", protectRoute, depositWithOtherMethod);

// Rotas de levantamento
router.post("/withdrawals/card", protectRoute, withdrawFunds);
router.post("/withdrawals/other", protectRoute, withdrawWithOtherMethod);

// Histórico de transações
router.get("/history", protectRoute, getTransactionHistory);

export default router;