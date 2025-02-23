import express from 'express';
import chargeCustomer from '../controllers/charge.controller.js'; // Importando corretamente a função como exportação default

const router = express.Router();

// Rota para realizar o pagamento
router.post('/charge', chargeCustomer);

export default router;
