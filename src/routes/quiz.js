const express = require("express");
const router = express.Router();
const quizController = require("../controllers/quizController");
const { authenticateToken } = require("../middleware/auth");

router.post("/salvar", authenticateToken, quizController.salvar);
router.get("/resultados", authenticateToken, quizController.buscarResultados);

module.exports = router;