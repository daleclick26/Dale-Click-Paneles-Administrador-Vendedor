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

const renderEvaluacionAdmin = (req, res) => {
  const usuarioSesion = getUsuarioSesion(req);

  if (!usuarioSesion?.userID) {
    return res.redirect('/login');
  }

  getUsuarioActual(usuarioSesion.userID)
    .then((usuario) => {
      if (!usuario) {
        return res.redirect('/login');
      }

      return res.render('admin/evaluacion', {
        title: 'Evaluaciones | Dale Click',
        activePage: 'evaluacion',
        usuario
      });
    })
    .catch((error) => {
      console.error('Error renderEvaluacionAdmin:', error);
      res.status(500).send('No se pudo cargar la vista de evaluaciones.');
    });
};

const getEvaluacionAdminData = (req, res) => {
  const { search = '', rating = '' } = req.query;

  let sql = `
    SELECT
      r.reviewID,
      r.rating,
      r.comment,
      r.createdAt,
      r.orderID,
      p.productName,
      u.firstName,
      u.lastName,
      bp.businessName
    FROM Reviews r
    INNER JOIN Users u ON r.userID = u.userID
    LEFT JOIN Products p ON r.productID = p.productID
    LEFT JOIN Orders o ON r.orderID = o.orderID
    LEFT JOIN BusinessProfiles bp ON o.businessID = bp.businessID
    WHERE 1 = 1
  `;

  const params = [];

  if (search.trim()) {
    sql += `
      AND (
        u.firstName LIKE ?
        OR u.lastName LIKE ?
        OR bp.businessName LIKE ?
      )
    `;
    const like = `%${search.trim()}%`;
    params.push(like, like, like);
  }

  if (rating) {
    sql += ` AND r.rating = ?`;
    params.push(Number(rating));
  }

  sql += ` ORDER BY r.reviewID DESC`;

  db.query(sql, params, (err, rows) => {
    if (err) {
      console.error('Error getEvaluacionAdminData:', err);
      return res.status(500).json({
        ok: false,
        message: 'No se pudieron cargar las evaluaciones.'
      });
    }

    return res.json({
      ok: true,
      data: rows
    });
  });
};

module.exports = {
  renderEvaluacionAdmin,
  getEvaluacionAdminData
};
