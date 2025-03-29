import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  createGroup,
  getGroups,
  getGroupById,
  updateGroup,
  addMember,
  removeMember,
  leaveGroup,
  deleteGroup
} from "../controllers/group.controller.js";

const router = express.Router();

// Todas as rotas são protegidas por autenticação
router.use(protectRoute);

// Obter todos os grupos do usuário e criar novo grupo
router.route("/")
  .get(getGroups)
  .post(createGroup);

// Obter, atualizar ou excluir um grupo específico
router.route("/:groupId")
  .get(getGroupById)
  .put(updateGroup)
  .delete(deleteGroup);

// Adicionar membro ao grupo
router.post("/:groupId/members", addMember);

// Remover membro do grupo
router.delete("/:groupId/members/:memberId", removeMember);

// Sair do grupo
router.post("/:groupId/leave", leaveGroup);

export default router;