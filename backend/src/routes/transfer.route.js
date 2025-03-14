import express from "express";
import { 
  createTransfer,          // Correto: era makeTransfer 
  getTransferHistory, 
  transferByQRCode,        // Adiciona esta função do controller
  generateUserQRCode       // Adiciona esta função do controller
} from "../controllers/transfer.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js"; // Middleware de autenticação

const router = express.Router();

// 🔹 Rota para fazer uma transferência por email
router.post("/transfer", protectRoute, createTransfer);

// 🔹 Rota para transferência via QR Code
router.post("/transfer/qr", protectRoute, transferByQRCode);

// 🔹 Rota para gerar QR Code para o usuário
router.get("/qrcode", protectRoute, generateUserQRCode);

// 🔹 Rota para buscar o histórico de transferências de um usuário
router.get("/history", protectRoute, getTransferHistory);

/* 
  NOTA: As funções depositMoney e withdrawMoney não existem no controller de transferência.
  Se você precisa delas, você deve:
  1. Criar um controller separado (ex: wallet.controller.js) com essas funções
  2. Importá-las desse controller
  3. Ou adicionar essas funcionalidades ao transfer.controller.js existente
*/

export default router;