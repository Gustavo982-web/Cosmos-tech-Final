const fs = require("fs");
const mysql = require("mysql2/promise");
const jsonStore = require("./jsonStore");

const requestedMode = (process.env.DB_MODE || "").toLowerCase();
const useJson = requestedMode === "json" || (!process.env.DB_HOST && requestedMode !== "mysql");

let pool = null;
let dbReady = false;

function isJsonMode() {
  return useJson;
}

function getPool() {
  return pool;
}

function buildConfig() {
  const dbPort = Number(process.env.DB_PORT || 3306);
  const config = {
    host: process.env.DB_HOST || "localhost",
    port: Number.isFinite(dbPort) ? dbPort : 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || process.env.DB_DATABASE || "cosmos",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: "utf8mb4",
    timezone: "Z",
  };

  if (String(process.env.DB_SSL || "false").toLowerCase() === "true") {
    const certPath = process.env.AWS_RDS_CA_PATH;
    if (certPath && fs.existsSync(certPath)) {
      config.ssl = { ca: fs.readFileSync(certPath) };
    } else {
      config.ssl = { rejectUnauthorized: true };
    }
  }

  return config;
}

async function initialize() {
  if (useJson) {
    await jsonStore.ensureStore();
    console.log("[Database] Usando armazenamento JSON local.");
    return;
  }

  if (!process.env.DB_HOST) {
    throw new Error("DB_HOST não definido. Configure o endpoint do RDS ou use DB_MODE=json para desenvolvimento local.");
  }

  if (process.env.NODE_ENV === "production" && (!process.env.DB_USER || !process.env.DB_PASSWORD)) {
    throw new Error("DB_USER e DB_PASSWORD precisam estar configurados no ambiente de produção.");
  }

  const config = buildConfig();
  pool = mysql.createPool(config);
  await waitForDatabaseReady();
}

async function waitForDatabaseReady() {
  const attempts = Number(process.env.DB_RETRY_ATTEMPTS || 15);
  const delayMs = Number(process.env.DB_RETRY_DELAY_MS || 3000);

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const connection = await pool.getConnection();
      dbReady = true;
      connection.release();
      console.log("[Database] Conexão com MySQL estabelecida.");
      return;
    } catch (error) {
      console.warn(`[Database] Tentativa ${attempt}/${attempts} falhou: ${error.message}`);
      if (attempt === attempts) {
        console.error("[Database] Não foi possível conectar ao banco. Encerrando processo.");
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

function execute(sql, params = []) {
  if (useJson) {
    return Promise.reject(new Error("Banco em modo JSON. Use jsonStore diretamente."));
  }

  if (!pool) {
    return Promise.reject(new Error("Pool do MySQL não está inicializado."));
  }

  return pool.execute(sql, params);
}

async function getStatus() {
  if (useJson) {
    return { ok: true, database: "json" };
  }

  if (!pool) {
    return { ok: false, database: "mysql-uninitialized" };
  }

  try {
    const [rows] = await pool.execute("SELECT 1 AS ok");
    return { ok: rows && rows.length > 0, database: "mysql" };
  } catch (error) {
    return { ok: false, database: "mysql" };
  }
}

async function close() {
  if (pool) {
    await pool.end();
  }
}

module.exports = {
  initialize,
  isJsonMode,
  getPool,
  execute,
  getStatus,
  close,
  buildConfig,
};
