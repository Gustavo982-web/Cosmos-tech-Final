const database = require("../database/config");
const jsonStore = require("../database/jsonStore");

async function saveResult({ userId, quizId, totalCerto, totalErrado }) {
  if (database.isJsonMode()) {
    return jsonStore.saveQuizResult({ userId, quizId, totalCerto, totalErrado });
  }

  const [result] = await database.execute(
    `INSERT INTO resposta (totalCerto, totalErrado, dataRegistro, fkUsuario, fkQuiz)
     VALUES (?, ?, NOW(), ?, ?)`,
    [Number(totalCerto), Number(totalErrado), Number(userId), Number(quizId)]
  );

  return { insertId: result.insertId, affectedRows: result.affectedRows };
}

async function getResultsByUser(userId) {
  if (database.isJsonMode()) {
    return jsonStore.getQuizResultsByUser(userId);
  }

  const [rows] = await database.execute(
    `SELECT q.nome AS quiz,
            r.totalCerto,
            r.totalErrado,
            r.dataRegistro,
            ROUND((r.totalCerto / (r.totalCerto + r.totalErrado + 0.0001)) * 100, 1) AS aproveitamento
     FROM resposta r
     JOIN quiz q ON q.idQuiz = r.fkQuiz
     WHERE r.fkUsuario = ?
     ORDER BY r.dataRegistro DESC`,
    [userId]
  );

  return rows;
}

module.exports = {
  saveResult,
  getResultsByUser,
};
