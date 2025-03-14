import express from "express";
import { 
  createTransfer,
  getTransferHistory, 
  transferByQRCode,
  generateUserQRCode
} from "../controllers/transfer.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Transferência por email
router.post("/", protectRoute, createTransfer);

// Transferência via QR Code
router.post("/qr", protectRoute, transferByQRCode);

// Gerar QR Code para o User (corrigido para usar /qrcode)
router.get("/qrcode", protectRoute, generateUserQRCode);

// Buscar o histórico de transferências
router.get("/", protectRoute, getTransferHistory);

export default router;