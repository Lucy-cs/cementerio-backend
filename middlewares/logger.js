// middlewares/logger.js
const morgan = require("morgan");
const { randomUUID } = require("crypto");

// Se genera por request y se añade al header.
function requestId() {
  return (req, res, next) => {
    req.id = req.headers["x-request-id"] || randomUUID(); // respeta si viene de un proxy
    res.setHeader("X-Request-Id", req.id);
    next();
  };
}

function setupLogger(app) {
  // 1) Asignar ID a cada request
  app.use(requestId());

  // 2) Log de accesos HTTP (con el ID)
  morgan.token("id", req => req.id);
  app.use(morgan("[:id] :method :url :status - :response-time ms"));
}

module.exports = { setupLogger };
