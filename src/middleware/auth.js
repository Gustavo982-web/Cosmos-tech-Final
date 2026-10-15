const userRepository = require("../repositories/userRepository");

async function authenticateToken(req, res, next) {
  const userId = Number(req.get("X-User-Id"));
  if (!Number.isInteger(userId) || userId < 1) {
    return res.status(401).json({ message: "Entre na sua conta para continuar." });
  }

  try {
    const user = await userRepository.findById(userId);
    if (!user) return res.status(401).json({ message: "Usuário não encontrado. Entre novamente." });
    req.user = { id: userId, email: user.email, username: user.username };
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  authenticateToken,
};
