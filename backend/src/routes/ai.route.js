import express from 'express';
import { generateAIResponse } from '../controllers/ai.controller.js';

const router = express.Router();

router.post('/chat', generateAIResponse); // Verifique se a rota está correta

export default router;
