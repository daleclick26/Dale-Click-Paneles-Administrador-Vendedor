const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const configuracionController = require('../controllers/configuracion.controller');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../public/uploads/perfiles'));
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);
    const uniqueName = `perfil-${Date.now()}${extension}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Formato de imagen no permitido'));
  }
};

const upload = multer({ storage, fileFilter });

router.get('/', configuracionController.renderConfiguracionPage);
router.put('/usuario', configuracionController.updateUsuario);
router.post('/foto-perfil', upload.single('profileImage'), configuracionController.updateFotoPerfil);
router.post('/solicitar-plan', configuracionController.solicitarPlan);

module.exports = router;