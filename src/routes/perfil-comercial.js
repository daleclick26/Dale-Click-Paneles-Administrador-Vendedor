const express = require('express');
const router = express.Router();
const perfilComercialController = require('../controllers/perfil-comercial.controller');

router.get('/', perfilComercialController.renderPerfilComercialPage);
router.put('/info', perfilComercialController.updateBusinessProfile);
router.put('/horarios', perfilComercialController.updateBusinessHours);

module.exports = router;