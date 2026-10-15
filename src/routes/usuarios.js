const express = require("express");
const router = express.Router();
const usuarioController = require("../controllers/usuarioController");
const { authenticateToken } = require("../middleware/auth");

router.post("/cadastrar", usuarioController.cadastrar);
router.post("/autenticar", usuarioController.autenticar);

router.get("/me", authenticateToken, usuarioController.me);
router.put("/me", authenticateToken, usuarioController.atualizarPerfil);
router.put("/me/senha", authenticateToken, usuarioController.atualizarSenha);
router.delete("/me", authenticateToken, usuarioController.excluirConta);

module.exports = router;