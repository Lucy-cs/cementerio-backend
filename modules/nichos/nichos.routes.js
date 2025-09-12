const express = require("express");
const router = express.Router();
const ctrl = require("./nichos.controller");
const { requireAuth } = require("../../middlewares/auth");

// GET /api/nichos
router.get("/", (req, res, next) => {
  /* 
    #swagger.tags = ['Nichos']
    #swagger.summary = 'Listar nichos'
    #swagger.description = 'Permite filtrar por manzana, estado y search'
    #swagger.path = '/api/nichos'
    #swagger.parameters['manzana'] = { in: 'query', type: 'string' }
    #swagger.parameters['estado']  = { in: 'query', type: 'string', enum: ['Disponible','Reservado','Ocupado'] }
    #swagger.parameters['search']  = { in: 'query', type: 'string' }
  */
  return ctrl.listar(req, res, next);
});

// GET /api/nichos/{id}
router.get("/:id", (req, res, next) => {
  /* 
    #swagger.tags = ['Nichos']
    #swagger.summary = 'Obtener nicho por ID'
    #swagger.path = '/api/nichos/{id}'
    #swagger.parameters['id'] = { in: 'path', required: true, type: 'integer', minimum: 1 }
  */
  return ctrl.obtenerPorId(req, res, next);
});

router.get("/por-numero", (req, res, next) => {
  /*
    #swagger.tags = ['Nichos']
    #swagger.summary = 'Buscar nicho por número + manzana (id o nombre)'
    #swagger.path = '/api/nichos/por-numero'
    #swagger.parameters['numero']    = { in: 'query', required: true, type: 'integer' }
    #swagger.parameters['manzana_id'] = { in: 'query', required: false, type: 'integer' }
    #swagger.parameters['manzana']    = { in: 'query', required: false, type: 'string' }
  */
  return ctrl.obtenerPorNumero(req, res, next);
});


// POST /api/nichos
router.post("/", (req, res, next) => {
  /* 
    #swagger.tags = ['Nichos']
    #swagger.summary = 'Crear nicho'
    #swagger.path = '/api/nichos'
    #swagger.requestBody = { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateNicho' } } } }
  */
  return ctrl.crear(req, res, next);
});

// PUT /api/nichos/{id}
router.put("/:id", (req, res, next) => {
  /* 
    #swagger.tags = ['Nichos']
    #swagger.summary = 'Actualizar nicho por ID'
    #swagger.path = '/api/nichos/{id}'
    #swagger.parameters['id'] = { in: 'path', required: true, type: 'integer', minimum: 1 }
    #swagger.requestBody = { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateNicho' } } } }
  */
  return ctrl.actualizar(req, res, next);
});

// DELETE /api/nichos/{id}
router.delete("/:id", (req, res, next) => {
  /* 
    #swagger.tags = ['Nichos']
    #swagger.summary = 'Eliminar nicho por ID'
    #swagger.path = '/api/nichos/{id}'
    #swagger.parameters['id'] = { in: 'path', required: true, type: 'integer', minimum: 1 }
  */
  return ctrl.eliminar(req, res, next);
});



// PATCH /api/nichos/{id}/estado
router.patch('/:id/estado', requireAuth, (req, res, next) => {
  /*
    #swagger.tags = ['Nichos']
    #swagger.summary = 'Cambiar estado de un nicho'
    #swagger.path = '/api/nichos/{id}/estado'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.parameters['id'] = { in: 'path', required: true, type: 'integer' }
    #swagger.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['nuevo_estado'],
            properties: {
              nuevo_estado: { type: 'string', enum: ['Disponible','Reservado','Ocupado','Mantenimiento','Bloqueado'], example: 'Reservado' },
              motivo: { type: 'string', example: 'Reserva por solicitud #456' }
            }
          }
        }
      }
    }
    #swagger.responses[200] = { description: 'Nicho actualizado', schema: { $ref: '#/components/schemas/Nicho' }}
    #swagger.responses[400] = { description: 'Validación', schema: { $ref: '#/components/schemas/Error' }}
    #swagger.responses[404] = { description: 'No encontrado', schema: { $ref: '#/components/schemas/Error' }}
  */
  return ctrl.cambiarEstado(req, res, next);
});

// GET /api/nichos/{id}/historial
router.get('/:id/historial', requireAuth, (req, res, next) => {
  /*
    #swagger.tags = ['Nichos']
    #swagger.summary = 'Historial de cambios de estado de un nicho'
    #swagger.path = '/api/nichos/{id}/historial'
    #swagger.security = [{ bearerAuth: [] }]
    #swagger.parameters['id'] = { in: 'path', required: true, type: 'integer' }
    #swagger.responses[200] = { description: 'Historial', schema: { type:'array', items: { type:'object', properties: { fecha:{ type:'string' }, de:{ type:'string' }, a:{ type:'string' }, motivo:{ type:'string', nullable:true }, usuario_id:{ type:'integer' } } } } }
  */
  return ctrl.historial(req, res, next);
});

module.exports = router;
