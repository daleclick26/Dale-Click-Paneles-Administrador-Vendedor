const express = require('express');
const path = require('path');
const session = require('express-session');

const app = express();

// Configuración base
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares globales
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Sesiones
app.use(session({
  /*secret: 'daleclick-secret',*/
  secret: process.env.SESSION_SECRET, 
  resave: false,
  saveUninitialized: false
}));

// Usuario disponible en todas las vistas
app.use((req, res, next) => {
  res.locals.usuario = req.session.usuario || null;
  next();
});

// Rutas
const authRoutes = require('./routes/auth.routes');
const tableroRoutes = require('./routes/tablero');
const productosRoutes = require('./routes/productos');
const pedidosRoutes = require('./routes/pedidos');
const perfilComercialRoutes = require('./routes/perfil-comercial');
const clientesRoutes = require('./routes/clientes');
const configuracionRoutes = require('./routes/configuracion');
const adminRoutes = require('./routes/admin.routes');

// Ruta principal
app.get('/', (req, res) => {
  if (req.session.usuario) {
    if (req.session.usuario.roleID === 3) {
      return res.redirect('/admin/tablero');
    }
    return res.redirect('/tablero');
  } else {
    return res.redirect('/login');
  }
});

// Montaje de rutas
app.use('/', authRoutes);
app.use('/tablero', tableroRoutes);
app.use('/productos', productosRoutes);
app.use('/pedidos', pedidosRoutes);
app.use('/perfil-comercial', perfilComercialRoutes);
app.use('/clientes', clientesRoutes);
app.use('/configuracion', configuracionRoutes);
app.use('/admin', adminRoutes);

module.exports = app;