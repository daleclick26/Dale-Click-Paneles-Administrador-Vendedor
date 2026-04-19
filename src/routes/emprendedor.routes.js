const express = require('express');
const path = require('path');

const router = express.Router();

router.get('/tablero', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'emprendedor', 'tablero.ejs'));
});

router.get('/productos', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'emprendedor', 'productos.ejs'));
});

router.get('/pedidos', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'emprendedor', 'pedidos.ejs'));
});

router.get('/perfil-comercial', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'emprendedor', 'perfil-comercial.ejs'));
});

router.get('/clientes', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'emprendedor', 'clientes.ejs'));
});

module.exports = router;

/*Login*/
const controller = require('../controllers/emprendedor.controller');
const { isAuthenticated } = require('../middlewares/auth.middleware');
router.get('/tablero', isAuthenticated, controller.tablero);

/*const { isAuthenticated } = require('../middlewares/auth.middleware');
router.get('/tablero', isAuthenticated, controller.tablero);*/
