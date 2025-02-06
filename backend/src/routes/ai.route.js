import express from 'express';
import { generateAIResponse } from '../controllers/ai.controller.js';

const router = express.Router();

router.post('/chat', generateAIResponse); // Remove "protectRoute" para testar mais rápido

export default router;
