import express from "express";
import { checkAuth, login, logout, signup, updateProfile, updatePassword } from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { 
    forgotPassword, 
    verifyResetToken, 
    resetPassword 
} from "../controllers/password.controller.js";
import {
    requestAccountDeletion,
    verifyDeleteToken,
    confirmAccountDeletion
} from "../controllers/delete.controller.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);

router.put("/update-profile", protectRoute, updateProfile);
router.put("/update-password", protectRoute, updatePassword);

router.get("/check", protectRoute, checkAuth);

// Rotas para recuperação de senha
router.post("/forgot-password", forgotPassword);
router.get("/reset-password/:token", verifyResetToken);
router.post("/reset-password/:token", resetPassword);

// Rotas para eliminação de conta
router.post("/delete-account", protectRoute, requestAccountDeletion);
router.get("/delete-account/:token", verifyDeleteToken);
router.post("/delete-account/:token", confirmAccountDeletion);

export default router;