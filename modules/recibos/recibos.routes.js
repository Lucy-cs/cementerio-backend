const express = require('express');
const router = express.Router();
const ctrl = require('./recibos.controller');
const { requireAuth } = require('../../middlewares/auth');

// Listar
router.get('/', requireAuth, (req,res,next)=>{ /*
	#swagger.tags = ['Recibos']
	#swagger.summary = 'Listar recibos (arrendamientos, traspasos y sueltos)'
	#swagger.path = '/api/recibos'
	#swagger.security = [{ bearerAuth: [] }]
	#swagger.parameters['nicho_id'] = { in:'query', type:'integer' }
	#swagger.parameters['propietario_id'] = { in:'query', type:'integer' }
	#swagger.parameters['q'] = { in:'query', type:'string' }
	#swagger.parameters['page'] = { in:'query', type:'integer', default:1 }
	#swagger.parameters['pageSize'] = { in:'query', type:'integer', default:20 }
*/ return ctrl.listar(req,res,next); });

// Crear
router.post('/', requireAuth, (req,res,next)=>{ /*
	#swagger.tags = ['Recibos']
	#swagger.summary = 'Crear un recibo suelto'
	#swagger.path = '/api/recibos'
	#swagger.security = [{ bearerAuth: [] }]
	#swagger.requestBody = { required:true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateRecibo' }, example: { numero_recibo:'R-2025-0001', monto:100, fecha_pago:'2025-09-15', concepto:'Mantenimiento', notas:'Pago mensual' } } } }
*/ return ctrl.crear(req,res,next); });

// Obtener por id
router.get('/:id', requireAuth, (req,res,next)=>{ /*
	#swagger.tags = ['Recibos']
	#swagger.summary = 'Obtener recibo por id'
	#swagger.path = '/api/recibos/{id}'
	#swagger.security = [{ bearerAuth: [] }]
	#swagger.parameters['id'] = { in:'path', required:true, type:'integer' }
*/ return ctrl.obtener(req,res,next); });

module.exports = router;
