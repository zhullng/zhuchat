import express from "express";
import { checkAuth, login, logout, signup, updateProfile, requestPasswordReset, resetPassword } from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/signup", signup); // Criar
router.post("/login", login);
router.post("/logout", logout);
router.post("/reset-password", resetPassword);
router.post("/request-password-reset", requestPasswordReset);

router.put("/update-profile", protectRoute, updateProfile); // Alterar

router.get("/check", protectRoute, checkAuth); // Ler

export default router;
