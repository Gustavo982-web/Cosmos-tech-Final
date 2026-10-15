const database = require("../database/config");
const jsonStore = require("../database/jsonStore");
const bcrypt = require("bcryptjs");

async function findByEmail(email) {
  if (database.isJsonMode()) {
    return jsonStore.findUserByEmail(email);
  }

  const [rows] = await database.execute(
    "SELECT * FROM usuario WHERE email = ? LIMIT 1",
    [email]
  );
  return rows[0] || null;
}

async function findByUsername(username) {
  if (database.isJsonMode()) {
    return jsonStore.findUserByUsername(username);
  }

  const [rows] = await database.execute(
    "SELECT * FROM usuario WHERE username = ? LIMIT 1",
    [username]
  );
  return rows[0] || null;
}

async function findById(id) {
  if (database.isJsonMode()) {
    return jsonStore.findUserById(id);
  }

  const [rows] = await database.execute(
    "SELECT id_usuario, nome, email, username, senha_hash, bio, cargo, avatar_url, criado_em, atualizado_em FROM usuario WHERE id_usuario = ? LIMIT 1",
    [id]
  );
  return rows[0] || null;
}

async function createUser({ nome, email, username, senha }) {
  if (database.isJsonMode()) {
    return jsonStore.createUser({ nome, email, username, senha });
  }

  const senhaHash = await bcrypt.hash(senha, 10);
  const [result] = await database.execute(
    `INSERT INTO usuario (nome, email, username, senha_hash, bio, cargo, avatar_url, criado_em, atualizado_em)
     VALUES (?, ?, ?, ?, '', '', NULL, NOW(), NOW())`,
    [nome, email, username, senhaHash]
  );

  return {
    id_usuario: result.insertId,
    nome,
    email,
    username,
  };
}

async function updateProfile({ id, nome, username, bio, cargo, avatar_url }) {
  if (database.isJsonMode()) {
    return jsonStore.updateUserProfile({ id, nome, username, bio, cargo, avatar_url });
  }

  const [result] = await database.execute(
    `UPDATE usuario
     SET nome = ?, username = ?, bio = ?, cargo = ?, avatar_url = ?, atualizado_em = NOW()
     WHERE id_usuario = ?`,
    [nome, username, bio || "", cargo || "", avatar_url || null, id]
  );

  return {
    affectedRows: result.affectedRows,
    changedRows: result.changedRows,
  };
}

async function updatePassword({ id, senhaHash }) {
  if (database.isJsonMode()) {
    return jsonStore.updateUserPassword({ id, senhaHash });
  }

  const [result] = await database.execute(
    `UPDATE usuario SET senha_hash = ?, atualizado_em = NOW() WHERE id_usuario = ?`,
    [senhaHash, id]
  );

  return {
    affectedRows: result.affectedRows,
  };
}

async function deleteUser(id) {
  if (database.isJsonMode()) {
    return jsonStore.deleteUser(id);
  }

  const [result] = await database.execute(`DELETE FROM usuario WHERE id_usuario = ?`, [id]);
  return {
    affectedRows: result.affectedRows,
  };
}

async function getUserProfileWithHistory(id) {
  if (database.isJsonMode()) {
    return jsonStore.getUserProfileWithHistory(id);
  }

  const [profileRows] = await database.execute(
    `SELECT id_usuario, nome, email, username, bio, cargo, avatar_url, criado_em, atualizado_em
     FROM usuario WHERE id_usuario = ? LIMIT 1`,
    [id]
  );

  const [historyRows] = await database.execute(
    `SELECT q.nome AS quiz, r.totalCerto, r.totalErrado, r.dataRegistro,
            ROUND((r.totalCerto / (r.totalCerto + r.totalErrado + 0.0001)) * 100, 1) AS aproveitamento
     FROM resposta r
     JOIN quiz q ON q.idQuiz = r.fkQuiz
     WHERE r.fkUsuario = ?
     ORDER BY r.dataRegistro DESC`,
    [id]
  );

  return {
    ...profileRows[0],
    historico: historyRows,
  };
}

module.exports = {
  findByEmail,
  findByUsername,
  findById,
  createUser,
  updateProfile,
  updatePassword,
  deleteUser,
  getUserProfileWithHistory,
};
