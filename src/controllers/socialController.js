const socialRepository = require("../repositories/socialRepository");

async function listar(req, res, next) {
  try {
    const publications = await socialRepository.listPublications(req.user.id);
    return res.status(200).json(publications);
  } catch (error) {
    return next(error);
  }
}

async function publicar(req, res, next) {
  try {
    const texto = String(req.body.texto || "").trim();
    if (!texto || texto.length > 1200) {
      return res.status(400).json({ message: "A publicação deve ter entre 1 e 1200 caracteres." });
    }

    const publication = await socialRepository.createPublication({ userId: req.user.id, texto });
    return res.status(201).json({ message: "Publicação criada.", publication });
  } catch (error) {
    return next(error);
  }
}

async function reagir(req, res, next) {
  try {
    const publicationId = Number(req.params.id);
    if (!Number.isInteger(publicationId) || publicationId < 1) {
      return res.status(400).json({ message: "Publicação inválida." });
    }

    const result = await socialRepository.setReaction({
      userId: req.user.id,
      publicationId,
      active: req.method === "PUT",
    });
    if (!result) return res.status(404).json({ message: "Publicação não encontrada." });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

async function comentar(req, res, next) {
  try {
    const publicationId = Number(req.params.id);
    const texto = String(req.body.texto || "").trim();
    if (!Number.isInteger(publicationId) || publicationId < 1 || !texto || texto.length > 600) {
      return res.status(400).json({ message: "O comentário deve ter entre 1 e 600 caracteres." });
    }

    const comment = await socialRepository.createComment({ userId: req.user.id, publicationId, texto });
    if (!comment) return res.status(404).json({ message: "Publicação não encontrada." });
    return res.status(201).json({ message: "Comentário publicado.", comment });
  } catch (error) {
    return next(error);
  }
}

module.exports = { listar, publicar, reagir, comentar };