import express from 'express';
import { transferFunds } from '../controllers/transfer.controller.js';

const router = express.Router();

// Rota para realizar a transferência de fundos
router.post('/transfer', transferFunds);

export default router;
