import express from 'express';
import { generateAIResponse } from '../controllers/ai.controller.js';

const router = express.Router();

router.post('/chat', generateAIResponse);

export default router;