const express = require("express");
const router = express.Router();
const { requireAuth } = require("../../middlewares/auth");
const ctrl = require("./reportes.controller");

// Nichos disponibles
router.get("/nichos-disponibles", requireAuth, (req,res,next)=>{ /*
	#swagger.tags = ['Reportes']
	#swagger.summary = 'Nichos disponibles (opcional: por manzana)'
	#swagger.path = '/api/reportes/nichos-disponibles'
	#swagger.security = [{ bearerAuth: [] }]
	#swagger.parameters['manzanaId'] = { in:'query', type:'integer' }
*/ return ctrl.nichosDisponibles(req,res,next); });

// Contratos por vencer
router.get("/contratos-por-vencer", requireAuth, (req,res,next)=>{ /*
	#swagger.tags = ['Reportes']
	#swagger.summary = 'Contratos por vencer en N días'
	#swagger.path = '/api/reportes/contratos-por-vencer'
	#swagger.security = [{ bearerAuth: [] }]
	#swagger.parameters['dias'] = { in:'query', type:'integer', default:30 }
*/ return ctrl.contratosPorVencer(req,res,next); });

// Historial de pagos por predio (nicho)
router.get("/historial-pagos", requireAuth, (req,res,next)=>{ /*
	#swagger.tags = ['Reportes']
	#swagger.summary = 'Historial de pagos por nicho'
	#swagger.path = '/api/reportes/historial-pagos'
	#swagger.security = [{ bearerAuth: [] }]
	#swagger.parameters['predioId'] = { in:'query', type:'integer', required:true }
*/ return ctrl.historialPagos(req,res,next); });

// Traspasos por rango de fechas
router.get("/traspasos", requireAuth, (req,res,next)=>{ /*
	#swagger.tags = ['Reportes']
	#swagger.summary = 'Traspasos por rango de fechas'
	#swagger.path = '/api/reportes/traspasos'
	#swagger.security = [{ bearerAuth: [] }]
	#swagger.parameters['desde'] = { in:'query', type:'string', format:'date' }
	#swagger.parameters['hasta'] = { in:'query', type:'string', format:'date' }
*/ return ctrl.traspasosRango(req,res,next); });

module.exports = router;
