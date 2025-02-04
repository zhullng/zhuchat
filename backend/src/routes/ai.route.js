// routes/ai.route.js
import express from 'express';
import { generateAIResponse } from '../controllers/ai.controller.js';
import { protect } from '../middleware/auth.middleware.js'; // Supondo que você tem middleware de autenticação

const router = express.Router();

router.post('/chat', protect, generateAIResponse);

export default router;