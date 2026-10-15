const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const dbPath = process.env.DB_JSON_PATH || path.join(__dirname, "../../db.json");
const writeQueue = Promise.resolve();

function ativo() {
  return String(process.env.DB_MODE || "").toLowerCase() === "json" || (!process.env.DB_HOST && !process.env.DB_MODE);
}

async function ensureStore() {
  const dir = path.dirname(dbPath);
  await fs.promises.mkdir(dir, { recursive: true });

  try {
    await fs.promises.access(dbPath, fs.constants.R_OK | fs.constants.W_OK);
  } catch (error) {
    const defaultData = {
      usuario: [],
      quiz: [
        { idQuiz: 1, nome: "Sistema Solar" },
        { idQuiz: 2, nome: "Viagens Espaciais" },
      ],
      resposta: [],
      game_score: [],
    };
    await fs.promises.writeFile(dbPath, `${JSON.stringify(defaultData, null, 2)}\n`, "utf8");
  }
}

async function readDatabase() {
  await ensureStore();
  const content = await fs.promises.readFile(dbPath, "utf8");
  return JSON.parse(content);
}

function queueWrite(updater) {
  const operation = writeQueue.then(async function () {
    const data = await readDatabase();
    const result = updater(data);
    await fs.promises.writeFile(dbPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    return result;
  });

  return operation;
}

async function findUserByEmail(email) {
  const data = await readDatabase();
  const normalizedEmail = String(email || "").trim().toLowerCase();
  return data.usuario.find((item) => String(item.email || "").trim().toLowerCase() === normalizedEmail) || null;
}

async function findUserByUsername(username) {
  const data = await readDatabase();
  const normalizedUsername = String(username || "").trim().toLowerCase();
  return data.usuario.find((item) => String(item.username || "").trim().toLowerCase() === normalizedUsername) || null;
}

async function findUserById(id) {
  const data = await readDatabase();
  return data.usuario.find((item) => Number(item.id_usuario) === Number(id)) || null;
}

async function createUser({ nome, email, username, senha }) {
  const data = await readDatabase();
  const existingEmail = data.usuario.some((item) => item.email.toLowerCase() === email.toLowerCase());
  const existingUsername = data.usuario.some((item) => item.username.toLowerCase() === username.toLowerCase());

  if (existingEmail || existingUsername) {
    throw new Error("E-mail ou username já cadastrado.");
  }

  const newId = data.usuario.reduce((max, item) => Math.max(max, Number(item.id_usuario || 0)), 0) + 1;
  const senhaHash = await bcrypt.hash(senha, 10);
  const user = {
    id_usuario: newId,
    nome,
    email,
    username,
    senha_hash: senhaHash,
    bio: "",
    cargo: "",
    avatar_url: "",
    criado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  };

  data.usuario.push(user);
  await fs.promises.writeFile(dbPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  return { id_usuario: newId, nome, email, username };
}

async function updateUserProfile({ id, nome, username, bio, cargo, avatar_url }) {
  const data = await readDatabase();
  const existing = data.usuario.find((item) => Number(item.id_usuario) === Number(id));
  if (!existing) {
    throw new Error("Usuário não encontrado.");
  }

  existing.nome = nome;
  existing.username = username;
  existing.bio = bio || "";
  existing.cargo = cargo || "";
  existing.avatar_url = avatar_url || "";
  existing.atualizado_em = new Date().toISOString();

  await fs.promises.writeFile(dbPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  return { affectedRows: 1 };
}

async function updateUserPassword({ id, senhaHash }) {
  const data = await readDatabase();
  const existing = data.usuario.find((item) => Number(item.id_usuario) === Number(id));
  if (!existing) {
    throw new Error("Usuário não encontrado.");
  }
  existing.senha_hash = senhaHash;
  delete existing.senha;
  existing.atualizado_em = new Date().toISOString();
  await fs.promises.writeFile(dbPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  return { affectedRows: 1 };
}

async function deleteUser(id) {
  const data = await readDatabase();
  data.usuario = data.usuario.filter((item) => Number(item.id_usuario) !== Number(id));
  data.resposta = data.resposta.filter((item) => Number(item.fkUsuario) !== Number(id));
  data.publicacao = data.publicacao || [];
  data.reacao = data.reacao || [];
  data.comentario = data.comentario || [];
  const deletedPosts = new Set(data.publicacao.filter((item) => Number(item.fkUsuario) === Number(id)).map((item) => Number(item.idPublicacao)));
  data.publicacao = data.publicacao.filter((item) => Number(item.fkUsuario) !== Number(id));
  data.reacao = data.reacao.filter((item) => Number(item.fkUsuario) !== Number(id) && !deletedPosts.has(Number(item.fkPublicacao)));
  data.comentario = data.comentario.filter((item) => Number(item.fkUsuario) !== Number(id) && !deletedPosts.has(Number(item.fkPublicacao)));
  await fs.promises.writeFile(dbPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  return { affectedRows: 1 };
}

async function getUserProfileWithHistory(id) {
  const data = await readDatabase();
  const user = data.usuario.find((item) => Number(item.id_usuario) === Number(id));
  if (!user) {
    throw new Error("Usuário não encontrado.");
  }

  const historico = data.resposta
    .filter((item) => Number(item.fkUsuario) === Number(id))
    .map((resposta) => {
      const quiz = data.quiz.find((entry) => Number(entry.idQuiz) === Number(resposta.fkQuiz));
      return {
        quiz: quiz ? quiz.nome : "Quiz",
        totalCerto: Number(resposta.totalCerto),
        totalErrado: Number(resposta.totalErrado),
        dataRegistro: resposta.dataRegistro,
        aproveitamento: Number(((Number(resposta.totalCerto) / Math.max(Number(resposta.totalCerto) + Number(resposta.totalErrado), 1)) * 100).toFixed(1)),
      };
    });

  return {
    id_usuario: Number(user.id_usuario),
    nome: user.nome,
    email: user.email,
    username: user.username,
    bio: user.bio || "",
    cargo: user.cargo || "",
    avatar_url: user.avatar_url || "",
    criado_em: user.criado_em,
    atualizado_em: user.atualizado_em,
    historico,
  };
}

async function saveQuizResult({ userId, quizId, totalCerto, totalErrado }) {
  const data = await readDatabase();
  const userExists = data.usuario.some((item) => Number(item.id_usuario) === Number(userId));
  const quizExists = data.quiz.some((item) => Number(item.idQuiz) === Number(quizId));
  if (!userExists || !quizExists) {
    throw new Error("Usuário ou quiz não encontrado.");
  }

  const nextId = data.resposta.reduce((max, item) => Math.max(max, Number(item.idResposta || 0)), 0) + 1;
  data.resposta.push({
    idResposta: nextId,
    totalCerto: Number(totalCerto),
    totalErrado: Number(totalErrado),
    dataRegistro: new Date().toISOString(),
    fkUsuario: Number(userId),
    fkQuiz: Number(quizId),
  });

  await fs.promises.writeFile(dbPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  return { insertId: nextId, affectedRows: 1 };
}

async function getQuizResultsByUser(userId) {
  const data = await readDatabase();
  return data.resposta
    .filter((item) => Number(item.fkUsuario) === Number(userId))
    .map((resposta) => {
      const quiz = data.quiz.find((entry) => Number(entry.idQuiz) === Number(resposta.fkQuiz));
      return {
        quiz: quiz ? quiz.nome : "Quiz",
        totalCerto: Number(resposta.totalCerto),
        totalErrado: Number(resposta.totalErrado),
        dataRegistro: resposta.dataRegistro,
        aproveitamento: Number(((Number(resposta.totalCerto) / Math.max(Number(resposta.totalCerto) + Number(resposta.totalErrado), 1)) * 100).toFixed(1)),
      };
    });
}

async function listPublications(viewerId) {
  const data = await readDatabase();
  const publications = data.publicacao || [];
  const reactions = data.reacao || [];
  const comments = data.comentario || [];

  return publications
    .map((publication) => {
      const author = data.usuario.find((user) => Number(user.id_usuario) === Number(publication.fkUsuario));
      if (!author) return null;
      const postComments = comments
        .filter((comment) => Number(comment.fkPublicacao) === Number(publication.idPublicacao))
        .sort((left, right) => new Date(left.criadoEm) - new Date(right.criadoEm))
        .map((comment) => {
          const commentAuthor = data.usuario.find((user) => Number(user.id_usuario) === Number(comment.fkUsuario));
          return {
            id: Number(comment.idComentario),
            texto: comment.texto,
            criadoEm: comment.criadoEm,
            author: commentAuthor ? { id: Number(commentAuthor.id_usuario), nome: commentAuthor.nome, username: commentAuthor.username } : null,
          };
        });
      const postReactions = reactions.filter((reaction) => Number(reaction.fkPublicacao) === Number(publication.idPublicacao));

      return {
        id: Number(publication.idPublicacao),
        texto: publication.texto,
        criadoEm: publication.criadoEm,
        author: { id: Number(author.id_usuario), nome: author.nome, username: author.username, avatar_url: author.avatar_url || "" },
        totalReacoes: postReactions.length,
        reagido: postReactions.some((reaction) => Number(reaction.fkUsuario) === Number(viewerId)),
        comentarios: postComments,
      };
    })
    .filter(Boolean)
    .sort((left, right) => new Date(right.criadoEm) - new Date(left.criadoEm));
}

async function createPublication({ userId, texto }) {
  const data = await readDatabase();
  if (!data.usuario.some((user) => Number(user.id_usuario) === Number(userId))) {
    throw new Error("Usuário não encontrado.");
  }
  data.publicacao = data.publicacao || [];
  const idPublicacao = data.publicacao.reduce((max, item) => Math.max(max, Number(item.idPublicacao || 0)), 0) + 1;
  const publication = { idPublicacao, fkUsuario: Number(userId), texto, criadoEm: new Date().toISOString() };
  data.publicacao.push(publication);
  await fs.promises.writeFile(dbPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  return publication;
}

async function setPublicationReaction({ userId, publicationId, active }) {
  const data = await readDatabase();
  const publicationExists = (data.publicacao || []).some((item) => Number(item.idPublicacao) === Number(publicationId));
  const userExists = data.usuario.some((user) => Number(user.id_usuario) === Number(userId));
  if (!publicationExists || !userExists) throw new Error("Publicação ou usuário não encontrado.");
  data.reacao = data.reacao || [];
  const existingIndex = data.reacao.findIndex((item) => Number(item.fkPublicacao) === Number(publicationId) && Number(item.fkUsuario) === Number(userId));
  if (active && existingIndex === -1) {
    data.reacao.push({ fkPublicacao: Number(publicationId), fkUsuario: Number(userId), criadoEm: new Date().toISOString() });
  } else if (!active && existingIndex !== -1) {
    data.reacao.splice(existingIndex, 1);
  }
  await fs.promises.writeFile(dbPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  return { reacted: active };
}

async function createPublicationComment({ userId, publicationId, texto }) {
  const data = await readDatabase();
  const publicationExists = (data.publicacao || []).some((item) => Number(item.idPublicacao) === Number(publicationId));
  const userExists = data.usuario.some((user) => Number(user.id_usuario) === Number(userId));
  if (!publicationExists || !userExists) throw new Error("Publicação ou usuário não encontrado.");
  data.comentario = data.comentario || [];
  const idComentario = data.comentario.reduce((max, item) => Math.max(max, Number(item.idComentario || 0)), 0) + 1;
  const comment = { idComentario, fkPublicacao: Number(publicationId), fkUsuario: Number(userId), texto, criadoEm: new Date().toISOString() };
  data.comentario.push(comment);
  await fs.promises.writeFile(dbPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  return comment;
}

async function saveGameScore({ userId, pontos, ondas, abatidos }) {
  const data = await readDatabase();
  const userExists = data.usuario.some((item) => Number(item.id_usuario) === Number(userId));
  if (!userExists) {
    throw new Error("Usuário não encontrado.");
  }
  data.game_score = data.game_score || [];
  const nextId = data.game_score.reduce((max, item) => Math.max(max, Number(item.id_score || 0)), 0) + 1;
  data.game_score.push({
    id_score: nextId,
    fk_usuario: Number(userId),
    pontos: Number(pontos),
    ondas: Number(ondas),
    abatidos: Number(abatidos),
    criado_em: new Date().toISOString(),
  });
  await fs.promises.writeFile(dbPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  return { insertId: nextId, affectedRows: 1 };
}

async function getTopScores(limit) {
  const data = await readDatabase();
  const scores = data.game_score || [];
  // Melhor pontuação de cada usuário
  const bestByUser = new Map();
  for (const s of scores) {
    const uid = Number(s.fk_usuario);
    if (!bestByUser.has(uid) || Number(s.pontos) > Number(bestByUser.get(uid).pontos)) {
      bestByUser.set(uid, s);
    }
  }
  return Array.from(bestByUser.values())
    .map((s) => {
      const user = data.usuario.find((u) => Number(u.id_usuario) === Number(s.fk_usuario));
      return {
        username: user ? user.username : "jogador",
        nome: user ? user.nome : "Jogador",
        pontos: Number(s.pontos),
        ondas: Number(s.ondas),
        abatidos: Number(s.abatidos),
        criado_em: s.criado_em,
      };
    })
    .sort((a, b) => b.pontos - a.pontos)
    .slice(0, Number(limit) || 10);
}

module.exports = {
  ativo,
  ensureStore,
  findUserByEmail,
  findUserByUsername,
  findUserById,
  createUser,
  updateUserProfile,
  updateUserPassword,
  deleteUser,
  getUserProfileWithHistory,
  saveQuizResult,
  getQuizResultsByUser,
  listPublications,
  createPublication,
  setPublicationReaction,
  createPublicationComment,
  saveGameScore,
  getTopScores,
};