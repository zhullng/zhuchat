// routes/ai.route.js
import express from 'express';
import { generateAIResponse } from '../controllers/ai.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js'; // Supondo que você tem middleware de autenticação

const router = express.Router();

router.post('/chat', protectRoute, generateAIResponse);

export default router;