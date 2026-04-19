const express = require('express');
const router = express.Router();
const tableroController = require('../controllers/tablero.controller');

router.get('/', tableroController.renderTableroPage);

router.get('/datos', tableroController.getDashboardData);
router.get('/export/resumen', tableroController.exportResumenCSV);
router.get('/export/ventas', tableroController.exportVentasCSV);
router.get('/export/clientes', tableroController.exportClientesCSV);

module.exports = router;