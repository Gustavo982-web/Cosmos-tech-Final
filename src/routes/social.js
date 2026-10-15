const express = require("express");
const socialController = require("../controllers/socialController");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();
router.use(authenticateToken);
router.get("/publicacoes", socialController.listar);
router.post("/publicacoes", socialController.publicar);
router.put("/publicacoes/:id/reacao", socialController.reagir);
router.delete("/publicacoes/:id/reacao", socialController.reagir);
router.post("/publicacoes/:id/comentarios", socialController.comentar);

module.exports = router;