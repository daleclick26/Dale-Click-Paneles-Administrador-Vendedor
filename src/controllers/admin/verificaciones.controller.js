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

const renderVerificacionesAdmin = (req, res) => {
  const usuarioSesion = getUsuarioSesion(req);

  if (!usuarioSesion?.userID) {
    return res.redirect('/login');
  }

  getUsuarioActual(usuarioSesion.userID)
    .then((usuario) => {
      if (!usuario) {
        return res.redirect('/login');
      }

      return res.render('admin/verificaciones', {
        title: 'Verificaciones | Dale Click',
        activePage: 'verificaciones',
        usuario
      });
    })
    .catch((error) => {
      console.error('Error renderVerificacionesAdmin:', error);
      res.status(500).send('No se pudo cargar la vista de verificaciones.');
    });
};

const getVerificacionesAdminData = (req, res) => {
  const { search = '', tipoUsuario = '' } = req.query;

  let sql = `
    SELECT
      iv.verificationID,
      u.userID,
      u.firstName,
      u.lastName,
      u.nationalID,
      u.roleID,
      iv.documentType,
      iv.documentNumber,
      iv.verificationStatus,
      iv.submittedAt,
      iv.verifiedAt,
      CASE
        WHEN u.roleID = 1 THEN 'Cliente'
        WHEN u.roleID = 2 THEN 'Emprendedor'
        WHEN u.roleID = 3 THEN 'Administrador'
        ELSE 'Sin rol'
      END AS tipoUsuario
    FROM IdentityVerificators iv
    INNER JOIN Users u ON iv.userID = u.userID
    WHERE 1 = 1
  `;

  const params = [];

  if (search.trim()) {
    sql += `
      AND (
        u.firstName LIKE ?
        OR u.lastName LIKE ?
        OR u.nationalID LIKE ?
        OR iv.documentNumber LIKE ?
      )
    `;
    const like = `%${search.trim()}%`;
    params.push(like, like, like, like);
  }

  if (tipoUsuario) {
    sql += `
      AND (
        CASE
          WHEN u.roleID = 1 THEN 'Cliente'
          WHEN u.roleID = 2 THEN 'Emprendedor'
          WHEN u.roleID = 3 THEN 'Administrador'
          ELSE 'Sin rol'
        END = ?
      )
    `;
    params.push(tipoUsuario);
  }

  sql += ` ORDER BY iv.verificationID DESC`;

  db.query(sql, params, (err, rows) => {
    if (err) {
      console.error('Error getVerificacionesAdminData:', err);
      return res.status(500).json({
        ok: false,
        message: 'No se pudieron cargar las verificaciones.'
      });
    }

    return res.json({
      ok: true,
      data: rows
    });
  });
};

const getVerificacionesFormData = (req, res) => {
  const sql = `
    SELECT
      u.userID,
      u.firstName,
      u.lastName,
      u.nationalID,
      u.roleID,
      CASE
        WHEN u.roleID = 1 THEN 'Cliente'
        WHEN u.roleID = 2 THEN 'Emprendedor'
        WHEN u.roleID = 3 THEN 'Administrador'
        ELSE 'Sin rol'
      END AS tipoUsuario
    FROM Users u
    ORDER BY u.firstName ASC, u.lastName ASC
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error('Error getVerificacionesFormData:', err);
      return res.status(500).json({
        ok: false,
        message: 'No se pudieron cargar los usuarios.'
      });
    }

    return res.json({
      ok: true,
      usuarios: rows || []
    });
  });
};

const createVerificacionAdmin = (req, res) => {
  const {
    userID,
    documentType,
    documentNumber,
    verificationStatus
  } = req.body;

  if (!userID || !documentType || !documentNumber || !verificationStatus) {
    return res.status(400).json({
      ok: false,
      message: 'Completa todos los campos de la verificación.'
    });
  }

  const sqlCheck = `
    SELECT verificationID
    FROM IdentityVerificators
    WHERE documentNumber = ?
    LIMIT 1
  `;

  db.query(sqlCheck, [documentNumber], (errCheck, rowsCheck) => {
    if (errCheck) {
      console.error('Error validando documento:', errCheck);
      return res.status(500).json({
        ok: false,
        message: 'No se pudo validar el documento.'
      });
    }

    if (rowsCheck.length > 0) {
      return res.status(400).json({
        ok: false,
        message: 'Ese número de documento ya está registrado.'
      });
    }

    const isVerificado = verificationStatus === 'Verificado';

    const sqlInsert = `
      INSERT INTO IdentityVerificators (
        userID,
        documentType,
        documentNumber,
        verificationStatus,
        submittedAt,
        verifiedAt
      ) VALUES (?, ?, ?, ?, NOW(), ?)
    `;

    db.query(
      sqlInsert,
      [
        userID,
        documentType,
        documentNumber,
        verificationStatus,
        isVerificado ? new Date() : null
      ],
      (errInsert, result) => {
        if (errInsert) {
          console.error('Error createVerificacionAdmin:', errInsert);
          return res.status(500).json({
            ok: false,
            message: 'No se pudo agregar la verificación.'
          });
        }

        return res.status(201).json({
          ok: true,
          message: 'Verificación agregada correctamente.',
          verificationID: result.insertId
        });
      }
    );
  });
};

module.exports = {
  renderVerificacionesAdmin,
  getVerificacionesAdminData,
  getVerificacionesFormData,
  createVerificacionAdmin
};