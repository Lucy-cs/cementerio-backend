// middlewares/security.js
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

function parseOrigins(val) {
  if (!val) return [];
  return val.split(",").map(s => s.trim()).filter(Boolean);
}

function setupSecurity(app) {
  // 1) Cabeceras de seguridad
  app.use(helmet());

  // 2) CORS con lista blanca (allowlist) desde .env
  const allowlist = parseOrigins(process.env.CORS_ORIGINS);
  const corsOptions = {
    origin(origin, callback) {
      // Permite curl/Postman (sin origin)
      if (!origin) return callback(null, true);

      // Si no configuras CORS_ORIGINS, en dev se permite todo
      if (allowlist.length === 0) return callback(null, true);

      if (allowlist.includes(origin)) return callback(null, true);
      return callback(new Error("CORS: Origen no permitido"), false);
    },
    credentials: true,
  };
  app.use(cors(corsOptions));

  // 3) Rate limit para toda la API
  const windowMin = Number(process.env.RATE_LIMIT_WINDOW_MIN || 15);
  const maxReq = Number(process.env.RATE_LIMIT_MAX || 100);
  const limiter = rateLimit({
    windowMs: windowMin * 60 * 1000,
    max: maxReq,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Demasiadas solicitudes, intente más tarde." },
  });
  app.use("/api", limiter);
}

module.exports = { setupSecurity };
