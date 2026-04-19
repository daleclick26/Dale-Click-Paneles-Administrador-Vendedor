const db = require('../config/db');

const USER_ID_TEMPORAL = 2;
const BUSINESS_ID_TEMPORAL = 1;

exports.renderPedidosPage = (req, res) => {
  const businessID = BUSINESS_ID_TEMPORAL;

  const usuarioQuery = `
    SELECT userID, firstName, profileImageURL
    FROM Users
    WHERE userID = ? AND roleID = 2
    LIMIT 1
  `;

  const productosQuery = `
    SELECT DISTINCT
      p.productID,
      p.productName
    FROM Products p
    INNER JOIN OrderDetails od ON od.productID = p.productID
    INNER JOIN Orders o ON o.orderID = od.orderID
    WHERE o.businessID = ?
    ORDER BY p.productName ASC
  `;

  const pedidosQuery = `
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

  db.query(usuarioQuery, [USER_ID_TEMPORAL], (errorUsuario, usuarioRows) => {
    if (errorUsuario) {
      console.error('Error al obtener usuario:', errorUsuario);
      return res.status(500).send('Error al cargar pedidos');
    }

    const usuario = usuarioRows[0] || null;

    db.query(productosQuery, [businessID], (errorProductos, productos) => {
      if (errorProductos) {
        console.error('Error al obtener productos para filtro:', errorProductos);
        return res.status(500).send('Error al cargar pedidos');
      }

      db.query(pedidosQuery, [businessID], (errorPedidos, pedidos) => {
        if (errorPedidos) {
          console.error('Error al obtener pedidos:', errorPedidos);
          return res.status(500).send('Error al cargar pedidos');
        }

        return res.render('emprendedor/pedidos', {
          activePage: 'pedidos',
          usuario,
          productos,
          estados: ['Reservado', 'Entregado'],
          pedidos
        });
      });
    });
  });
};

exports.getProductosFiltro = (req, res) => {
  const businessID = BUSINESS_ID_TEMPORAL;

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

  db.query(query, [businessID], (error, results) => {
    if (error) {
      console.error('Error al obtener productos filtro:', error);
      return res.status(500).json({ error: 'Error al obtener productos' });
    }

    return res.json(results);
  });
};

exports.getEstados = (req, res) => {
  return res.json([
    { value: 'Reservado', label: 'Reservado' },
    { value: 'Entregado', label: 'Entregado' }
  ]);
};

exports.getPedidos = (req, res) => {
  const businessID = BUSINESS_ID_TEMPORAL;

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

  db.query(query, [businessID], (error, results) => {
    if (error) {
      console.error('Error al obtener pedidos:', error);
      return res.status(500).json({ error: 'Error al obtener pedidos' });
    }

    return res.json(results);
  });
};

exports.updateEstadoPedido = (req, res) => {
  const { id } = req.params;
  const { orderStatus } = req.body;
  const businessID = BUSINESS_ID_TEMPORAL;

  const estadosValidos = ['Reservado', 'Entregado'];

  if (!estadosValidos.includes(orderStatus)) {
    return res.status(400).json({ error: 'Estado no válido' });
  }

  const query = `
    UPDATE Orders
    SET orderStatus = ?
    WHERE orderID = ? AND businessID = ?
  `;

  db.query(query, [orderStatus, id, businessID], (error, result) => {
    if (error) {
      console.error('Error al actualizar estado del pedido:', error);
      return res.status(500).json({ error: 'Error al actualizar pedido' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    return res.json({ message: 'Estado actualizado correctamente' });
  });
};