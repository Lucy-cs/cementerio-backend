const sql = require("mssql");
require("dotenv").config();

const options = {
  trustServerCertificate: true,
  encrypt: process.env.DB_ENCRYPT === "true",
};


// Puerto explícito (opcional): DB_PORT=1433
const port = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined;

const config = {
  server: process.env.DB_SERVER,       // LUCY
  database: process.env.DB_DATABASE,   // CementerioDB
  user: process.env.DB_USER,           // app_cementerio
  password: process.env.DB_PASSWORD,   // tu contraseña
  port,
  options,
};

let pool; // pool único para toda la app

async function getConnection() {
  if (pool) return pool;
  pool = await sql.connect(config);
  pool.on("error", err => {
    console.error("Pool error:", err.message);
    try { pool.close(); } catch {}
    pool = null;
  });
  return pool;
}

module.exports = { getConnection, sql };
