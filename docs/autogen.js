// docs/autogen.js
require("dotenv").config();

// Fuerza a generar **OpenAPI 3.0** (no Swagger 2.0)
const swaggerAutogen = require("swagger-autogen")({ openapi: "3.0.0" });

// --- Metadatos y esquemas que verás en Swagger UI ---
const doc = {
  info: {
    title: "Cementerio API",
    version: "1.0.0",
    description: "API del Sistema de Gestión de Nichos del Cementerio No. 2",
  },
  servers: [
    { url: `http://localhost:${process.env.PORT || 3001}`, description: "Local" },
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
            example: "Disponible",
          },
          manzana_id: { type: "integer", example: 2 },
          manzana: { type: "string", example: "B" },
        },
      },
      CreateNicho: {
        type: "object",
        required: ["numero", "manzana_id"],
        properties: {
          numero: { type: "integer", example: 10 },
          estado: {
            type: "string",
            enum: ["Disponible", "Reservado", "Ocupado"],
            default: "Disponible",
          },
          manzana_id: { type: "integer", example: 1 },
        },
      },
      UpdateNicho: {
        type: "object",
        properties: {
          numero: { type: "integer", example: 15 },
          estado: {
            type: "string",
            enum: ["Disponible", "Reservado", "Ocupado"],
          },
          manzana_id: { type: "integer", example: 3 },
        },
      },
    },
  },
};

// Archivos donde el autogenerador buscará tus rutas Express
const endpointsFiles = ["./index.js", "./modules/nichos/nichos.routes.js",
  "./modules/manzanas/manzanas.routes.js",
 "./modules/propietarios/propietarios.routes.js"];


// Archivo de salida
const outputFile = "./docs/openapi.json";

// Genera el JSON
swaggerAutogen(outputFile, endpointsFiles, doc).then(() => {
  console.log("✅ openapi.json generado en docs/openapi.json");
});

