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
          phone,
          nationalID,
          password,
          status,
          roleID,
          profileImageURL
        FROM Users
        WHERE userID = ? AND roleID = 3
        LIMIT 1
      `,
      [userID],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows[0] || null);
      }
    );
  });
}

exports.renderConfiguracionAdmin = (req, res) => {
  const usuarioSesion = getUsuarioSesion(req);

  if (!usuarioSesion?.userID) {
    return res.redirect('/login');
  }

  getUsuarioActual(usuarioSesion.userID)
    .then((usuario) => {
      if (!usuario) {
        return res.redirect('/login');
      }

      return res.render('admin/configuracion', {
        title: 'Configuracion | Dale Click',
        activePage: 'configuracion',
        usuario
      });
    })
    .catch((error) => {
      console.error('Error renderConfiguracionAdmin:', error);
      return res.status(500).send('No se pudo cargar la configuracion.');
    });
};

exports.updateConfiguracionAdmin = (req, res) => {
  const adminId = req.session?.usuario?.userID;

  if (!adminId) {
    return res.status(401).json({
      ok: false,
      message: 'Sesion no valida.'
    });
  }

  const {
    username,
    firstName,
    lastName,
    email,
    phone,
    nationalID,
    password
  } = req.body;

  const query = `
    UPDATE Users
    SET username = ?, firstName = ?, lastName = ?, email = ?, phone = ?, nationalID = ?, password = ?
    WHERE userID = ? AND roleID = 3
  `;

  db.query(
    query,
    [
      username,
      firstName,
      lastName,
      email,
      phone,
      nationalID,
      password,
      adminId
    ],
    (err) => {
      if (err) {
        console.error('Error updateConfiguracionAdmin:', err);
        return res.status(500).json({
          ok: false,
          message: 'Error al actualizar la configuracion.'
        });
      }

      return res.json({
        ok: true,
        message: 'Configuracion actualizada correctamente.'
      });
    }
  );
};

exports.uploadFotoAdmin = (req, res) => {
  const adminId = req.session?.usuario?.userID;
  const { profileImageURL } = req.body;

  if (!adminId) {
    return res.status(401).json({
      ok: false,
      message: 'Sesion no valida.'
    });
  }

  const query = `
    UPDATE Users
    SET profileImageURL = ?
    WHERE userID = ? AND roleID = 3
  `;

  db.query(query, [profileImageURL || null, adminId], (err) => {
    if (err) {
      console.error('Error uploadFotoAdmin:', err);
      return res.status(500).json({
        ok: false,
        message: 'No se pudo actualizar la foto.'
      });
    }

    return res.json({
      ok: true,
      message: 'Foto actualizada correctamente.'
    });
  });
};
