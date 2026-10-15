const gameRepository = require("../repositories/gameRepository");

async function salvarPontuacao(req, res, next) {
  try {
    const pontos = Number(req.body.pontos);
    const ondas = Number(req.body.ondas);
    const abatidos = Number(req.body.abatidos);
    const userId = Number(req.user.id);

    if (
      !Number.isInteger(pontos) || pontos < 0 ||
      !Number.isInteger(ondas) || ondas < 1 ||
      !Number.isInteger(abatidos) || abatidos < 0
    ) {
      return res.status(400).json({ message: "Dados da pontuação inválidos." });
    }

    const resultado = await gameRepository.saveScore({ userId, pontos, ondas, abatidos });
    return res.status(201).json({ message: "Pontuação salva com sucesso.", id: resultado.insertId });
  } catch (error) {
    return next(error);
  }
}

async function ranking(req, res, next) {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const top = await gameRepository.getTopScores(limit);
    return res.status(200).json(top);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  salvarPontuacao,
  ranking,
};
