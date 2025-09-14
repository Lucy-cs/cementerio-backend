// index.js
const express = require("express");
require("dotenv").config();
const { getConnection } = require("./config/db");

// Middlewares base
const { setupSecurity } = require("./middlewares/security");
const { setupLogger } = require("./middlewares/logger");

const app = express();

// Limitar tamaño del body (protección DoS) y soportar x-www-form-urlencoded
app.use(express.json({ limit: "200kb" }));
app.use(express.urlencoded({ extended: true, limit: "200kb" }));

// Logger (request id + access log) y seguridad (helmet, CORS, rate-limit)
setupLogger(app);
setupSecurity(app);

// Swagger UI
const { swaggerUi, specs } = require("./docs/swagger");
app.use("/docs", swaggerUi.serve, swaggerUi.setup(specs, { explorer: true }));

// Healthcheck
app.get("/health", (req, res) => res.json({ ok: true, requestId: req.id }));

// Rutas NICHOS Y MANZANAS Y PROPIETARIOS
const nichosRoutes = require("./modules/nichos/nichos.routes");
app.use("/api/nichos", nichosRoutes);

const manzanasRoutes = require("./modules/manzanas/manzanas.routes");
app.use("/api/manzanas", manzanasRoutes);

const propietariosRoutes = require("./modules/propietarios/propietarios.routes");
app.use("/api/propietarios", propietariosRoutes);

// Rutas Solicitudes
const solicitudesRoutes = require("./modules/solicitudes/solicitudes.routes");
app.use("/api/solicitudes", solicitudesRoutes);

// Rutas Arrendamientos y Alertas
const arrendamientosRoutes = require("./modules/arrendamientos/arrendamientos.routes");
app.use("/api/arrendamientos", arrendamientosRoutes);

const alertasRoutes = require("./modules/alertas/alertas.routes");
app.use("/api/alertas", alertasRoutes);

// Rutas Catálogos
const catalogsRoutes = require("./modules/catalogos/catalogos.routes");
app.use("/api/catalogs", catalogsRoutes);

// Rutas Auth
const authRoutes = require("./modules/auth/auth.routes");
app.use("/auth", authRoutes);

// Rutas Traspasos
const traspasosRoutes = require("./modules/traspasos/traspasos.routes");
app.use("/api/traspasos", traspasosRoutes);

// Rutas Recibos
const recibosRoutes = require("./modules/recibos/recibos.routes");
app.use("/api/recibos", recibosRoutes);



const PORT = process.env.PORT || 3001;

(async () => {
  try {
    await getConnection();
    console.log("Conexión exitosa a SQL Server");

    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Error de conexión:", err.message);
    process.exit(1); // no arranca si la BD falló
  }
})();