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
  tags: [
  { name: 'Reportes', description: 'Consultas de nichos, contratos por vencer, historial de pagos y traspasos' },
  { name: 'Tarifas', description: 'Administración de tarifas (catálogos)' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" }
    },
    schemas: {
      Arrendamiento: {
        type: 'object',
        properties: {
          id: { type:'integer', example: 101 },
          propietario: { type:'object', properties:{ id:{ type:'integer' }, nombres:{ type:'string' }, apellidos:{ type:'string' }, dpi:{ type:'string' } } },
          nicho: { type:'object', properties:{ id:{ type:'integer' }, numero:{ type:'integer' }, manzana_id:{ type:'integer' }, manzana:{ type:'string' } } },
          recibo_id: { type:'integer', nullable:true },
          fecha_inicio: { type:'string', format:'date' },
          fecha_fin: { type:'string', format:'date' },
          nombre_difunto: { type:'string' },
          estado: { type:'string', enum:['Activo','PorVencer','Vencido','Cancelado'] },
          dias_para_vencer: { type:'integer', nullable:true }
        }
      },
      CreateArrendamiento: {
        type:'object', required:['propietario_id','nicho_id','fecha_inicio','recibo'],
        properties: {
          propietario_id: { type:'integer' },
          nicho_id: { type:'integer' },
          fecha_inicio: { type:'string', format:'date' },
          nombre_difunto: { type:'string' },
          recibo: {
            type:'object', required:['numero_recibo','monto','fecha_pago'],
            properties: {
              numero_recibo: { type:'string', example:'A-123456' },
              monto: { type:'number', format:'double', example: 700.00 },
              fecha_pago: { type:'string', format:'date' }
            }
          }
        }
      },
      RenovacionArrendamiento: {
        type:'object', required:['recibo'],
        properties: {
          recibo: { $ref: '#/components/schemas/CreateArrendamiento/properties/recibo' },
          observaciones: { type:'string' }
        }
      },
      Traspaso: {
        type:'object',
        properties: {
          id: { type:'integer', example: 1001 },
          fecha_traspaso: { type:'string', format:'date' },
          nicho: { $ref: '#/components/schemas/Nicho' },
          propietario_anterior: { type:'object', properties:{ id:{ type:'integer' }, nombres:{ type:'string' }, apellidos:{ type:'string' }, dpi:{ type:'string' } } },
          nuevo_propietario: { type:'object', properties:{ id:{ type:'integer' }, nombres:{ type:'string' }, apellidos:{ type:'string' }, dpi:{ type:'string' } } },
          recibo: { type:'object', properties:{ id:{ type:'integer' }, numero_recibo:{ type:'string' }, monto:{ type:'number' }, fecha_pago:{ type:'string', format:'date' } } }
        }
      },
      CreateTraspaso: {
        type:'object', required:['nicho_id','nuevo_propietario_id','recibo'],
        properties: {
          nicho_id: { type:'integer' },
          nuevo_propietario_id: { type:'integer' },
          fecha_traspaso: { type:'string', format:'date', nullable: true },
          recibo: { type:'object', required:['numero_recibo'], properties:{ numero_recibo:{ type:'string' }, monto:{ type:'number', example:700 }, fecha_pago:{ type:'string', format:'date' } } },
          observaciones: { type:'string', nullable:true }
        }
      },
      CreateRecibo: {
        type:'object', required:['numero_recibo','monto','fecha_pago'],
        properties: {
          numero_recibo: { type:'string', example:'R-2025-0001' },
          monto: { type:'number', example: 100.00 },
          fecha_pago: { type:'string', format:'date', example:'2025-09-15' },
          concepto: { type:'string', example:'Mantenimiento' },
          notas: { type:'string', nullable:true }
        }
      },
      Nicho: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          numero: { type: "integer", example: 12 },
          estado: {
            type: "string",
            enum: ["Disponible", "Reservado", "Ocupado", "Mantenimiento", "Bloqueado"],
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
            enum: ["Disponible", "Reservado", "Ocupado", "Mantenimiento", "Bloqueado"],
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
            enum: ["Disponible", "Reservado", "Ocupado", "Mantenimiento", "Bloqueado"],
          },
          manzana_id: { type: "integer", example: 3 },
        },
      },
      CambioEstadoRequest: {
        type: 'object',
        required: ['nuevo_estado'],
        properties: {
          nuevo_estado: { type: 'string', enum: ["Disponible", "Reservado", "Ocupado", "Mantenimiento", "Bloqueado"], example: 'Reservado' },
          motivo: { type: 'string', example: 'Reserva por solicitud #456', nullable: true }
        }
      },
      HistorialEstadoItem: {
        type: 'object',
        properties: {
          fecha: { type: 'string', example: '2025-09-10T16:32:11Z' },
          de: { type: 'string', example: 'Disponible' },
          a: { type: 'string', example: 'Reservado' },
          motivo: { type: 'string', example: 'Reserva por solicitud #456', nullable: true },
          usuario_id: { type: 'integer', example: 7 }
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
      Solicitud: {
        type: 'object',
        properties: {
          id: { type:'integer', example: 10 },
          estado: { type:'string', enum:['Pendiente','Aprobada','Rechazada'], example:'Pendiente' },
          fecha_solicitud: { type:'string', example:'2025-09-11' },
          propietario: { type:'object', nullable:true, properties: { id:{ type:'integer' }, nombres:{ type:'string' }, apellidos:{ type:'string' }, dpi:{ type:'string' } } },
          nicho: { type:'object', nullable:true, properties: { id:{ type:'integer' }, numero:{ type:'integer' }, manzana_id:{ type:'integer' }, manzana:{ type:'string' } } },
          recibo_id: { type:'integer', nullable:true }
        }
      },
      DocumentoSolicitud: {
        type: 'object',
        properties: {
          nombre_archivo: { type:'string', example:'INE.pdf' },
          ruta_relativa: { type:'string', example:'solicitudes/10/INE.pdf' },
          mime_type: { type:'string', example:'application/pdf' },
          tamano_bytes: { type:'integer', example: 23456 }
        }
      }
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
  "./modules/catalogos/tarifas.routes.js",
  "./modules/auth/auth.routes.js",
  "./modules/solicitudes/solicitudes.routes.js",
  "./modules/arrendamientos/arrendamientos.routes.js",
  "./modules/alertas/alertas.routes.js"
  ,"./modules/traspasos/traspasos.routes.js"
  ,"./modules/reportes/reportes.routes.js"
  ,"./modules/recibos/recibos.routes.js"
];


// Archivo de salida
const outputFile = "./docs/openapi.json";

// Genera el JSON
swaggerAutogen(outputFile, endpointsFiles, doc).then(() => {
  console.log("✅ openapi.json generado en docs/openapi.json");
});

