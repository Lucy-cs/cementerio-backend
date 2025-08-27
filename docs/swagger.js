// docs/swagger.js
const swaggerUi = require("swagger-ui-express");
const specs = require("./openapi.json"); // archivo generado por autogen.js
module.exports = { swaggerUi, specs };


const PORT = process.env.PORT || 3001;

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Cementerio API",
      version: "1.0.0",
      description:
        "API del Sistema de Gestión de Nichos del Cementerio Municipal No. 2",
    },
    servers: [
      { url: `http://localhost:${PORT}`, description: "Local" }
    ],
    components: {
      schemas: {
        Nicho: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            numero: { type: "integer", example: 12 },
            estado: {
              type: "string",
              enum: ["Disponible", "Reservado", "Ocupado"],
              example: "Disponible"
            },
            manzana_id: { type: "integer", example: 2 },
            manzana: { type: "string", example: "B" }
          }
        },
        CreateNicho: {
          type: "object",
          required: ["numero", "manzana_id"],
          properties: {
            numero: { type: "integer", example: 10 },
            estado: {
              type: "string",
              enum: ["Disponible", "Reservado", "Ocupado"],
              default: "Disponible"
            },
            manzana_id: { type: "integer", example: 1 }
          }
        },
        UpdateNicho: {
          type: "object",
          properties: {
            numero: { type: "integer", example: 15 },
            estado: {
              type: "string",
              enum: ["Disponible", "Reservado", "Ocupado"]
            },
            manzana_id: { type: "integer", example: 3 }
          }
        },
        Error: {
          type: "object",
          properties: {
            message: { type: "string" },
            error: { type: "string" }
          }
        }
      }
    }
  },
  // Busca anotaciones en todos los JS dentro de /modules
  apis: ["./modules/**/*.js"],
};

