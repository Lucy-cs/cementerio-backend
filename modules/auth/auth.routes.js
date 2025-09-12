// modules/auth/auth.routes.js
const express = require("express");
const router = express.Router();
const ctrl = require("./auth.controller");
const { requireAuth } = require("../../middlewares/auth");

/* =============== LOGIN =============== */
router.post("/login", (req, res, next) => {
  /*
    #swagger.tags = ['Auth']
    #swagger.summary = 'Login'
    #swagger.description = 'Autentica por correo + password. Devuelve access_token JWT y refresh_token rotativo.'
  #swagger.path = '/auth/login'
    #swagger.requestBody = {
      required: true,
      content: { "application/json": { schema: { $ref: '#/components/schemas/LoginRequest' },
        example: { "correo":"admin@demo.com","password":"Secreta123" } } }
    }
    #swagger.responses[200] = { description:'OK', content:{ "application/json": { schema:{ $ref:'#/components/schemas/LoginResponse' } } } }
    #swagger.responses[401] = { description:'Credenciales inválidas o usuario inactivo' }
  */
  return ctrl.login(req, res, next);
});

/* =============== REFRESH =============== */
router.post("/refresh", (req, res, next) => {
  /*
    #swagger.tags = ['Auth']
    #swagger.summary = 'Refresh token'
    #swagger.description = 'Intercambia el refresh_token por un nuevo par (access y refresh). Rotación segura.'
  #swagger.path = '/auth/refresh'
    #swagger.requestBody = {
      required: true,
      content: { "application/json": { schema:{ $ref:'#/components/schemas/RefreshRequest' } ,
        example: { "refresh_token":"<token>" } } }
    }
    #swagger.responses[200] = { description:'OK', content:{ "application/json": { schema:{ $ref:'#/components/schemas/RefreshResponse' } } } }
    #swagger.responses[401] = { description:'Refresh inválido/expirado/revocado' }
  */
  return ctrl.refresh(req, res, next);
});

/* =============== LOGOUT =============== */
router.post("/logout", (req, res, next) => {
  /*
    #swagger.tags = ['Auth']
    #swagger.summary = 'Logout'
    #swagger.description = 'Revoca un refresh_token (o todos del usuario si envías Authorization: Bearer + { allDevices:true }).'
  #swagger.path = '/auth/logout'
    #swagger.requestBody = {
      required: false,
      content: { "application/json": { schema:{ $ref:'#/components/schemas/LogoutRequest' },
        examples: {
          soloEste: { value: { "refresh_token":"<token>" } },
          todosMisDispositivos: { value: { "allDevices": true } }
        } } }
    }
    #swagger.responses[204] = { description:'Sin contenido' }
    #swagger.responses[401] = { description:'No autorizado' }
  */
  return ctrl.logout(req, res, next);
});

/* =============== ME (PROTEGIDO) =============== */
router.get("/me", requireAuth, (req, res, next) => {
  /*
    #swagger.tags = ['Auth']
    #swagger.summary = 'Perfil del usuario autenticado'
  #swagger.path = '/auth/me'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.responses[200] = { description:'OK', content:{ "application/json": { schema:{ $ref:'#/components/schemas/MeUser' } } } }
    #swagger.responses[401] = { description:'Token inválido/ausente' }
  */
  return ctrl.me(req, res, next);
});

module.exports = router;
