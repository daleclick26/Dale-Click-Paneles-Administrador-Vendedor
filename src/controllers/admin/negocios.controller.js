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

const renderNegociosAdmin = (req, res) => {
  const usuarioSesion = getUsuarioSesion(req);

  if (!usuarioSesion?.userID) {
    return res.redirect('/login');
  }

  getUsuarioActual(usuarioSesion.userID)
    .then((usuario) => {
      if (!usuario) {
        return res.redirect('/login');
      }

      return res.render('admin/negocios', {
        title: 'Negocios | Dale Click',
        activePage: 'negocios',
        usuario
      });
    })
    .catch((error) => {
      console.error('Error renderNegociosAdmin:', error);
      res.status(500).send('No se pudo cargar la vista de negocios.');
    });
};

const getNegociosAdminData = (req, res) => {
  const { search = '', tipo = '', departamento = '', ciudad = '' } = req.query;

  let sql = `
    SELECT 
      bp.businessID,
      bp.businessName,
      bp.logoURL,
      bp.department,
      bp.city,
      bp.contactPhone,
      bp.contactEmail,
      u.roleID,
      sp.studentProfileID,
      uni.universityName,
      CASE 
        WHEN u.roleID = 2 AND sp.studentProfileID IS NOT NULL THEN 'Universidad'
        WHEN u.roleID = 2 AND sp.studentProfileID IS NULL THEN 'Negocio Local'
      END AS tipoUsuario,
      CASE 
        WHEN sp.studentProfileID IS NOT NULL THEN uni.universityName
        ELSE 'Negocio Local'
      END AS universidad
    FROM BusinessProfiles bp
    JOIN Users u ON bp.userID = u.userID
    LEFT JOIN StudentProfiles sp ON u.userID = sp.userID
    LEFT JOIN Universities uni ON sp.universityID = uni.universityID
    WHERE 1=1
      AND u.roleID = 2
  `;

  const params = [];

  if (search) {
    sql += ` AND (bp.businessName LIKE ? OR uni.universityName LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }

  if (tipo) {
    sql += ` AND (
      CASE 
        WHEN u.roleID = 2 AND sp.studentProfileID IS NOT NULL THEN 'Universidad'
        WHEN u.roleID = 2 AND sp.studentProfileID IS NULL THEN 'Negocio Local'
      END = ?
    )`;
    params.push(tipo);
  }

  if (departamento) {
    sql += ` AND bp.department = ?`;
    params.push(departamento);
  }

  if (ciudad) {
    sql += ` AND bp.city = ?`;
    params.push(ciudad);
  }

  sql += ` ORDER BY bp.businessID DESC`;

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('Error getNegociosAdminData:', err);
      return res.status(500).json({ ok: false, message: 'No se pudieron cargar los negocios.' });
    }

    res.json(results);
  });
};

const getNegociosFormData = (req, res) => {
  const response = {
    usuarios: [],
    categorias: []
  };

  const sqlUsuarios = `
    SELECT 
      u.userID,
      CONCAT(u.firstName, ' ', u.lastName, ' - ', u.email) AS nombre
    FROM Users u
    LEFT JOIN BusinessProfiles bp ON bp.userID = u.userID
    WHERE u.roleID = 2
      AND bp.businessID IS NULL
    ORDER BY u.firstName ASC, u.lastName ASC
  `;

  const sqlCategorias = `
    SELECT
      categoryID,
      categoryName
    FROM Categories
    ORDER BY categoryName ASC
  `;

  db.query(sqlUsuarios, (errUsuarios, rowsUsuarios) => {
    if (errUsuarios) {
      console.error('Error getNegociosFormData usuarios:', errUsuarios);
      return res.status(500).json({ ok: false, message: 'No se pudieron cargar los usuarios.' });
    }

    response.usuarios = rowsUsuarios || [];

    db.query(sqlCategorias, (errCategorias, rowsCategorias) => {
      if (errCategorias) {
        console.error('Error getNegociosFormData categorías:', errCategorias);
        return res.status(500).json({ ok: false, message: 'No se pudieron cargar las categorías.' });
      }

      response.categorias = rowsCategorias || [];
      return res.json({ ok: true, ...response });
    });
  });
};

const createNegocioAdmin = (req, res) => {
  const {
    userID,
    categoryID,
    businessName,
    description,
    logoURL,
    department,
    city,
    addressLine,
    referenceNote,
    contactPhone,
    contactEmail,
    instagram,
    facebook,
    tiktok,
    status
  } = req.body;

  if (
    !userID ||
    !categoryID ||
    !businessName ||
    !department ||
    !city ||
    !addressLine ||
    !contactPhone ||
    !contactEmail ||
    !status
  ) {
    return res.status(400).json({
      ok: false,
      message: 'Completa los campos obligatorios del negocio.'
    });
  }

  const sqlCheck = `
    SELECT businessID
    FROM BusinessProfiles
    WHERE userID = ?
    LIMIT 1
  `;

  db.query(sqlCheck, [userID], (errCheck, rowsCheck) => {
    if (errCheck) {
      console.error('Error validando negocio existente:', errCheck);
      return res.status(500).json({ ok: false, message: 'Error validando negocio.' });
    }

    if (rowsCheck.length > 0) {
      return res.status(400).json({
        ok: false,
        message: 'Ese usuario ya tiene un negocio registrado.'
      });
    }

    const sqlInsert = `
      INSERT INTO BusinessProfiles (
        userID,
        categoryID,
        businessName,
        description,
        logoURL,
        department,
        city,
        addressLine,
        referenceNote,
        contactPhone,
        contactEmail,
        instagram,
        facebook,
        tiktok,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      userID,
      categoryID,
      businessName,
      description || null,
      logoURL || null,
      department,
      city,
      addressLine,
      referenceNote || null,
      contactPhone,
      contactEmail,
      instagram || null,
      facebook || null,
      tiktok || null,
      status
    ];

    db.query(sqlInsert, params, (errInsert, result) => {
      if (errInsert) {
        console.error('Error createNegocioAdmin:', errInsert);
        return res.status(500).json({
          ok: false,
          message: 'No se pudo crear el negocio.'
        });
      }

      return res.status(201).json({
        ok: true,
        message: 'Negocio creado correctamente.',
        businessID: result.insertId
      });
    });
  });
};

const createUniversidadAdmin = (req, res) => {
  const {
    universityName,
    department,
    city,
    addressLine,
    referenceNote,
    logoURL
  } = req.body;

  if (!universityName || !department || !city || !addressLine) {
    return res.status(400).json({
      ok: false,
      message: 'Completa los campos obligatorios de la universidad.'
    });
  }

  const sqlInsert = `
    INSERT INTO Universities (
      universityName,
      department,
      city,
      addressLine,
      referenceNote,
      logoURL
    ) VALUES (?, ?, ?, ?, ?, ?)
  `;

  const params = [
    universityName,
    department,
    city,
    addressLine,
    referenceNote || null,
    logoURL || null
  ];

  db.query(sqlInsert, params, (errInsert, result) => {
    if (errInsert) {
      console.error('Error createUniversidadAdmin:', errInsert);
      return res.status(500).json({
        ok: false,
        message: 'No se pudo agregar la universidad.'
      });
    }

    return res.status(201).json({
      ok: true,
      message: 'Universidad agregada correctamente.',
      universityID: result.insertId
    });
  });
};

const getUniversidadesAdmin = (req, res) => {
  const sql = `
    SELECT
      universityID,
      universityName
    FROM Universities
    ORDER BY universityName ASC
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error('Error getUniversidadesAdmin:', err);
      return res.status(500).json({ ok: false, message: 'No se pudieron cargar las universidades.' });
    }

    return res.json(rows);
  });
};

const getUniversidadById = (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT
      universityID,
      universityName,
      department,
      city,
      addressLine,
      referenceNote,
      logoURL
    FROM Universities
    WHERE universityID = ?
    LIMIT 1
  `;

  db.query(sql, [id], (err, rows) => {
    if (err) {
      console.error('Error getUniversidadById:', err);
      return res.status(500).json({ ok: false, message: 'No se pudo obtener la universidad.' });
    }

    if (!rows[0]) {
      return res.status(404).json({ ok: false, message: 'Universidad no encontrada.' });
    }

    return res.json({ ok: true, university: rows[0] });
  });
};

const updateUniversidadAdmin = (req, res) => {
  const { id } = req.params;
  const { universityName, department, city, addressLine, referenceNote, logoURL } = req.body;

  if (!universityName || !department || !city || !addressLine) {
    return res.status(400).json({ ok: false, message: 'Completa los campos obligatorios de la universidad.' });
  }

  const sqlUpdate = `
    UPDATE Universities SET
      universityName = ?,
      department = ?,
      city = ?,
      addressLine = ?,
      referenceNote = ?,
      logoURL = ?
    WHERE universityID = ?
  `;

  const params = [universityName, department, city, addressLine, referenceNote || null, logoURL || null, id];

  db.query(sqlUpdate, params, (errUpdate, result) => {
    if (errUpdate) {
      console.error('Error updateUniversidadAdmin:', errUpdate);
      return res.status(500).json({ ok: false, message: 'No se pudo actualizar la universidad.' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, message: 'Universidad no encontrada.' });
    }

    return res.json({ ok: true, message: 'Universidad actualizada correctamente.' });
  });
};

module.exports = {
  renderNegociosAdmin,
  getNegociosAdminData,
  getNegociosFormData,
  createNegocioAdmin,
  createUniversidadAdmin,
  getUniversidadesAdmin,
  getUniversidadById,
  updateUniversidadAdmin
};
