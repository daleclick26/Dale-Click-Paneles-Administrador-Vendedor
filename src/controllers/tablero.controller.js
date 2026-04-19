const db = require('../config/db');

function getDateFilterClause(periodo) {
  switch (periodo) {
    case '7':
      return 'AND o.orderDate >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    case '30':
      return 'AND o.orderDate >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
    case '90':
      return 'AND o.orderDate >= DATE_SUB(NOW(), INTERVAL 90 DAY)';
    default:
      return 'AND o.orderDate >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
  }
}

function mapPeriodoLabel(periodo) {
  switch (periodo) {
    case '7':
      return 'Últimos 7 días';
    case '30':
      return 'Últimos 30 días';
    case '90':
      return 'Últimos 90 días';
    default:
      return 'Últimos 30 días';
  }
}

function getUsuarioSesion(req) {
  return req.session?.usuario || null;
}

function getUsuarioActual(userID, callback) {
  const usuarioQuery = `
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

  db.query(usuarioQuery, [userID], (error, rows) => {
    if (error) return callback(error);
    callback(null, rows[0] || null);
  });
}

function getBusinessIDByUser(userID, callback) {
  const negocioQuery = `
    SELECT businessID
    FROM BusinessProfiles
    WHERE userID = ?
    LIMIT 1
  `;

  db.query(negocioQuery, [userID], (error, rows) => {
    if (error) return callback(error);
    callback(null, rows[0]?.businessID || null);
  });
}

function buildDashboardData(req, periodo, callback) {
  const usuarioSesion = getUsuarioSesion(req);

  if (!usuarioSesion?.userID) {
    return callback(new Error('No hay sesión activa.'));
  }

  const userID = usuarioSesion.userID;
  const filtro = getDateFilterClause(periodo || '30');

  getUsuarioActual(userID, (usuarioError, usuarioActual) => {
    if (usuarioError) return callback(usuarioError);

    if (!usuarioActual) {
      return callback(new Error('Usuario no encontrado.'));
    }

    getBusinessIDByUser(userID, (businessError, businessID) => {
      if (businessError) return callback(businessError);

      if (!businessID) {
        return callback(new Error('El usuario no tiene un negocio asociado.'));
      }

      const productosQuery = `
        SELECT COUNT(*) AS totalProductos
        FROM Products
        WHERE businessID = ?
      `;

      const pedidosEntregadosQuery = `
        SELECT COUNT(*) AS pedidosEntregados
        FROM Orders o
        WHERE o.businessID = ?
          AND o.orderStatus = 'Entregado'
          ${filtro}
      `;

      const ventasNetasQuery = `
        SELECT COALESCE(SUM(od.quantity * od.unitPrice), 0) AS ventasNetas
        FROM Orders o
        INNER JOIN OrderDetails od ON od.orderID = o.orderID
        WHERE o.businessID = ?
          AND o.orderStatus = 'Entregado'
          ${filtro}
      `;

      const totalClientesQuery = `
        SELECT COUNT(DISTINCT o.userID) AS totalClientes
        FROM Orders o
        INNER JOIN Users u ON u.userID = o.userID
        WHERE o.businessID = ?
          AND u.roleID = 1
          ${filtro}
      `;

      const nuevosClientesQuery = `
        SELECT COUNT(*) AS nuevosClientes
        FROM (
          SELECT o.userID, MIN(o.orderDate) AS primeraCompra
          FROM Orders o
          INNER JOIN Users u ON u.userID = o.userID
          WHERE o.businessID = ?
            AND u.roleID = 1
          GROUP BY o.userID
          HAVING primeraCompra >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        ) AS nuevos
      `;

      const ticketPromedioQuery = `
        SELECT COALESCE(AVG(t.totalPedido), 0) AS ticketPromedio
        FROM (
          SELECT o.orderID, SUM(od.quantity * od.unitPrice) AS totalPedido
          FROM Orders o
          INNER JOIN OrderDetails od ON od.orderID = o.orderID
          WHERE o.businessID = ?
            AND o.orderStatus = 'Entregado'
            ${filtro}
          GROUP BY o.orderID
        ) AS t
      `;

      const clientesRecurrentesQuery = `
        SELECT COUNT(*) AS clientesRecurrentes
        FROM (
          SELECT o.userID, COUNT(DISTINCT o.orderID) AS totalPedidos
          FROM Orders o
          INNER JOIN Users u ON u.userID = o.userID
          WHERE o.businessID = ?
            AND u.roleID = 1
            ${filtro}
          GROUP BY o.userID
          HAVING COUNT(DISTINCT o.orderID) >= 2
        ) AS recurrentes
      `;

      const ventasPorMesQuery = `
        SELECT
          DATE_FORMAT(o.orderDate, '%Y-%m') AS mes,
          COALESCE(SUM(od.quantity * od.unitPrice), 0) AS totalVentas
        FROM Orders o
        INNER JOIN OrderDetails od ON od.orderID = o.orderID
        WHERE o.businessID = ?
          AND o.orderStatus = 'Entregado'
          AND o.orderDate >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        GROUP BY DATE_FORMAT(o.orderDate, '%Y-%m')
        ORDER BY mes ASC
      `;

      const pedidosPorEstadoQuery = `
        SELECT
          o.orderStatus,
          COUNT(*) AS total
        FROM Orders o
        WHERE o.businessID = ?
          ${filtro}
        GROUP BY o.orderStatus
        ORDER BY total DESC
      `;

      const clientesResumenQuery = `
        SELECT
          u.userID,
          u.firstName,
          u.lastName,
          COUNT(DISTINCT o.orderID) AS totalPedidos,
          COALESCE(SUM(od.quantity * od.unitPrice), 0) AS gastoTotal,
          MAX(o.orderDate) AS ultimaCompra
        FROM Orders o
        INNER JOIN Users u ON u.userID = o.userID
        INNER JOIN OrderDetails od ON od.orderID = o.orderID
        WHERE o.businessID = ?
          AND u.roleID = 1
          ${filtro}
        GROUP BY u.userID, u.firstName, u.lastName
        ORDER BY gastoTotal DESC
      `;

      db.query(productosQuery, [businessID], (productosError, productosRows) => {
        if (productosError) return callback(productosError);

        db.query(pedidosEntregadosQuery, [businessID], (pedidosError, pedidosRows) => {
          if (pedidosError) return callback(pedidosError);

          db.query(ventasNetasQuery, [businessID], (ventasError, ventasRows) => {
            if (ventasError) return callback(ventasError);

            db.query(totalClientesQuery, [businessID], (clientesError, clientesRows) => {
              if (clientesError) return callback(clientesError);

              db.query(nuevosClientesQuery, [businessID], (nuevosError, nuevosRows) => {
                if (nuevosError) return callback(nuevosError);

                db.query(ticketPromedioQuery, [businessID], (ticketError, ticketRows) => {
                  if (ticketError) return callback(ticketError);

                  db.query(clientesRecurrentesQuery, [businessID], (recurrentesError, recurrentesRows) => {
                    if (recurrentesError) return callback(recurrentesError);

                    db.query(ventasPorMesQuery, [businessID], (ventasMesError, ventasMesRows) => {
                      if (ventasMesError) return callback(ventasMesError);

                      db.query(pedidosPorEstadoQuery, [businessID], (estadoError, estadoRows) => {
                        if (estadoError) return callback(estadoError);

                        db.query(clientesResumenQuery, [businessID], (clientesResumenError, clientesResumenRows) => {
                          if (clientesResumenError) return callback(clientesResumenError);

                          const totalClientes = Number(clientesRows[0]?.totalClientes || 0);
                          const clientesRecurrentes = Number(recurrentesRows[0]?.clientesRecurrentes || 0);

                          callback(null, {
                            usuario: {
                              ...usuarioActual,
                              profileImageURL:
                                usuarioActual.profileImageURL &&
                                String(usuarioActual.profileImageURL).trim() !== ''
                                  ? usuarioActual.profileImageURL
                                  : null
                            },
                            businessID,
                            periodo: periodo || '30',
                            periodoLabel: mapPeriodoLabel(periodo || '30'),
                            resumen: {
                              totalProductos: Number(productosRows[0]?.totalProductos || 0),
                              pedidosEntregados: Number(pedidosRows[0]?.pedidosEntregados || 0),
                              ventasNetas: Number(ventasRows[0]?.ventasNetas || 0),
                              totalClientes,
                              nuevosClientes: Number(nuevosRows[0]?.nuevosClientes || 0),
                              ticketPromedio: Number(ticketRows[0]?.ticketPromedio || 0),
                              clientesRecurrentes,
                              porcentajeRecurrentes:
                                totalClientes > 0
                                  ? Math.round((clientesRecurrentes / totalClientes) * 100)
                                  : 0
                            },
                            charts: {
                              ventasPorMes: ventasMesRows || [],
                              pedidosPorEstado: estadoRows || []
                            },
                            clientesResumen: clientesResumenRows || []
                          });
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
}

function toCSV(rows, headers) {
  const escape = (value) => {
    const stringValue = value === null || value === undefined ? '' : String(value);
    return `"${stringValue.replace(/"/g, '""')}"`;
  };

  const lines = [
    headers.map((h) => escape(h.label)).join(','),
    ...rows.map((row) => headers.map((h) => escape(row[h.key])).join(','))
  ];

  return lines.join('\n');
}

exports.renderTableroPage = (req, res) => {
  const periodo = req.query.periodo || '30';

  buildDashboardData(req, periodo, (error, data) => {
    if (error) {
      console.error('Error al cargar tablero:', error);

      if (error.message === 'No hay sesión activa.') {
        return res.redirect('/login');
      }

      return res.status(500).send('Error al cargar tablero');
    }

    return res.render('emprendedor/tablero', {
      activePage: 'tablero',
      usuario: data.usuario,
      periodo: data.periodo,
      periodoLabel: data.periodoLabel,
      resumen: data.resumen,
      charts: data.charts
    });
  });
};

exports.getDashboardData = (req, res) => {
  const periodo = req.query.periodo || '30';

  buildDashboardData(req, periodo, (error, data) => {
    if (error) {
      console.error('Error al obtener datos del tablero:', error);

      if (error.message === 'No hay sesión activa.') {
        return res.status(401).json({ error: 'Sesión no válida' });
      }

      return res.status(500).json({ error: 'Error al obtener datos del tablero' });
    }

    return res.json(data);
  });
};

exports.exportResumenCSV = (req, res) => {
  const periodo = req.query.periodo || '30';

  buildDashboardData(req, periodo, (error, data) => {
    if (error) {
      console.error('Error al exportar resumen CSV:', error);
      return res.status(500).send('Error al exportar resumen');
    }

    const rows = [{
      periodo: data.periodoLabel,
      totalProductos: data.resumen.totalProductos,
      pedidosEntregados: data.resumen.pedidosEntregados,
      ventasNetas: data.resumen.ventasNetas.toFixed(2),
      totalClientes: data.resumen.totalClientes,
      nuevosClientes: data.resumen.nuevosClientes,
      ticketPromedio: data.resumen.ticketPromedio.toFixed(2),
      clientesRecurrentes: data.resumen.clientesRecurrentes,
      porcentajeRecurrentes: `${data.resumen.porcentajeRecurrentes}%`
    }];

    const csv = toCSV(rows, [
      { key: 'periodo', label: 'Periodo' },
      { key: 'totalProductos', label: 'Productos Totales' },
      { key: 'pedidosEntregados', label: 'Pedidos Entregados' },
      { key: 'ventasNetas', label: 'Ventas Netas' },
      { key: 'totalClientes', label: 'Total Clientes' },
      { key: 'nuevosClientes', label: 'Nuevos Clientes' },
      { key: 'ticketPromedio', label: 'Ticket Promedio' },
      { key: 'clientesRecurrentes', label: 'Clientes Recurrentes' },
      { key: 'porcentajeRecurrentes', label: 'Porcentaje Recurrentes' }
    ]);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="resumen-tablero.csv"');
    return res.send(csv);
  });
};

exports.exportVentasCSV = (req, res) => {
  const periodo = req.query.periodo || '30';

  buildDashboardData(req, periodo, (error, data) => {
    if (error) {
      console.error('Error al exportar ventas CSV:', error);
      return res.status(500).send('Error al exportar ventas');
    }

    const rows = (data.charts.ventasPorMes || []).map((item) => ({
      mes: item.mes,
      totalVentas: Number(item.totalVentas || 0).toFixed(2)
    }));

    const csv = toCSV(rows, [
      { key: 'mes', label: 'Mes' },
      { key: 'totalVentas', label: 'Ventas' }
    ]);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="ventas-por-mes.csv"');
    return res.send(csv);
  });
};

exports.exportClientesCSV = (req, res) => {
  const periodo = req.query.periodo || '30';

  buildDashboardData(req, periodo, (error, data) => {
    if (error) {
      console.error('Error al exportar clientes CSV:', error);
      return res.status(500).send('Error al exportar clientes');
    }

    const rows = (data.clientesResumen || []).map((item) => ({
      cliente: `${item.firstName || ''} ${item.lastName || ''}`.trim(),
      totalPedidos: Number(item.totalPedidos || 0),
      gastoTotal: Number(item.gastoTotal || 0).toFixed(2),
      ultimaCompra: item.ultimaCompra
        ? new Date(item.ultimaCompra).toISOString().split('T')[0]
        : ''
    }));

    const csv = toCSV(rows, [
      { key: 'cliente', label: 'Cliente' },
      { key: 'totalPedidos', label: 'Total Pedidos' },
      { key: 'gastoTotal', label: 'Gasto Total' },
      { key: 'ultimaCompra', label: 'Última Compra' }
    ]);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="clientes-tablero.csv"');
    return res.send(csv);
  });
};