const bcrypt = require("bcryptjs");
const userRepository = require("../repositories/userRepository");

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function autenticar(req, res, next) {
  try {
    const login = String(req.body.email || req.body.emailServer || req.body.username || "").trim();
    const senha = String(req.body.senha || req.body.senhaServer || "");

    if (!login || !senha) {
      return res.status(400).json({ message: "E-mail/usuário e senha são obrigatórios." });
    }

    const isEmail = login.includes("@");
    if (isEmail && !validateEmail(login)) {
      return res.status(400).json({ message: "E-mail inválido." });
    }

    const user = isEmail
      ? await userRepository.findByEmail(login)
      : await userRepository.findByUsername(login);
    if (!user) {
      return res.status(401).json({ message: "Credenciais inválidas." });
    }

    const senhaHash = user.senha_hash || user.senha || "";
    const ok = await bcrypt.compare(senha, senhaHash);
    const legacyPlainOk = !user.senha_hash && !!user.senha && senha === user.senha;
    if (!ok && !legacyPlainOk) {
      return res.status(401).json({ message: "Credenciais inválidas." });
    }

    if (legacyPlainOk) {
      const novoHash = await bcrypt.hash(senha, 10);
      await userRepository.updatePassword({ id: user.id_usuario, senhaHash: novoHash });
      user.senha_hash = novoHash;
      delete user.senha;
    }

    return res.status(200).json({
      user: {
        id: user.id_usuario,
        nome: user.nome,
        email: user.email,
        username: user.username,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function cadastrar(req, res, next) {
  try {
    const nome = String(req.body.nome || req.body.nomeServer || "").trim();
    const email = String(req.body.email || req.body.emailServer || "").trim();
    const username = String(req.body.username || "").trim();
    const senha = String(req.body.senha || req.body.senhaServer || "");

    if (!nome || nome.length < 2 || nome.length > 80) {
      return res.status(400).json({ message: "Nome deve conter entre 2 e 80 caracteres." });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ message: "E-mail inválido." });
    }

    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      return res.status(400).json({ message: "Username deve ter 3 a 30 caracteres, letras, números e _." });
    }

    if (senha.length < 8) {
      return res.status(400).json({ message: "Senha deve ter no mínimo 8 caracteres." });
    }

    const existingEmail = await userRepository.findByEmail(email);
    const existingUsername = await userRepository.findByUsername(username);
    if (existingEmail || existingUsername) {
      return res.status(409).json({ message: "E-mail ou username já cadastrado." });
    }

    const user = await userRepository.createUser({ nome, email, username, senha });
    return res.status(201).json({ message: "Usuário cadastrado com sucesso.", user });
  } catch (error) {
    return next(error);
  }
}

async function me(req, res, next) {
  try {
    const user = await userRepository.getUserProfileWithHistory(req.user.id);
    return res.status(200).json(user);
  } catch (error) {
    return next(error);
  }
}

async function atualizarPerfil(req, res, next) {
  try {
    const nome = String(req.body.nome || "").trim();
    const username = String(req.body.username || "").trim();
    const bio = String(req.body.bio || "").trim();
    const cargo = String(req.body.cargo || "").trim();
    const avatar_url = String(req.body.avatar_url || "").trim();

    if (nome.length < 2 || nome.length > 80) {
      return res.status(400).json({ message: "Nome deve conter entre 2 e 80 caracteres." });
    }

    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      return res.status(400).json({ message: "Username inválido." });
    }

    if (bio.length > 280) {
      return res.status(400).json({ message: "Bio deve ter até 280 caracteres." });
    }

    if (cargo.length > 120) {
      return res.status(400).json({ message: "Cargo/interesse é muito longo." });
    }

    if (avatar_url && !/^https?:\/\//i.test(avatar_url)) {
      return res.status(400).json({ message: "URL do avatar deve começar com http ou https." });
    }

    const existing = await userRepository.findByUsername(username);
    if (existing && Number(existing.id_usuario) !== Number(req.user.id)) {
      return res.status(409).json({ message: "Este username já está em uso." });
    }

    await userRepository.updateProfile({
      id: req.user.id,
      nome,
      username,
      bio,
      cargo,
      avatar_url,
    });

    return res.status(200).json({ message: "Perfil atualizado com sucesso." });
  } catch (error) {
    return next(error);
  }
}

async function atualizarSenha(req, res, next) {
  try {
    const senhaAtual = String(req.body.senhaAtual || "");
    const novaSenha = String(req.body.novaSenha || "");

    if (!senhaAtual || !novaSenha || novaSenha.length < 8) {
      return res.status(400).json({ message: "Senha atual e nova senha são obrigatórias e a nova deve ter pelo menos 8 caracteres." });
    }

    const user = await userRepository.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    const valid = await bcrypt.compare(senhaAtual, user.senha_hash || user.senha || "");
    const legacyPlainValid = !user.senha_hash && !!user.senha && senhaAtual === user.senha;
    if (!valid && !legacyPlainValid) {
      return res.status(401).json({ message: "Senha atual incorreta." });
    }

    const senhaHash = await bcrypt.hash(novaSenha, 10);
    await userRepository.updatePassword({ id: req.user.id, senhaHash });
    return res.status(200).json({ message: "Senha atualizada com sucesso." });
  } catch (error) {
    return next(error);
  }
}

async function excluirConta(req, res, next) {
  try {
    const senha = String(req.body.senha || "");
    if (!senha) {
      return res.status(400).json({ message: "Senha é obrigatória para excluir a conta." });
    }

    const user = await userRepository.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    const ok = await bcrypt.compare(senha, user.senha_hash || user.senha || "");
    const legacyPlainOk = !user.senha_hash && !!user.senha && senha === user.senha;
    if (!ok && !legacyPlainOk) {
      return res.status(401).json({ message: "Senha incorreta." });
    }

    await userRepository.deleteUser(req.user.id);
    return res.status(200).json({ message: "Conta excluída com sucesso." });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  autenticar,
  cadastrar,
  me,
  atualizarPerfil,
  atualizarSenha,
  excluirConta,
};
