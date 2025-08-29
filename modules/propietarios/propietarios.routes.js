// modules/propietarios/propietarios.routes.js
const express = require("express");
const router = express.Router();
const ctrl = require("./propietarios.controller");

// GET /api/propietarios
router.get("/", (req, res, next) => {
  /*
    #swagger.tags = ['Propietarios']
    #swagger.summary = 'Listar propietarios'
    #swagger.description = 'Filtra por nombre/apellido/DPI con ?search='
    #swagger.path = '/api/propietarios'
    #swagger.parameters['search'] = { in: 'query', type: 'string' }
  */
  return ctrl.listar(req, res, next);
});

// GET /api/propietarios/{id}
router.get("/:id", (req, res, next) => {
  /*
    #swagger.tags = ['Propietarios']
    #swagger.summary = 'Obtener propietario por ID'
    #swagger.path = '/api/propietarios/{id}'
    #swagger.parameters['id'] = { in: 'path', required: true, type: 'integer', minimum: 1 }
  */
  return ctrl.obtenerPorId(req, res, next);
});

// POST /api/propietarios
router.post("/", (req, res, next) => {
  /*
    #swagger.tags = ['Propietarios']
    #swagger.summary = 'Crear propietario'
    #swagger.path = '/api/propietarios'
    #swagger.requestBody = {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["nombres","apellidos","dpi"],
            properties: {
              nombres:   { type: "string", example: "María José" },
              apellidos: { type: "string", example: "López Pérez" },
              dpi:       { type: "string", example: "1234567890101" },
              telefono:  { type: "string", example: "5555-1234" }
            }
          },
          example: { "nombres":"María", "apellidos":"López", "dpi":"1234567890101", "telefono":"55551234" }
        }
      }
    }
  */
  return ctrl.crear(req, res, next);
});

// PUT /api/propietarios/{id}
router.put("/:id", (req, res, next) => {
  /*
    #swagger.tags = ['Propietarios']
    #swagger.summary = 'Actualizar propietario'
    #swagger.path = '/api/propietarios/{id}'
    #swagger.parameters['id'] = { in: 'path', required: true, type: 'integer', minimum: 1 }
    #swagger.requestBody = {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              nombres:   { type: "string", example: "María José" },
              apellidos: { type: "string", example: "López Pérez" },
              dpi:       { type: "string", example: "1234567890101" },
              telefono:  { type: "string", example: "5555-1234" }
            }
          },
          example: { "telefono":"55551234" }
        }
      }
    }
  */
  return ctrl.actualizar(req, res, next);
});

// DELETE /api/propietarios/{id}
router.delete("/:id", (req, res, next) => {
  /*
    #swagger.tags = ['Propietarios']
    #swagger.summary = 'Eliminar propietario'
    #swagger.path = '/api/propietarios/{id}'
    #swagger.parameters['id'] = { in: 'path', required: true, type: 'integer', minimum: 1 }
  */
  return ctrl.eliminar(req, res, next);
});

module.exports = router;