// modules/manzanas/manzanas.routes.js
const express = require("express");
const router = express.Router();
const ctrl = require("./manzanas.controller");

// GET /api/manzanas
router.get("/", (req, res, next) => {
  /*
    #swagger.tags = ['Manzanas']
    #swagger.summary = 'Listar manzanas'
    #swagger.description = 'Permite filtrar por nombre (query param search)'
    #swagger.path = '/api/manzanas'
    #swagger.parameters['search'] = { in: 'query', type: 'string' }
  */
  return ctrl.listar(req, res, next);
});

// GET /api/manzanas/{id}
router.get("/:id", (req, res, next) => {
  /*
    #swagger.tags = ['Manzanas']
    #swagger.summary = 'Obtener manzana por ID'
    #swagger.path = '/api/manzanas/{id}'
    #swagger.parameters['id'] = { in: 'path', required: true, type: 'integer', minimum: 1 }
  */
  return ctrl.obtenerPorId(req, res, next);
});

// POST /api/manzanas
router.post("/", (req, res, next) => {
  /*
    #swagger.tags = ['Manzanas']
    #swagger.summary = 'Crear manzana'
    #swagger.path = '/api/manzanas'
    #swagger.requestBody = {
      required: true,
      content: { "application/json": { 
        schema: { type: "object", required: ["nombre"], properties: { nombre: { type: "string", example: "A" } } },
        example: { "nombre": "C" }
      } }
    }
  */
  return ctrl.crear(req, res, next);
});

// PUT /api/manzanas/{id}
router.put("/:id", (req, res, next) => {
  /*
    #swagger.tags = ['Manzanas']
    #swagger.summary = 'Actualizar manzana'
    #swagger.path = '/api/manzanas/{id}'
    #swagger.parameters['id'] = { in: 'path', required: true, type: 'integer', minimum: 1 }
    #swagger.requestBody = {
      required: true,
      content: { "application/json": { 
        schema: { type: "object", properties: { nombre: { type: "string", example: "B" } } },
        example: { "nombre": "B" }
      } }
    }
  */
  return ctrl.actualizar(req, res, next);
});

// DELETE /api/manzanas/{id}
router.delete("/:id", (req, res, next) => {
  /*
    #swagger.tags = ['Manzanas']
    #swagger.summary = 'Eliminar manzana'
    #swagger.path = '/api/manzanas/{id}'
    #swagger.parameters['id'] = { in: 'path', required: true, type: 'integer', minimum: 1 }
  */
  return ctrl.eliminar(req, res, next);
});

module.exports = router;