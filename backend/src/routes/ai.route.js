import express from 'express';
import { generateAIResponse } from '../controllers/ai.controller.js';

const router = express.Router();

router.post('/chat', generateAIResponse); // A rota correta para a interação com a IA

export default router;
