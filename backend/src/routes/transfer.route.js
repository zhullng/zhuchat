import express from "express";
import { makeTransfer, getTransferHistory } from "../controllers/transfer.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", protectRoute, makeTransfer);
router.get("/history/:userId", protectRoute, getTransferHistory);

export default router;
