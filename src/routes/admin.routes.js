const express = require('express');
const router = express.Router();

const {
  renderTableroAdmin,
  exportTableroCsv,
  getTopbarNotificacionesAdmin
} = require('../controllers/admin/tablero.controller');

const {
  renderUsuariosAdmin,
  getUsuariosAdminData,
  createUsuarioAdmin,
  updateUsuarioAdmin,
  deleteUsuarioAdmin,
  createRolAdmin,
  createPerfilEstudianteAdmin
} = require('../controllers/admin/usuarios.controller');

const {
  renderNegociosAdmin,
  getNegociosAdminData,
  getNegociosFormData,
  createNegocioAdmin,
  createUniversidadAdmin
} = require('../controllers/admin/negocios.controller');

const {
  renderMembresiasAdmin,
  getMembresiasAdminData,
  getMembresiasFormData,
  createPlanAdmin,
  createDescuentoAdmin,
  createSuscripcionAdmin,
  updateSuscripcionAdmin,
  deleteSuscripcionAdmin
} = require('../controllers/admin/membresias.controller');

const {
  renderCatalogoAdmin,
  getCatalogoAdminData,
  getCatalogoFormData,
  createCategoriaAdmin,
  createProductoAdmin
} = require('../controllers/admin/catalogo.controller');

const {
  renderVerificacionesAdmin,
  getVerificacionesAdminData,
  getVerificacionesFormData,
  createVerificacionAdmin
} = require('../controllers/admin/verificaciones.controller');

const {
  renderReportesAdmin,
  getReportesAdminData,
  getDetallesOrdenAdminData,
  exportReportesCsv
} = require('../controllers/admin/reportes.controller');

const {
  renderConfiguracionAdmin,
  updateConfiguracionAdmin,
  uploadFotoAdmin
} = require('../controllers/admin/configuracion-admin.controller');

router.get('/negocios', renderNegociosAdmin);
router.get('/negocios/data', getNegociosAdminData);
router.get('/negocios/form-data', getNegociosFormData);
router.post('/negocios', createNegocioAdmin);
router.post('/universidades', createUniversidadAdmin);

router.get('/membresias', renderMembresiasAdmin);
router.get('/membresias/data', getMembresiasAdminData);
router.get('/membresias/form-data', getMembresiasFormData);
router.post('/planes', createPlanAdmin);
router.post('/descuentos', createDescuentoAdmin);
router.post('/suscripciones', createSuscripcionAdmin);
router.put('/suscripciones/:id', updateSuscripcionAdmin);
router.delete('/suscripciones/:id', deleteSuscripcionAdmin);

router.get('/catalogo', renderCatalogoAdmin);
router.get('/catalogo/data', getCatalogoAdminData);
router.get('/catalogo/form-data', getCatalogoFormData);
router.post('/categorias', createCategoriaAdmin);
router.post('/productos', createProductoAdmin);

router.get('/verificaciones', renderVerificacionesAdmin);
router.get('/verificaciones/data', getVerificacionesAdminData);
router.get('/verificaciones/form-data', getVerificacionesFormData);
router.post('/verificaciones', createVerificacionAdmin);

router.get('/reportes', renderReportesAdmin);
router.get('/reportes/data', getReportesAdminData);
router.get('/reportes/detalles', getDetallesOrdenAdminData);
router.get('/reportes/export/:dias', exportReportesCsv);

router.get('/configuracion', renderConfiguracionAdmin);
router.put('/configuracion', updateConfiguracionAdmin);
router.post('/configuracion/foto', uploadFotoAdmin);

router.get('/tablero', renderTableroAdmin);
router.get('/tablero/export/:tipo', exportTableroCsv);
router.get('/notificaciones', getTopbarNotificacionesAdmin);

router.get('/usuarios', renderUsuariosAdmin);
router.get('/usuarios/data', getUsuariosAdminData);
router.post('/usuarios', createUsuarioAdmin);
router.put('/usuarios/:id', updateUsuarioAdmin);
router.delete('/usuarios/:id', deleteUsuarioAdmin);

router.post('/roles', createRolAdmin);
router.post('/studentprofiles', createPerfilEstudianteAdmin);

module.exports = router;
