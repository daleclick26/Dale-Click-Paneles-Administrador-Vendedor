const express = require('express');
const router = express.Router();
const clientesController = require('../controllers/clientes.controller');

router.get('/', clientesController.renderClientesPage);
router.get('/lista', clientesController.getClientes);
router.get('/segmentos', clientesController.getSegmentos);
router.post('/contactar', clientesController.contactarCliente);

module.exports = router;