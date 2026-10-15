require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const database = require("./src/database/config");
const schema = require("./src/database/schema");

const app = express();
const PORT = Number(process.env.PORT || process.env.APP_PORT || 3000);
const HOST = process.env.APP_HOST || "0.0.0.0";
const NODE_ENV = process.env.NODE_ENV || "development";

const allowedOrigin = process.env.CORS_ORIGIN || "*";

app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        connectSrc: ["'self'", "https://cdn.jsdelivr.net"],
        mediaSrc: ["'self'", "https://*"],
        // ALB expõe apenas HTTP (porta 80). Desativa o upgrade automático para
        // HTTPS, que faria o navegador buscar os assets (CSS/JS) em https e falhar.
        upgradeInsecureRequests: null
      }
    }
  })
);

app.use(
  cors({
    origin: allowedOrigin === "*" ? true : allowedOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false }));

const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { message: "Muitas requisições. Tente novamente mais tarde." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: "Muitas tentativas de login. Tente novamente em alguns minutos." },
});

app.use(express.static(path.join(__dirname, "Site", "app")));

const indexRouter = require("./src/routes/index");
const usuarioRouter = require("./src/routes/usuarios");
const quizRouter = require("./src/routes/quiz");
const socialRouter = require("./src/routes/social");
const gameRouter = require("./src/routes/game");

app.get("/health", async function (req, res) {
  const status = await database.getStatus();
  if (status.ok) {
    return res.status(200).json({ ok: true, database: status.database, uptime: process.uptime() });
  }
  return res.status(503).json({ ok: false, database: "offline" });
});

app.use("/usuarios", publicLimiter, usuarioRouter);
app.use("/usuarios/autenticar", authLimiter);
app.use("/usuarios/cadastrar", authLimiter);
app.use("/quiz", publicLimiter, quizRouter);
app.use("/social", publicLimiter, socialRouter);
app.use("/game", publicLimiter, gameRouter);
app.use("/", indexRouter);

app.use(function (req, res) {
  res.status(404).json({ message: "Rota não encontrada." });
});

app.use(function (err, req, res, next) {
  console.error("[ERROR]", err && err.message ? err.message : err);
  if (process.env.NODE_ENV !== "production") {
    console.error(err && err.stack ? err.stack : "");
  }

  const statusCode = err && err.statusCode ? err.statusCode : 500;
  const safeMessage = process.env.NODE_ENV === "production"
    ? "Erro interno do servidor."
    : (err && err.message ? err.message : "Erro interno do servidor.");
  res.status(statusCode).json({ message: safeMessage });
});

async function boot() {
  await database.initialize();
  await schema.ensureSchema();
  await schema.seedQuizCatalog();

  const server = app.listen(PORT, HOST, function () {
    console.log(`[Cosmos-TECH] Servidor rodando em http://${HOST}:${PORT}`);
    console.log(`[Cosmos-TECH] Ambiente: ${NODE_ENV}`);
  });

  const shutdown = async function () {
    console.log("[Cosmos-TECH] Encerrando servidor...");
    server.close(async function () {
      await database.close();
      process.exit(0);
    });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

boot().catch(function (error) {
  console.error("[BOOT] Falha na inicialização:", error.message);
  process.exit(1);
});

module.exports = app;
