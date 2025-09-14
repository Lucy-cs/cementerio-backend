const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middlewares/auth');
const arrCtrl = require('../arrendamientos/arrendamientos.controller');

// GET /api/alertas/vencimientos
router.get('/vencimientos', requireAuth, (req, res, next) => { /*
  #swagger.tags = ['Alertas']
  #swagger.summary = 'Listar contratos que vencen en <= N días (dinámico)'
  #swagger.path = '/api/alertas/vencimientos'
  #swagger.security = [{ bearerAuth: [] }]
  #swagger.parameters['dias'] = { in:'query', type:'integer', default:30 }
  #swagger.responses[200] = { description:'OK', schema:{ type:'array', items:{ type:'object', properties:{ arrendamiento_id:{ type:'integer' }, propietario:{ type:'object' }, nicho:{ type:'object' }, fecha_fin:{ type:'string', format:'date' }, dias_para_vencer:{ type:'integer' } } } } }
*/ return arrCtrl.alertasVencimientos(req,res,next); });

module.exports = router;
