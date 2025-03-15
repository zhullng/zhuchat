import express from "express";
import { 
  checkAuth, 
  login, 
  logout, 
  signup, 
  updateProfile, 
  updatePassword 
} from "../controllers/auth.controller.js";
import { 
  forgotPassword, 
  verifyResetToken, 
  resetPassword 
} from "../controllers/password.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Rotas de autenticação básicas
router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);

// Rotas protegidas (requerem autenticação)
router.put("/update-profile", protectRoute, updateProfile);
router.put("/update-password", protectRoute, updatePassword);
router.get("/check", protectRoute, checkAuth);

// Rotas de recuperação de palavra-passe
router.post("/forgot-password", forgotPassword);
router.get("/reset-password/:token", verifyResetToken);
router.post("/reset-password/:token", resetPassword);

export default router;