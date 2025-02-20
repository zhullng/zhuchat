import express from 'express';
import { generateAIResponse } from '../controllers/ai.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/chat', protectRoute, generateAIResponse);

export default router;