const express = require('express');
const router = express.Router();
const productosController = require('../controllers/productos.controller');

router.get('/', productosController.renderProductosPage);

router.get('/categorias', productosController.getCategorias);
router.get('/estados', productosController.getEstados);
router.get('/lista', productosController.getProductos);

router.post('/', productosController.createProducto);
router.put('/:id', productosController.updateProducto);
router.delete('/:id', productosController.deleteProducto);

router.get('/imagenes', productosController.getImagenes);
router.post('/imagenes', productosController.addImagenProducto);
router.put('/imagenes/:id', productosController.updateImagenProducto);
router.delete('/imagenes/:id', productosController.deleteImagenProducto);

module.exports = router;