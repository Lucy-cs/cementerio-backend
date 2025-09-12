// modules/catalogos/catalogos.routes.js
const express = require("express");
const router = express.Router();
const ctrl = require("./catalogos.controller");

/* ========================= MANZANAS ========================= */

// GET /api/catalogs/manzanas
router.get("/manzanas", (req, res, next) => {
  /*
    #swagger.tags = ['Catálogos']
    #swagger.summary = 'Lista de manzanas (catálogo)'
    #swagger.description = 'Filtra por ?search= y ?includeInactive=[true|false]. Solo manzanas activas por defecto.'
  #swagger.path = '/api/catalogs/manzanas'
    #swagger.parameters['search'] = { in: 'query', type: 'string' }
    #swagger.parameters['includeInactive'] = { in: 'query', type: 'boolean', default: false }
    #swagger.responses[200] = {
      description: 'OK',
      content: { "application/json": { schema: { 
        type:'array', items:{ $ref:'#/components/schemas/CatalogManzana' } } } }
    }
  */
  return ctrl.manzanasList(req, res, next);
});

// POST /api/catalogs/manzanas  (crear / editar / activar / desactivar)
router.post("/manzanas", (req, res, next) => {
  /*
    #swagger.tags = ['Catálogos']
    #swagger.summary = 'Crear/editar/activar/desactivar manzana'
    #swagger.description = 'Si envías id => actualiza; si no => crea. Para desactivar: { id, activo:false }'
  #swagger.path = '/api/catalogs/manzanas'
    #swagger.requestBody = {
      required: true,
      content: { "application/json": { schema: { $ref:'#/components/schemas/UpsertManzana' },
        examples: {
          crear: { value: { nombre: "C" } },
          renombrar: { value: { id: 3, nombre: "B" } },
          desactivar: { value: { id: 3, activo: false } },
          activar: { value: { id: 3, activo: true } }
        } } }
    }
    #swagger.responses[201] = { description: 'Creado / Actualizado', content:{ "application/json":{ schema:{ $ref:'#/components/schemas/CatalogManzana' } } } }
    #swagger.responses[409] = { description: 'Conflicto (duplicado o no se puede desactivar por uso)' }
  */
  return ctrl.manzanasUpsert(req, res, next);
});

/* ========================= TARIFAS ========================= */

// GET /api/catalogs/tarifas
router.get("/tarifas", (req, res, next) => {
  /*
    #swagger.tags = ['Catálogos']
    #swagger.summary = 'Tarifas vigentes/históricas'
    #swagger.description = 'Consulta por fecha ?on=YYYY-MM-DD (default: hoy). Filtros: concepto, alcance, tipo_nicho_id, manzana_id, sector_id. ?includeHistory=true devuelve todo.'
  #swagger.path = '/api/catalogs/tarifas'
    #swagger.parameters['on'] = { in: 'query', type:'string', example:'2025-09-08' }
    #swagger.parameters['includeHistory'] = { in:'query', type:'boolean', default:false }
    #swagger.parameters['concepto'] = { in:'query', type:'string' }
    #swagger.parameters['alcance'] = { in:'query', type:'string', enum:['GLOBAL','POR_TIPO','POR_ZONA'] }
    #swagger.parameters['tipo_nicho_id'] = { in:'query', type:'integer' }
    #swagger.parameters['manzana_id'] = { in:'query', type:'integer' }
    #swagger.parameters['sector_id'] = { in:'query', type:'integer' }
    #swagger.responses[200] = { description:'OK', content:{ "application/json": { schema:{ type:'array', items:{ $ref:'#/components/schemas/Tarifa' } } } } }
  */
  return ctrl.tarifasList(req, res, next);
});

// POST /api/catalogs/tarifas
router.post("/tarifas", (req, res, next) => {
  /*
    #swagger.tags = ['Catálogos']
    #swagger.summary = 'Nueva vigencia de tarifa (sin solapes)'
    #swagger.description = 'Crea una tarifa válida desde una fecha; valida que no haya solape con otra tarifa del mismo concepto/alcance/dimensiones.'
  #swagger.path = '/api/catalogs/tarifas'
    #swagger.requestBody = {
      required: true,
      content: { "application/json": { schema: { $ref:'#/components/schemas/CreateTarifa' },
        example: { concepto:"ARRIENDO_7AÑOS", alcance:"GLOBAL", monto:700, moneda:"GTQ", vigencia_desde:"2025-01-01" } } }
    }
    #swagger.responses[201] = { description:'Creado', content:{ "application/json": { schema:{ $ref:'#/components/schemas/Tarifa' } } } }
    #swagger.responses[409] = { description:'Conflicto: solapa con una tarifa vigente en ese alcance/fecha' }
    #swagger.responses[422] = { description:'Parámetros inválidos para el alcance' }
  */
  return ctrl.tarifasCreate(req, res, next);
});

/* ========================= ESTADOS DE NICHO ========================= */

// GET /api/catalogs/estados-nicho
router.get("/estados-nicho", (req, res, next) => {
  /*
    #swagger.tags = ['Catálogos']
    #swagger.summary = 'Estados permitidos de Nicho'
  #swagger.path = '/api/catalogs/estados-nicho'
    #swagger.responses[200] = { description:'OK', content:{ "application/json": { schema:{ 
      type:'array', items:{ type:'string', enum:['Disponible','Reservado','Ocupado','Mantenimiento','Bloqueado'] } } } } }
  */
  return ctrl.estadosNicho(req, res, next);
});

module.exports = router;
