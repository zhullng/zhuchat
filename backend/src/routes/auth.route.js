import express from "express";
import { checkAuth, login, logout, signup, updateProfile, updatePassword } from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { 
    forgotPassword, 
    verifyResetToken, 
    resetPassword 
} from "../controllers/password.controller.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);

router.put("/update-profile", protectRoute, updateProfile);
router.put("/update-password", protectRoute, updatePassword);

router.get("/check", protectRoute, checkAuth);

router.post("/forgot-password", forgotPassword);
router.get("/reset-password/:token", verifyResetToken);
router.post("/reset-password/:token", resetPassword);

export default router;