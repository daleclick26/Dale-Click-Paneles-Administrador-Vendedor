const db = require('../config/db');
const transporter = require('../config/mailer');

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
      businessName,
      contactEmail
    FROM BusinessProfiles
    WHERE userID = ?
    LIMIT 1
  `;

  db.query(query, [userID], (error, rows) => {
    if (error) return callback(error);
    callback(null, rows[0] || null);
  });
}

function formatDateToISO(dateValue) {
  if (!dateValue) return null;

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString().split('T')[0];
}

function calcularSegmento(totalPedidos, ultimaCompra) {
  if (!ultimaCompra) return 'At-Risk';

  const fechaCompra = new Date(ultimaCompra);
  const hoy = new Date();
  const diferenciaDias = Math.floor((hoy - fechaCompra) / (1000 * 60 * 60 * 24));

  if (Number(totalPedidos) <= 1) {
    return 'Nuevo';
  }

  if (diferenciaDias <= 60) {
    return 'Activo';
  }

  return 'At-Risk';
}

function transformarClientes(rows) {
  return rows.map((cliente) => {
    const totalPedidos = Number(cliente.totalPedidos || 0);
    const gastoTotal = Number(cliente.gastoTotal || 0);
    const ultimaCompraISO = formatDateToISO(cliente.ultimaCompra);
    const segmento = calcularSegmento(totalPedidos, cliente.ultimaCompra);

    return {
      userID: cliente.userID,
      clientCode: `CL${String(cliente.userID).padStart(4, '0')}`,
      firstName: cliente.firstName,
      lastName: cliente.lastName,
      email: cliente.email,
      phone: cliente.phone,
      totalPedidos,
      gastoTotal,
      ultimaCompra: ultimaCompraISO,
      segmento
    };
  });
}

function getClientesByBusiness(businessID, callback) {
  const query = `
    SELECT
      u.userID,
      u.firstName,
      u.lastName,
      u.email,
      u.phone,
      COUNT(DISTINCT o.orderID) AS totalPedidos,
      COALESCE(SUM(od.quantity * od.unitPrice), 0) AS gastoTotal,
      MAX(o.orderDate) AS ultimaCompra
    FROM Orders o
    INNER JOIN Users u ON u.userID = o.userID
    INNER JOIN OrderDetails od ON od.orderID = o.orderID
    WHERE o.businessID = ?
      AND u.roleID = 1
    GROUP BY
      u.userID,
      u.firstName,
      u.lastName,
      u.email,
      u.phone
    ORDER BY MAX(o.orderDate) DESC, u.firstName ASC, u.lastName ASC
  `;

  db.query(query, [businessID], (error, rows) => {
    if (error) return callback(error);
    callback(null, transformarClientes(rows));
  });
}

function getContextoCliente(req, callback) {
  const usuarioSesion = getUsuarioSesion(req);

  if (!usuarioSesion?.userID) {
    return callback(new Error('No hay sesión activa.'));
  }

  getUsuarioActual(usuarioSesion.userID, (usuarioError, usuario) => {
    if (usuarioError) return callback(usuarioError);

    if (!usuario) {
      return callback(new Error('Usuario no encontrado.'));
    }

    getBusinessByUser(usuario.userID, (businessError, business) => {
      if (businessError) return callback(businessError);

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

exports.renderClientesPage = (req, res) => {
  getContextoCliente(req, (contextoError, contexto) => {
    if (contextoError) {
      console.error('Error al cargar clientes:', contextoError);

      if (contextoError.message === 'No hay sesión activa.') {
        return res.redirect('/login');
      }

      return res.status(500).send('Error al cargar clientes');
    }

    getClientesByBusiness(contexto.business.businessID, (error, clientes) => {
      if (error) {
        console.error('Error al obtener clientes:', error);
        return res.status(500).send('Error al cargar clientes');
      }

      return res.render('emprendedor/clientes', {
        activePage: 'clientes',
        usuario: contexto.usuario,
        clientes,
        segmentos: ['Activo', 'Nuevo', 'At-Risk'],
        rangosFecha: [
          { value: '30', label: 'Últimos 30 días' },
          { value: '60', label: 'Últimos 60 días' },
          { value: '90', label: 'Últimos 90 días' }
        ],
        ordenes: [
          { value: 'gasto-desc', label: 'Gasto total (mayor a menor)' },
          { value: 'gasto-asc', label: 'Gasto total (menor a mayor)' },
          { value: 'pedidos-desc', label: 'Pedidos (mayor a menor)' },
          { value: 'fecha-desc', label: 'Última compra (más reciente)' },
          { value: 'fecha-asc', label: 'Última compra (más antigua)' }
        ]
      });
    });
  });
};

exports.getClientes = (req, res) => {
  getContextoCliente(req, (contextoError, contexto) => {
    if (contextoError) {
      console.error('Error al obtener contexto de clientes:', contextoError);

      if (contextoError.message === 'No hay sesión activa.') {
        return res.status(401).json({ error: 'Sesión no válida' });
      }

      return res.status(500).json({ error: 'Error al obtener clientes' });
    }

    getClientesByBusiness(contexto.business.businessID, (error, clientes) => {
      if (error) {
        console.error('Error al obtener clientes:', error);
        return res.status(500).json({ error: 'Error al obtener clientes' });
      }

      return res.json(clientes);
    });
  });
};

exports.getSegmentos = (req, res) => {
  return res.json([
    { value: 'Activo', label: 'Activo' },
    { value: 'Nuevo', label: 'Nuevo' },
    { value: 'At-Risk', label: 'At-Risk' }
  ]);
};

exports.contactarCliente = async (req, res) => {
  const { clientEmail, subject, message } = req.body;

  if (!clientEmail || !subject || !message) {
    return res.status(400).json({ error: 'Faltan datos para enviar el correo' });
  }

  const usuarioSesion = getUsuarioSesion(req);

  if (!usuarioSesion?.userID) {
    return res.status(401).json({ error: 'Sesión no válida' });
  }

  getBusinessByUser(usuarioSesion.userID, async (businessError, negocio) => {
    if (businessError) {
      console.error(businessError);
      return res.status(500).json({ error: 'Error al obtener datos del negocio' });
    }

    if (!negocio) {
      return res.status(404).json({ error: 'Negocio no encontrado' });
    }

    const sellerEmail = negocio.contactEmail;
    const businessName = negocio.businessName;

    try {
      await transporter.sendMail({
        from: `"Dale Click" <${process.env.EMAIL_USER}>`,
        to: clientEmail,
        replyTo: sellerEmail,
        subject,
        text: message,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.5;">
            <h2>Mensaje de ${businessName}</h2>
            <p><strong>Negocio:</strong> ${businessName}</p>
            <p><strong>Correo del negocio:</strong> ${sellerEmail}</p>
            <hr>
            <p>${message.replace(/\n/g, '<br>')}</p>
            <hr>
            <p style="font-size: 0.9rem; color: #666;">
              Este mensaje fue enviado a través de Dale Click.
              Puedes responder directamente a este correo para contactar al negocio.
            </p>
          </div>
        `
      });

      return res.json({ message: 'Correo enviado correctamente.' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'No se pudo enviar el correo.' });
    }
  });
};