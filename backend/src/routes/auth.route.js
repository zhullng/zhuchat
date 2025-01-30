import express from "express";
import { checkAuth, login, logout, signup, updateProfile } from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/signup", signup); // Criar
router.post("/login", login);
router.post("/logout", logout);

router.put("/update-profile", protectRoute, updateProfile); // Alterar

router.get("/check", protectRoute, checkAuth); // Ler

export default router;
