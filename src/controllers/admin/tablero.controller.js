const db = require('../../config/db');

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function getUsuarioSesion(req) {
  return req.session?.usuario || null;
}

async function getUsuarioActual(userID) {
  const rows = await query(
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
    [userID]
  );

  if (!rows[0]) {
    return null;
  }

  return {
    ...rows[0],
    profileImageURL:
      rows[0].profileImageURL && String(rows[0].profileImageURL).trim() !== ''
        ? rows[0].profileImageURL
        : null
  };
}

async function getNotificacionesAdmin() {
  const [pedidosRows, usuariosRows] = await Promise.all([
    query(
      `
        SELECT
          o.orderID,
          o.orderStatus
        FROM Orders o
        ORDER BY o.orderDate DESC, o.orderID DESC
        LIMIT 4
      `
    ),
    query(
      `
        SELECT
          u.userID,
          u.firstName,
          u.roleID
        FROM Users u
        WHERE u.roleID IN (1, 2)
        ORDER BY u.userID DESC
        LIMIT 4
      `
    )
  ]);

  const notificaciones = [];

  pedidosRows.forEach((pedido) => {
    notificaciones.push({
      tipo: 'pedido',
      texto: `Pedido #${pedido.orderID} - ${pedido.orderStatus || 'Sin estado'}`
    });
  });

  usuariosRows.forEach((usuario) => {
    const rol = Number(usuario.roleID) === 2 ? 'Emprendedor' : 'Cliente';
    notificaciones.push({
      tipo: 'usuario',
      texto: `${rol} registrado: ${usuario.firstName || `Usuario #${usuario.userID}`}`
    });
  });

  return notificaciones.slice(0, 6);
}

function getPeriodoValido(periodo) {
  const n = Number(periodo);
  if ([7, 30, 60].includes(n)) return n;
  return 7;
}

function getFechaInicio(periodo) {
  const fecha = new Date();
  fecha.setHours(0, 0, 0, 0);
  fecha.setDate(fecha.getDate() - periodo);

  const yyyy = fecha.getFullYear();
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  const dd = String(fecha.getDate()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd} 00:00:00`;
}

function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
}

function buildCsv(headers, rows) {
  const headerLine = headers.map(escapeCsv).join(',');
  const lines = rows.map(row => row.map(escapeCsv).join(','));
  return [headerLine, ...lines].join('\n');
}

async function getDashboardData(periodo) {
  const fechaInicio = getFechaInicio(periodo);

  const [
    totalClientesRows,
    totalEmprendedoresRows,
    totalCategoriasRows,
    totalProductosRows,
    topNegociosRows,
    topProductosRows
  ] = await Promise.all([
    query(`
      SELECT COUNT(*) AS total
      FROM Users
      WHERE roleID = 1
    `),
    query(`
      SELECT COUNT(*) AS total
      FROM Users
      WHERE roleID = 2
    `),
    query(`
      SELECT COUNT(*) AS total
      FROM Categories
    `),
    query(`
      SELECT COUNT(*) AS total
      FROM Products
    `),
    query(`
      SELECT 
        bp.businessID,
        bp.businessName,
        COUNT(o.orderID) AS totalPedidos
      FROM BusinessProfiles bp
      LEFT JOIN Orders o
        ON o.businessID = bp.businessID
       AND o.orderDate >= ?
      GROUP BY bp.businessID, bp.businessName
      ORDER BY totalPedidos DESC, bp.businessName ASC
      LIMIT 8
    `, [fechaInicio]),
    query(`
      SELECT 
        p.productID,
        p.productName,
        COALESCE(SUM(od.quantity), 0) AS totalVendido
      FROM Products p
      INNER JOIN OrderDetails od
        ON od.productID = p.productID
      INNER JOIN Orders o
        ON o.orderID = od.orderID
      WHERE o.orderDate >= ?
      GROUP BY p.productID, p.productName
      ORDER BY totalVendido DESC, p.productName ASC
      LIMIT 8
    `, [fechaInicio])
  ]);

  return {
    periodo,
    fechaInicio,
    kpis: {
      totalClientes: totalClientesRows[0] ? totalClientesRows[0].total : 0,
      totalEmprendedores: totalEmprendedoresRows[0] ? totalEmprendedoresRows[0].total : 0,
      totalCategorias: totalCategoriasRows[0] ? totalCategoriasRows[0].total : 0,
      totalProductos: totalProductosRows[0] ? totalProductosRows[0].total : 0
    },
    topNegocios: topNegociosRows,
    topProductos: topProductosRows
  };
}

async function renderTableroAdmin(req, res) {
  try {
    const usuarioSesion = getUsuarioSesion(req);

    if (!usuarioSesion?.userID) {
      return res.redirect('/login');
    }

    const periodo = getPeriodoValido(req.query.periodo);
    const [data, usuario] = await Promise.all([
      getDashboardData(periodo),
      getUsuarioActual(usuarioSesion.userID)
    ]);

    if (!usuario) {
      return res.redirect('/login');
    }

    res.render('admin/tablero', {
      title: 'Tablero Admin | Dale Click',
      activePage: 'tablero',
      usuario,
      periodo: data.periodo,
      kpis: data.kpis,
      topNegocios: data.topNegocios,
      topProductos: data.topProductos,
      negociosLabels: JSON.stringify(
        data.topNegocios.map(item => item.businessName || ('Negocio #' + item.businessID))
      ),
      negociosValues: JSON.stringify(
        data.topNegocios.map(item => Number(item.totalPedidos || 0))
      ),
      productosLabels: JSON.stringify(
        data.topProductos.map(item => item.productName || ('Producto #' + item.productID))
      ),
      productosValues: JSON.stringify(
        data.topProductos.map(item => Number(item.totalVendido || 0))
      )
    });
  } catch (error) {
    console.error('Error cargando tablero admin:', error);
    res.status(500).send('Error al cargar el tablero de administrador');
  }
}

async function exportTableroCsv(req, res) {
  try {
    const periodo = getPeriodoValido(req.query.periodo);
    const tipo = String(req.params.tipo || '').trim().toLowerCase();
    const data = await getDashboardData(periodo);

    let filename = `dashboard-admin-${tipo}-${periodo}dias.csv`;
    let csv = '';

    if (tipo === 'clientes') {
      csv = buildCsv(
        ['Metrica', 'Valor', 'Periodo'],
        [['Total clientes', data.kpis.totalClientes, `${periodo} dias`]]
      );
    } else if (tipo === 'emprendedores') {
      csv = buildCsv(
        ['Metrica', 'Valor', 'Periodo'],
        [['Total emprendedores', data.kpis.totalEmprendedores, `${periodo} dias`]]
      );
    } else if (tipo === 'categorias') {
      csv = buildCsv(
        ['Metrica', 'Valor', 'Periodo'],
        [['Total categorias', data.kpis.totalCategorias, `${periodo} dias`]]
      );
    } else if (tipo === 'productos') {
      csv = buildCsv(
        ['Metrica', 'Valor', 'Periodo'],
        [['Total productos', data.kpis.totalProductos, `${periodo} dias`]]
      );
    } else if (tipo === 'top-negocios') {
      csv = buildCsv(
        ['BusinessID', 'Negocio', 'Pedidos en el periodo'],
        data.topNegocios.map(item => [
          item.businessID,
          item.businessName,
          item.totalPedidos
        ])
      );
    } else if (tipo === 'top-productos') {
      csv = buildCsv(
        ['ProductID', 'Producto', 'Cantidad vendida'],
        data.topProductos.map(item => [
          item.productID,
          item.productName,
          item.totalVendido
        ])
      );
    } else {
      return res.status(404).send('Tipo de exportación no válido');
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv);
  } catch (error) {
    console.error('Error exportando CSV admin:', error);
    res.status(500).send('Error al exportar CSV');
  }
}

async function getTopbarNotificacionesAdmin(req, res) {
  try {
    const usuarioSesion = getUsuarioSesion(req);

    if (!usuarioSesion?.userID) {
      return res.status(401).json({ error: 'Sesión no válida' });
    }

    const usuario = await getUsuarioActual(usuarioSesion.userID);

    if (!usuario || Number(usuario.roleID) !== 3) {
      return res.status(403).json({ error: 'Acceso no autorizado' });
    }

    const notificaciones = await getNotificacionesAdmin();
    return res.json(notificaciones);
  } catch (error) {
    console.error('Error obteniendo notificaciones admin:', error);
    return res.status(500).json({ error: 'Error al obtener notificaciones' });
  }
}

module.exports = {
  renderTableroAdmin,
  exportTableroCsv,
  getTopbarNotificacionesAdmin
};
