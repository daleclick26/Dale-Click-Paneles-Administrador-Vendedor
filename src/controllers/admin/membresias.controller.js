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

const renderMembresiasAdmin = (req, res) => {
  const usuarioSesion = getUsuarioSesion(req);

  if (!usuarioSesion?.userID) {
    return res.redirect('/login');
  }

  getUsuarioActual(usuarioSesion.userID)
    .then((usuario) => {
      if (!usuario) {
        return res.redirect('/login');
      }

      return res.render('admin/membresias', {
        title: 'Membresías | Dale Click',
        activePage: 'membresias',
        usuario
      });
    })
    .catch((error) => {
      console.error('Error renderMembresiasAdmin:', error);
      res.status(500).send('No se pudo cargar la vista de membresías.');
    });
};

const getMembresiasAdminData = (req, res) => {
  const { search = '' } = req.query;

  let sql = `
    SELECT
      s.subscriptionID,
      bp.businessID,
      bp.businessName,
      u.firstName,
      u.lastName,
      p.planID,
      p.planName,
      p.price,
      s.startDate,
      s.endDate,
      s.status
    FROM Subscriptions s
    INNER JOIN BusinessProfiles bp ON s.businessID = bp.businessID
    INNER JOIN Users u ON bp.userID = u.userID
    INNER JOIN Plans p ON s.planID = p.planID
    WHERE 1 = 1
  `;

  const params = [];

  if (search && search.trim()) {
    sql += `
      AND (
        bp.businessName LIKE ?
        OR u.firstName LIKE ?
        OR u.lastName LIKE ?
        OR p.planName LIKE ?
      )
    `;
    const like = `%${search.trim()}%`;
    params.push(like, like, like, like);
  }

  sql += ` ORDER BY s.subscriptionID DESC`;

  db.query(sql, params, (err, rows) => {
    if (err) {
      console.error('Error getMembresiasAdminData:', err);
      return res.status(500).json({
        ok: false,
        message: 'No se pudieron cargar las membresías.'
      });
    }

    return res.json({
      ok: true,
      data: rows
    });
  });
};

const getMembresiasFormData = (req, res) => {
  const result = {
    negocios: [],
    planes: [],
    productos: []
  };

  const sqlNegocios = `
    SELECT
      bp.businessID,
      bp.businessName,
      CONCAT(u.firstName, ' ', u.lastName) AS ownerName
    FROM BusinessProfiles bp
    INNER JOIN Users u ON bp.userID = u.userID
    ORDER BY bp.businessName ASC
  `;

  const sqlPlanes = `
    SELECT
      planID,
      planName,
      price,
      durationDays,
      featuredAds
    FROM Plans
    ORDER BY planName ASC
  `;

  const sqlProductos = `
    SELECT
      p.productID,
      p.productName,
      bp.businessName
    FROM Products p
    INNER JOIN BusinessProfiles bp ON p.businessID = bp.businessID
    ORDER BY bp.businessName ASC, p.productName ASC
  `;

  db.query(sqlNegocios, (errNegocios, rowsNegocios) => {
    if (errNegocios) {
      console.error('Error cargando negocios:', errNegocios);
      return res.status(500).json({ ok: false, message: 'No se pudieron cargar los negocios.' });
    }

    result.negocios = rowsNegocios || [];

    db.query(sqlPlanes, (errPlanes, rowsPlanes) => {
      if (errPlanes) {
        console.error('Error cargando planes:', errPlanes);
        return res.status(500).json({ ok: false, message: 'No se pudieron cargar los planes.' });
      }

      result.planes = rowsPlanes || [];

      db.query(sqlProductos, (errProductos, rowsProductos) => {
        if (errProductos) {
          console.error('Error cargando productos:', errProductos);
          return res.status(500).json({ ok: false, message: 'No se pudieron cargar los productos.' });
        }

        result.productos = rowsProductos || [];

        return res.json({
          ok: true,
          ...result
        });
      });
    });
  });
};

const createPlanAdmin = (req, res) => {
  const {
    planName,
    price,
    durationDays,
    featuredAds
  } = req.body;

  if (!planName || price === undefined || durationDays === undefined || featuredAds === undefined) {
    return res.status(400).json({
      ok: false,
      message: 'Completa todos los campos del plan.'
    });
  }

  const sql = `
    INSERT INTO Plans (
      planName,
      price,
      durationDays,
      featuredAds
    ) VALUES (?, ?, ?, ?)
  `;

  db.query(
    sql,
    [planName, Number(price), Number(durationDays), Number(featuredAds)],
    (err, result) => {
      if (err) {
        console.error('Error createPlanAdmin:', err);
        return res.status(500).json({
          ok: false,
          message: 'No se pudo crear el plan.'
        });
      }

      return res.status(201).json({
        ok: true,
        message: 'Plan creado correctamente.',
        planID: result.insertId
      });
    }
  );
};

const createDescuentoAdmin = (req, res) => {
  const {
    productID,
    discountType,
    discountValue,
    startDate,
    endDate,
    isActive
  } = req.body;

  if (!productID || !discountType || discountValue === undefined || !startDate || !endDate) {
    return res.status(400).json({
      ok: false,
      message: 'Completa todos los campos del descuento.'
    });
  }

  const sql = `
    INSERT INTO Discounts (
      productID,
      discountType,
      discountValue,
      startDate,
      endDate,
      isActive
    ) VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      productID,
      discountType,
      Number(discountValue),
      startDate,
      endDate,
      String(isActive) === 'false' ? 0 : 1
    ],
    (err, result) => {
      if (err) {
        console.error('Error createDescuentoAdmin:', err);
        return res.status(500).json({
          ok: false,
          message: 'No se pudo crear el descuento.'
        });
      }

      return res.status(201).json({
        ok: true,
        message: 'Descuento creado correctamente.',
        discountID: result.insertId
      });
    }
  );
};

const createSuscripcionAdmin = (req, res) => {
  const {
    businessID,
    planID,
    startDate,
    endDate,
    status
  } = req.body;

  if (!businessID || !planID || !startDate || !endDate || !status) {
    return res.status(400).json({
      ok: false,
      message: 'Completa todos los campos de la suscripción.'
    });
  }

  const sql = `
    INSERT INTO Subscriptions (
      businessID,
      planID,
      startDate,
      endDate,
      status
    ) VALUES (?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [businessID, planID, startDate, endDate, status],
    (err, result) => {
      if (err) {
        console.error('Error createSuscripcionAdmin:', err);
        return res.status(500).json({
          ok: false,
          message: 'No se pudo agregar la suscripción.'
        });
      }

      return res.status(201).json({
        ok: true,
        message: 'Suscripción creada correctamente.',
        subscriptionID: result.insertId
      });
    }
  );
};

const updateSuscripcionAdmin = (req, res) => {
  const { id } = req.params;
  const {
    businessID,
    planID,
    startDate,
    endDate,
    status
  } = req.body;

  if (!businessID || !planID || !startDate || !endDate || !status) {
    return res.status(400).json({
      ok: false,
      message: 'Completa todos los campos de la suscripción.'
    });
  }

  const sql = `
    UPDATE Subscriptions
    SET
      businessID = ?,
      planID = ?,
      startDate = ?,
      endDate = ?,
      status = ?
    WHERE subscriptionID = ?
  `;

  db.query(
    sql,
    [businessID, planID, startDate, endDate, status, id],
    (err) => {
      if (err) {
        console.error('Error updateSuscripcionAdmin:', err);
        return res.status(500).json({
          ok: false,
          message: 'No se pudo actualizar la suscripción.'
        });
      }

      return res.json({
        ok: true,
        message: 'Suscripción actualizada correctamente.'
      });
    }
  );
};

const deleteSuscripcionAdmin = (req, res) => {
  const { id } = req.params;

  db.query(
    `DELETE FROM Subscriptions WHERE subscriptionID = ?`,
    [id],
    (err) => {
      if (err) {
        console.error('Error deleteSuscripcionAdmin:', err);
        return res.status(500).json({
          ok: false,
          message: 'No se pudo eliminar la suscripción.'
        });
      }

      return res.json({
        ok: true,
        message: 'Suscripción eliminada correctamente.'
      });
    }
  );
};

module.exports = {
  renderMembresiasAdmin,
  getMembresiasAdminData,
  getMembresiasFormData,
  createPlanAdmin,
  createDescuentoAdmin,
  createSuscripcionAdmin,
  updateSuscripcionAdmin,
  deleteSuscripcionAdmin
};