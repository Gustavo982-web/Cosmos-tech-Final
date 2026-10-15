const database = require("../database/config");
const jsonStore = require("../database/jsonStore");

async function listPublications(viewerId) {
  if (database.isJsonMode()) {
    return jsonStore.listPublications(viewerId);
  }

  const [rows] = await database.execute(
    `SELECT p.id_publicacao AS id, p.texto, p.criado_em AS criadoEm,
            u.id_usuario AS userId, u.nome AS authorName, u.username, u.avatar_url AS avatarUrl,
            COUNT(r.fk_usuario) AS totalReacoes,
            MAX(CASE WHEN r.fk_usuario = ? THEN 1 ELSE 0 END) AS reagido
     FROM publicacao p
     JOIN usuario u ON u.id_usuario = p.fk_usuario
     LEFT JOIN publicacao_reacao r ON r.fk_publicacao = p.id_publicacao
     GROUP BY p.id_publicacao, p.texto, p.criado_em, u.id_usuario, u.nome, u.username, u.avatar_url
     ORDER BY p.criado_em DESC
     LIMIT 100`,
    [Number(viewerId)]
  );

  if (!rows.length) return [];
  const placeholders = rows.map(() => "?").join(", ");
  const [commentRows] = await database.execute(
    `SELECT c.id_comentario AS id, c.fk_publicacao AS publicationId, c.texto, c.criado_em AS criadoEm,
            u.id_usuario AS userId, u.nome AS authorName, u.username
     FROM publicacao_comentario c
     JOIN usuario u ON u.id_usuario = c.fk_usuario
     WHERE c.fk_publicacao IN (${placeholders})
     ORDER BY c.criado_em ASC`,
    rows.map((row) => Number(row.id))
  );

  const commentsByPublication = new Map();
  for (const comment of commentRows) {
    const comments = commentsByPublication.get(Number(comment.publicationId)) || [];
    comments.push({
      id: Number(comment.id),
      texto: comment.texto,
      criadoEm: comment.criadoEm,
      author: { id: Number(comment.userId), nome: comment.authorName, username: comment.username },
    });
    commentsByPublication.set(Number(comment.publicationId), comments);
  }

  return rows.map((row) => ({
    id: Number(row.id),
    texto: row.texto,
    criadoEm: row.criadoEm,
    author: { id: Number(row.userId), nome: row.authorName, username: row.username, avatar_url: row.avatarUrl || "" },
    totalReacoes: Number(row.totalReacoes),
    reagido: Boolean(row.reagido),
    comentarios: commentsByPublication.get(Number(row.id)) || [],
  }));
}

async function createPublication({ userId, texto }) {
  if (database.isJsonMode()) {
    return jsonStore.createPublication({ userId, texto });
  }

  const [result] = await database.execute(
    "INSERT INTO publicacao (fk_usuario, texto) VALUES (?, ?)",
    [Number(userId), texto]
  );
  return { id: result.insertId };
}

async function setReaction({ userId, publicationId, active }) {
  if (database.isJsonMode()) {
    return jsonStore.setPublicationReaction({ userId, publicationId, active });
  }

  const [posts] = await database.execute(
    "SELECT id_publicacao FROM publicacao WHERE id_publicacao = ? LIMIT 1",
    [Number(publicationId)]
  );
  if (!posts.length) return null;

  if (active) {
    await database.execute(
      "INSERT IGNORE INTO publicacao_reacao (fk_publicacao, fk_usuario) VALUES (?, ?)",
      [Number(publicationId), Number(userId)]
    );
  } else {
    await database.execute(
      "DELETE FROM publicacao_reacao WHERE fk_publicacao = ? AND fk_usuario = ?",
      [Number(publicationId), Number(userId)]
    );
  }
  return { reacted: active };
}

async function createComment({ userId, publicationId, texto }) {
  if (database.isJsonMode()) {
    return jsonStore.createPublicationComment({ userId, publicationId, texto });
  }

  const [posts] = await database.execute(
    "SELECT id_publicacao FROM publicacao WHERE id_publicacao = ? LIMIT 1",
    [Number(publicationId)]
  );
  if (!posts.length) return null;

  const [result] = await database.execute(
    "INSERT INTO publicacao_comentario (fk_publicacao, fk_usuario, texto) VALUES (?, ?, ?)",
    [Number(publicationId), Number(userId), texto]
  );
  return { id: result.insertId };
}

module.exports = {
  listPublications,
  createPublication,
  setReaction,
  createComment,
};