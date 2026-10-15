const quizRepository = require("../repositories/quizRepository");

async function salvar(req, res, next) {
  try {
    const certas = Number(req.body.certas);
    const erradas = Number(req.body.erradas);
    const fkQuiz = Number(req.body.fkQuiz);
    const userId = Number(req.user.id);

    if (
      !Number.isInteger(certas) || certas < 0 ||
      !Number.isInteger(erradas) || erradas < 0 ||
      !Number.isInteger(fkQuiz) || fkQuiz < 1 ||
      certas + erradas < 1
    ) {
      return res.status(400).json({ message: "Dados do quiz inválidos." });
    }

    const resultado = await quizRepository.saveResult({
      userId,
      quizId: fkQuiz,
      totalCerto: certas,
      totalErrado: erradas,
    });

    return res.status(201).json({ message: "Resultado salvo com sucesso.", id: resultado.insertId });
  } catch (error) {
    return next(error);
  }
}

async function buscarResultados(req, res, next) {
  try {
    const resultados = await quizRepository.getResultsByUser(req.user.id);
    return res.status(200).json(resultados);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  salvar,
  buscarResultados,
};