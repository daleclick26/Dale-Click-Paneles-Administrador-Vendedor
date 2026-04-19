const db = require('../../config/db');

function getUsuarioSesion(req) {
  return req.session?.usuario || null;
}

function getUsuarioActual(userID) {
  return new Promise((resolve, reject) => {
    db.query(
      `
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
      `,
      [userID],
      (err, rows) => {
        if (err) return reject(err);

        if (!rows[0]) {
          return resolve(null);
        }

        resolve({
          ...rows[0],
          profileImageURL:
            rows[0].profileImageURL && String(rows[0].profileImageURL).trim() !== ''
              ? rows[0].profileImageURL
              : null
        });
      }
    );
  });
}

const renderReportesAdmin = (req, res) => {
  const usuarioSesion = getUsuarioSesion(req);

  if (!usuarioSesion?.userID) {
    return res.redirect('/login');
  }

  getUsuarioActual(usuarioSesion.userID)
    .then((usuario) => {
      if (!usuario) {
        return res.redirect('/login');
      }

      return res.render('admin/reportes', {
        title: 'Reportes | Dale Click',
        activePage: 'reportes',
        usuario
      });
    })
    .catch((error) => {
      console.error('Error renderReportesAdmin:', error);
      res.status(500).send('No se pudo cargar la vista de reportes.');
    });
};

const getReportesAdminData = (req, res) => {
  const {
    search = '',
    departamento = '',
    ciudad = ''
  } = req.query;

  let sql = `
    SELECT
      o.orderID,
      bp.businessName,
      bp.department,
      bp.city,
      u.firstName,
      u.lastName,
      DATE_FORMAT(o.orderDate, '%Y-%m-%d %H:%i:%s') AS orderDate,
      o.orderStatus,
      p.productName,
      od.quantity,
      od.unitPrice,
      o.totalAmount
    FROM Orders o
    INNER JOIN Users u ON o.userID = u.userID
    INNER JOIN BusinessProfiles bp ON o.businessID = bp.businessID
    INNER JOIN OrderDetails od ON o.orderID = od.orderID
    INNER JOIN Products p ON od.productID = p.productID
    WHERE u.roleID = 1
  `;

  const params = [];

  if (search.trim()) {
    sql += `
      AND (
        bp.businessName LIKE ?
        OR u.firstName LIKE ?
        OR u.lastName LIKE ?
      )
    `;
    const like = `%${search.trim()}%`;
    params.push(like, like, like);
  }

  if (departamento.trim()) {
    sql += ` AND bp.department LIKE ?`;
    params.push(`%${departamento.trim()}%`);
  }

  if (ciudad.trim()) {
    sql += ` AND bp.city LIKE ?`;
    params.push(`%${ciudad.trim()}%`);
  }

  sql += ` ORDER BY o.orderDate DESC, o.orderID DESC`;

  db.query(sql, params, (err, rows) => {
    if (err) {
      console.error('Error getReportesAdminData:', err);
      return res.status(500).json({
        ok: false,
        message: 'No se pudieron cargar los reportes.'
      });
    }

    return res.json({
      ok: true,
      data: rows
    });
  });
};

const getDetallesOrdenAdminData = (req, res) => {
  const {
    search = '',
    departamento = '',
    ciudad = ''
  } = req.query;

  let sql = `
    SELECT
      od.orderDetailID,
      od.orderID,
      p.productName,
      od.quantity,
      od.unitPrice,
      bp.businessName,
      bp.department,
      bp.city,
      u.firstName,
      u.lastName
    FROM OrderDetails od
    INNER JOIN Orders o ON od.orderID = o.orderID
    INNER JOIN Products p ON od.productID = p.productID
    INNER JOIN BusinessProfiles bp ON o.businessID = bp.businessID
    INNER JOIN Users u ON o.userID = u.userID
    WHERE u.roleID = 1
  `;

  const params = [];

  if (search.trim()) {
    sql += `
      AND (
        bp.businessName LIKE ?
        OR u.firstName LIKE ?
        OR u.lastName LIKE ?
      )
    `;
    const like = `%${search.trim()}%`;
    params.push(like, like, like);
  }

  if (departamento.trim()) {
    sql += ` AND bp.department LIKE ?`;
    params.push(`%${departamento.trim()}%`);
  }

  if (ciudad.trim()) {
    sql += ` AND bp.city LIKE ?`;
    params.push(`%${ciudad.trim()}%`);
  }

  sql += ` ORDER BY od.orderDetailID DESC`;

  db.query(sql, params, (err, rows) => {
    if (err) {
      console.error('Error getDetallesOrdenAdminData:', err);
      return res.status(500).json({
        ok: false,
        message: 'No se pudieron cargar los detalles de orden.'
      });
    }

    return res.json({
      ok: true,
      data: rows
    });
  });
};

function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
}

const exportReportesCsv = (req, res) => {
  const dias = Number(req.params.dias);

  if (![7, 30, 60].includes(dias)) {
    return res.status(400).json({
      ok: false,
      message: 'El rango permitido es 7, 30 o 60 días.'
    });
  }

  const sqlOrdenes = `
    SELECT
      o.orderID,
      u.firstName,
      u.lastName,
      bp.businessName,
      DATE_FORMAT(o.orderDate, '%Y-%m-%d %H:%i:%s') AS orderDate,
      o.orderStatus,
      p.productName,
      od.quantity,
      od.unitPrice,
      o.totalAmount
    FROM Orders o
    INNER JOIN Users u ON o.userID = u.userID
    INNER JOIN BusinessProfiles bp ON o.businessID = bp.businessID
    INNER JOIN OrderDetails od ON o.orderID = od.orderID
    INNER JOIN Products p ON od.productID = p.productID
    WHERE u.roleID = 1
      AND o.orderDate >= DATE_SUB(NOW(), INTERVAL ? DAY)
    ORDER BY o.orderDate DESC, o.orderID DESC
  `;

  const sqlDetalles = `
    SELECT
      od.orderDetailID,
      od.orderID,
      p.productName,
      od.quantity,
      od.unitPrice
    FROM OrderDetails od
    INNER JOIN Orders o ON od.orderID = o.orderID
    INNER JOIN Products p ON od.productID = p.productID
    WHERE o.orderDate >= DATE_SUB(NOW(), INTERVAL ? DAY)
    ORDER BY od.orderDetailID DESC
  `;

  db.query(sqlOrdenes, [dias], (errOrdenes, rowsOrdenes) => {
    if (errOrdenes) {
      console.error('Error exportReportesCsv ordenes:', errOrdenes);
      return res.status(500).json({
        ok: false,
        message: 'No se pudo exportar el CSV de órdenes.'
      });
    }

    db.query(sqlDetalles, [dias], (errDetalles, rowsDetalles) => {
      if (errDetalles) {
        console.error('Error exportReportesCsv detalles:', errDetalles);
        return res.status(500).json({
          ok: false,
          message: 'No se pudo exportar el CSV de detalles.'
        });
      }

      const lineas = [];

      lineas.push('TABLA ÓRDENES');
      lineas.push([
        'OrdenID',
        'Nombre',
        'Apellido',
        'Negocio',
        'Fecha',
        'Estado',
        'Producto',
        'Cantidad',
        'Precio Unitario',
        'Total'
      ].join(','));

      rowsOrdenes.forEach((row) => {
        lineas.push([
          escapeCsv(row.orderID),
          escapeCsv(row.firstName),
          escapeCsv(row.lastName),
          escapeCsv(row.businessName),
          escapeCsv(row.orderDate),
          escapeCsv(row.orderStatus),
          escapeCsv(row.productName),
          escapeCsv(row.quantity),
          escapeCsv(row.unitPrice),
          escapeCsv(row.totalAmount)
        ].join(','));
      });

      lineas.push('');
      lineas.push('TABLA DETALLES DE ORDEN');
      lineas.push([
        'OrderDetailID',
        'OrderID',
        'Producto',
        'Cantidad',
        'Precio Unitario'
      ].join(','));

      rowsDetalles.forEach((row) => {
        lineas.push([
          escapeCsv(row.orderDetailID),
          escapeCsv(row.orderID),
          escapeCsv(row.productName),
          escapeCsv(row.quantity),
          escapeCsv(row.unitPrice)
        ].join(','));
      });

      const csv = lineas.join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="reportes_${dias}dias.csv"`
      );

      return res.send('\uFEFF' + csv);
    });
  });
};

module.exports = {
  renderReportesAdmin,
  getReportesAdminData,
  getDetallesOrdenAdminData,
  exportReportesCsv
};