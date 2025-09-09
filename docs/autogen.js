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
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" }
    },
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
      LoginRequest: {
        type: "object",
        required: ["correo", "password"],
        properties: {
          correo: { type: "string", example: "admin@demo.com" },
          password: { type: "string", example: "Secreta123" }
        }
      },
      LoginResponse: {
        type: "object",
        properties: {
          token_type: { type: "string", example: "Bearer" },
          access_token: { type: "string" },
          expires_in: { type: "integer", example: 900 },
          refresh_token: { type: "string" },
          user: {
            type: "object",
            properties: {
              id: { type: "integer", example: 1 },
              nombre_completo: { type: "string", example: "Admin General" },
              correo: { type: "string", example: "admin@demo.com" },
              rol_id: { type: "integer", example: 1 },
              rol: { type: "string", example: "Admin" }
            }
          }
        }
      },
      RefreshRequest: {
        type: "object",
        required: ["refresh_token"],
        properties: { refresh_token: { type: "string" } }
      },
      RefreshResponse: { $ref: '#/components/schemas/LoginResponse' },
      LogoutRequest: {
        type: "object",
        properties: {
          refresh_token: { type: "string" },
          allDevices: { type: "boolean", example: false }
        }
      },
      MeUser: {
        type: "object",
        properties: {
          id: { type: "integer" },
          nombre_completo: { type: "string" },
          correo: { type: "string" },
          rol_id: { type: "integer" },
          rol: { type: "string", nullable: true },
          activo: { type: "boolean" }
        }
      },
      CatalogManzana: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          nombre: { type: "string", example: "A" },
          activo: { type: "boolean", example: true }
        }
      },
      UpsertManzana: {
        type: "object",
        properties: {
          id: { type: "integer", example: 3 },
          nombre: { type: "string", example: "C" },
          activo: { type: "boolean", example: false }
        },
        anyOf: [
          { required: ["nombre"] },
          { required: ["id"] }
        ]
      },
      Tarifa: {
        type: "object",
        properties: {
          id: { type:"integer", example: 5 },
          concepto: { type:"string", example:"ARRIENDO_7AÑOS" },
          alcance: { type:"string", enum:["GLOBAL","POR_TIPO","POR_ZONA"] },
          monto: { type:"number", example:700 },
          moneda: { type:"string", example:"GTQ" },
          vigencia_desde: { type:"string", example:"2025-01-01" },
          vigencia_hasta: { type:"string", nullable:true, example:null },
          tipo_nicho_id: { type:"integer", nullable:true, example:null },
          manzana_id: { type:"integer", nullable:true, example:null },
          sector_id: { type:"integer", nullable:true, example:null },
          activo: { type:"boolean", example:true },
          created_at: { type:"string", example:"2025-01-01T12:00:00Z" },
          updated_at: { type:"string", example:"2025-01-01T12:00:00Z" }
        }
      },
      CreateTarifa: {
        type: "object",
        required: ["concepto","alcance","monto","vigencia_desde"],
        properties: {
          concepto: { type:"string", example:"ARRIENDO_7AÑOS" },
          alcance: { type:"string", enum:["GLOBAL","POR_TIPO","POR_ZONA"] },
          monto: { type:"number", example:700 },
          moneda: { type:"string", example:"GTQ" },
          vigencia_desde: { type:"string", example:"2025-01-01" },
          vigencia_hasta: { type:"string", nullable:true, example:null },
          tipo_nicho_id: { type:"integer", nullable:true, example:null },
          manzana_id: { type:"integer", nullable:true, example:null },
          sector_id: { type:"integer", nullable:true, example:null }
        }
      },
    },
  },
};

// Archivos donde el autogenerador buscará tus rutas Express
const endpointsFiles = [
  "./index.js",
  "./modules/nichos/nichos.routes.js",
  "./modules/manzanas/manzanas.routes.js",
  "./modules/propietarios/propietarios.routes.js",
  "./modules/catalogos/catalogos.routes.js",
  "./modules/auth/auth.routes.js"
];


// Archivo de salida
const outputFile = "./docs/openapi.json";

// Genera el JSON
swaggerAutogen(outputFile, endpointsFiles, doc).then(() => {
  console.log("✅ openapi.json generado en docs/openapi.json");
});

