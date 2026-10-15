const express = require("express");
const router = express.Router();
const gameController = require("../controllers/gameController");
const { authenticateToken } = require("../middleware/auth");

// Salvar pontuação exige login (sabemos de quem é o score)
router.post("/pontuacao", authenticateToken, gameController.salvarPontuacao);
// Ranking é público (qualquer um pode ver as melhores pontuações)
router.get("/ranking", gameController.ranking);

module.exports = router;
