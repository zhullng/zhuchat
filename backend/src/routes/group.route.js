// routes/group.route.js
import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  createGroup,
  getUserGroups,
  getGroupById,
  sendGroupMessage,
  getGroupMessages,
  markGroupMessagesAsRead,
  addGroupMembers,
  removeGroupMember,
  leaveGroup,
  deleteGroup,
  deleteEmptyGroup
} from "../controllers/group.controller.js";

const router = express.Router();

// Rotas para grupos
router.post("/create", protectRoute, createGroup);
router.get("/", protectRoute, getUserGroups);
router.get("/:id", protectRoute, getGroupById);
router.post("/:id/message", protectRoute, sendGroupMessage);
router.get("/:id/messages", protectRoute, getGroupMessages);
router.patch("/:id/read", protectRoute, markGroupMessagesAsRead);
router.post("/:id/members", protectRoute, addGroupMembers);
router.delete("/:id/members/:memberId", protectRoute, removeGroupMember);
router.delete("/:id/leave", protectRoute, leaveGroup);
router.delete("/:id", protectRoute, deleteGroup);
router.delete("/:id/empty-delete", protectRoute, deleteEmptyGroup);

export default router;