import express from "express";
import { 
  addContact, 
  getContacts, 
  getPendingRequests, 
  respondToRequest, 
  removeContact, 
  updateContactNote 
} from "../controllers/contact.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Todas as rotas de contactos devem ser protegidas (autenticadas)
router.use(protectRoute);

// Adicionar um novo contacto por email
router.post("/add", addContact);

// Listar todos os contactos (apenas aceites)
router.get("/", getContacts);

// Obter pedidos de contacto pendentes
router.get("/pending", getPendingRequests);

// Aceitar ou rejeitar um pedido de contacto
router.patch("/:contactId/respond", respondToRequest);

// Remover um contacto
router.delete("/:contactId", removeContact);

// Atualizar a nota de um contacto (se você tiver esta funcionalidade)
router.patch("/:contactId/note", updateContactNote);

export default router;