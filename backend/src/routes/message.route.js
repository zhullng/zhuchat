import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { 
    getMessages, 
    getUsersForSidebar, 
    sendMessage,
    getConversations,
    markConversationAsRead,
    deleteMessage,
    editMessage
  } from "../controllers/message.controller.js";

const router = express.Router();

// Rotas específicas primeiro
router.get("/users", protectRoute, getUsersForSidebar);
router.get("/conversations", protectRoute, getConversations);
router.patch("/read/:id", protectRoute, markConversationAsRead);

// Rota para excluir mensagem
router.delete("/:id", protectRoute, deleteMessage);

// Rota para editar mensagem
router.patch("/:id/edit", protectRoute, editMessage);

// Rotas com parâmetros dinâmicos depois
router.get("/:id", protectRoute, getMessages);
router.post("/send/:id", protectRoute, sendMessage);

export default router;