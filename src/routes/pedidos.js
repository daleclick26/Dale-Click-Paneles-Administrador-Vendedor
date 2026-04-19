const express = require('express');
const router = express.Router();
const pedidosController = require('../controllers/pedidos.controller');

router.get('/', pedidosController.renderPedidosPage);

router.get('/productos', pedidosController.getProductosFiltro);
router.get('/estados', pedidosController.getEstados);
router.get('/lista', pedidosController.getPedidos);

router.put('/:id/estado', pedidosController.updateEstadoPedido);

module.exports = router;