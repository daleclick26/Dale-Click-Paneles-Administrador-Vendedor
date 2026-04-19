const db = require('../config/db');

function getUsuarioSesion(req) {
  return req.session?.usuario || null;
}

function getUsuarioActual(userID, callback) {
  const query = `
    SELECT
      userID,
      username,
      firstName,
      lastName,
      email,
      roleID,
      profileImageURL
    FROM Users
    WHERE userID = ?
    LIMIT 1
  `;

  db.query(query, [userID], (error, rows) => {
    if (error) return callback(error);
    callback(null, rows[0] || null);
  });
}

function getBusinessByUser(userID, callback) {
  const query = `
    SELECT
      businessID,
      userID,
      businessName
    FROM BusinessProfiles
    WHERE userID = ?
    LIMIT 1
  `;

  db.query(query, [userID], (error, rows) => {
    if (error) return callback(error);
    callback(null, rows[0] || null);
  });
}

function getContextoUsuarioNegocio(req, callback) {
  const usuarioSesion = getUsuarioSesion(req);

  if (!usuarioSesion?.userID) {
    return callback(new Error('No hay sesiÃ³n activa.'));
  }

  getUsuarioActual(usuarioSesion.userID, (errorUsuario, usuario) => {
    if (errorUsuario) return callback(errorUsuario);

    if (!usuario) {
      return callback(new Error('Usuario no encontrado.'));
    }

    getBusinessByUser(usuario.userID, (errorBusiness, business) => {
      if (errorBusiness) return callback(errorBusiness);

      if (!business) {
        return callback(new Error('El usuario no tiene negocio asociado.'));
      }

      const usuarioLimpio = {
        ...usuario,
        profileImageURL:
          usuario.profileImageURL && String(usuario.profileImageURL).trim() !== ''
            ? usuario.profileImageURL
            : null
      };

      callback(null, {
        usuario: usuarioLimpio,
        business
      });
    });
  });
}

function getProductosByBusiness(businessID, callback) {
  const query = `
    SELECT DISTINCT
      p.productID,
      p.productName
    FROM Products p
    INNER JOIN OrderDetails od ON od.productID = p.productID
    INNER JOIN Orders o ON o.orderID = od.orderID
    WHERE o.businessID = ?
    ORDER BY p.productName ASC
  `;

  db.query(query, [businessID], (error, rows) => {
    if (error) return callback(error);
    callback(null, rows || []);
  });
}

function getPedidosByBusiness(businessID, callback) {
  const query = `
    SELECT
      o.orderID,
      o.orderDate,
      o.orderStatus,
      od.orderDetailID,
      od.quantity,
      od.unitPrice,
      p.productID,
      p.productName,
      u.userID,
      u.firstName,
      u.lastName,
      u.email,
      u.phone
    FROM Orders o
    INNER JOIN OrderDetails od ON od.orderID = o.orderID
    INNER JOIN Products p ON p.productID = od.productID
    INNER JOIN Users u ON u.userID = o.userID
    WHERE o.businessID = ?
      AND u.roleID = 1
    ORDER BY o.orderDate DESC, o.orderID DESC
  `;

  db.query(query, [businessID], (error, rows) => {
    if (error) return callback(error);
    callback(null, rows || []);
  });
}

exports.renderPedidosPage = (req, res) => {
  getContextoUsuarioNegocio(req, (contextoError, contexto) => {
    if (contextoError) {
      console.error('Error al cargar pedidos:', contextoError);

      if (contextoError.message === 'No hay sesiÃ³n activa.') {
        return res.redirect('/login');
      }

      return res.status(500).send('Error al cargar pedidos');
    }

    getProductosByBusiness(contexto.business.businessID, (errorProductos, productos) => {
      if (errorProductos) {
        console.error('Error al obtener productos para filtro:', errorProductos);
        return res.status(500).send('Error al cargar pedidos');
      }

      getPedidosByBusiness(contexto.business.businessID, (errorPedidos, pedidos) => {
        if (errorPedidos) {
          console.error('Error al obtener pedidos:', errorPedidos);
          return res.status(500).send('Error al cargar pedidos');
        }

        return res.render('emprendedor/pedidos', {
          activePage: 'pedidos',
          usuario: contexto.usuario,
          productos,
          estados: ['Reservado', 'Entregado'],
          pedidos
        });
      });
    });
  });
};

exports.getProductosFiltro = (req, res) => {
  getContextoUsuarioNegocio(req, (contextoError, contexto) => {
    if (contextoError) {
      console.error('Error al obtener contexto de productos en pedidos:', contextoError);

      if (contextoError.message === 'No hay sesiÃ³n activa.') {
        return res.status(401).json({ error: 'SesiÃ³n no vÃ¡lida' });
      }

      return res.status(500).json({ error: 'Error al obtener productos' });
    }

    getProductosByBusiness(contexto.business.businessID, (error, productos) => {
      if (error) {
        console.error('Error al obtener productos filtro:', error);
        return res.status(500).json({ error: 'Error al obtener productos' });
      }

      return res.json(productos);
    });
  });
};

exports.getEstados = (req, res) => {
  return res.json([
    { value: 'Reservado', label: 'Reservado' },
    { value: 'Entregado', label: 'Entregado' }
  ]);
};

exports.getPedidos = (req, res) => {
  getContextoUsuarioNegocio(req, (contextoError, contexto) => {
    if (contextoError) {
      console.error('Error al obtener contexto de pedidos:', contextoError);

      if (contextoError.message === 'No hay sesiÃ³n activa.') {
        return res.status(401).json({ error: 'SesiÃ³n no vÃ¡lida' });
      }

      return res.status(500).json({ error: 'Error al obtener pedidos' });
    }

    getPedidosByBusiness(contexto.business.businessID, (error, pedidos) => {
      if (error) {
        console.error('Error al obtener pedidos:', error);
        return res.status(500).json({ error: 'Error al obtener pedidos' });
      }

      return res.json(pedidos);
    });
  });
};

exports.updateEstadoPedido = (req, res) => {
  const { id } = req.params;
  const { orderStatus } = req.body;
  const estadosValidos = ['Reservado', 'Entregado'];

  if (!estadosValidos.includes(orderStatus)) {
    return res.status(400).json({ error: 'Estado no vÃ¡lido' });
  }

  getContextoUsuarioNegocio(req, (contextoError, contexto) => {
    if (contextoError) {
      console.error('Error al actualizar estado del pedido:', contextoError);

      if (contextoError.message === 'No hay sesiÃ³n activa.') {
        return res.status(401).json({ error: 'SesiÃ³n no vÃ¡lida' });
      }

      return res.status(500).json({ error: 'Error al actualizar pedido' });
    }

    const query = `
      UPDATE Orders
      SET orderStatus = ?
      WHERE orderID = ? AND businessID = ?
    `;

    db.query(query, [orderStatus, id, contexto.business.businessID], (error, result) => {
      if (error) {
        console.error('Error al actualizar estado del pedido:', error);
        return res.status(500).json({ error: 'Error al actualizar pedido' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Pedido no encontrado' });
      }

      return res.json({ message: 'Estado actualizado correctamente' });
    });
  });
};
