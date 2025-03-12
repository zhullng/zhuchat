import express from "express";
import { makeTransfer, getTransferHistory, depositMoney, withdrawMoney } from "../controllers/transfer.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js"; // Middleware de autenticação

const router = express.Router();

router.post("/transfer", protectRoute, makeTransfer);
router.get("/history/:userId", protectRoute, getTransferHistory);
router.post("/deposit", protectRoute, depositMoney);
router.post("/withdraw", protectRoute, withdrawMoney);

export default router;
