const database = require("../database/config");
const jsonStore = require("../database/jsonStore");

async function saveScore({ userId, pontos, ondas, abatidos }) {
  if (database.isJsonMode()) {
    return jsonStore.saveGameScore({ userId, pontos, ondas, abatidos });
  }

  const [result] = await database.execute(
    `INSERT INTO game_score (fk_usuario, pontos, ondas, abatidos, criado_em)
     VALUES (?, ?, ?, ?, NOW())`,
    [Number(userId), Number(pontos), Number(ondas), Number(abatidos)]
  );

  return { insertId: result.insertId, affectedRows: result.affectedRows };
}

async function getTopScores(limit) {
  const max = Number(limit) || 10;

  if (database.isJsonMode()) {
    return jsonStore.getTopScores(max);
  }

  // Melhor pontuação de cada usuário, ordenado do maior para o menor
  const [rows] = await database.execute(
    `SELECT u.username,
            u.nome,
            MAX(g.pontos) AS pontos,
            SUBSTRING_INDEX(GROUP_CONCAT(g.ondas ORDER BY g.pontos DESC), ',', 1) AS ondas,
            SUBSTRING_INDEX(GROUP_CONCAT(g.abatidos ORDER BY g.pontos DESC), ',', 1) AS abatidos,
            MAX(g.criado_em) AS criado_em
     FROM game_score g
     JOIN usuario u ON u.id_usuario = g.fk_usuario
     GROUP BY g.fk_usuario, u.username, u.nome
     ORDER BY pontos DESC
     LIMIT ?`,
    [max]
  );

  return rows.map((r) => ({
    username: r.username,
    nome: r.nome,
    pontos: Number(r.pontos),
    ondas: Number(r.ondas),
    abatidos: Number(r.abatidos),
    criado_em: r.criado_em,
  }));
}

module.exports = {
  saveScore,
  getTopScores,
};
