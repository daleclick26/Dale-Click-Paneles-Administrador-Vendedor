const db = require('../config/db');

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

function getBusinessByUser(userID, callback) {
  const negocioQuery = `
    SELECT
      businessID,
      userID,
      businessName,
      description,
      logoURL,
      department,
      city,
      addressLine,
      contactPhone,
      contactEmail,
      instagram,
      facebook,
      tiktok
    FROM BusinessProfiles
    WHERE userID = ?
    LIMIT 1
  `;

  db.query(negocioQuery, [userID], (error, rows) => {
    if (error) return callback(error);
    callback(null, rows[0] || null);
  });
}

function getSubscriptionByBusiness(businessID, callback) {
  const subscriptionQuery = `
    SELECT
      s.subscriptionID,
      s.startDate,
      s.endDate,
      p.planName,
      p.featuredAds
    FROM Subscriptions s
    INNER JOIN Plans p ON p.planID = s.planID
    WHERE s.businessID = ?
    ORDER BY s.subscriptionID DESC
    LIMIT 1
  `;

  db.query(subscriptionQuery, [businessID], (error, rows) => {
    if (error) return callback(error);
    callback(null, rows[0] || null);
  });
}

function getHoursByBusiness(businessID, callback) {
  const hoursQuery = `
    SELECT
      businessHourID,
      dayOfWeek,
      isClosed,
      openTime,
      closeTime
    FROM BusinessHours
    WHERE businessID = ?
    ORDER BY FIELD(
      dayOfWeek,
      'Lunes',
      'Martes',
      'Miércoles',
      'Jueves',
      'Viernes',
      'Sábado',
      'Domingo'
    )
  `;

  db.query(hoursQuery, [businessID], (error, rows) => {
    if (error) return callback(error);
    callback(null, rows || []);
  });
}

function getContextoPerfil(req, callback) {
  const usuarioSesion = getUsuarioSesion(req);

  if (!usuarioSesion?.userID) {
    return callback(new Error('No hay sesión activa.'));
  }

  getUsuarioActual(usuarioSesion.userID, (usuarioError, usuario) => {
    if (usuarioError) return callback(usuarioError);

    if (!usuario) {
      return callback(new Error('Usuario no encontrado.'));
    }

    getBusinessByUser(usuario.userID, (businessError, businessProfile) => {
      if (businessError) return callback(businessError);

      if (!businessProfile) {
        return callback(new Error('El usuario no tiene negocio asociado.'));
      }

      getSubscriptionByBusiness(businessProfile.businessID, (subscriptionError, subscription) => {
        if (subscriptionError) return callback(subscriptionError);

        getHoursByBusiness(businessProfile.businessID, (hoursError, businessHours) => {
          if (hoursError) return callback(hoursError);

          const usuarioLimpio = {
            ...usuario,
            profileImageURL:
              usuario.profileImageURL && String(usuario.profileImageURL).trim() !== ''
                ? usuario.profileImageURL
                : null
          };

          callback(null, {
            usuario: usuarioLimpio,
            businessProfile,
            subscription,
            businessHours
          });
        });
      });
    });
  });
}

exports.renderPerfilComercialPage = (req, res) => {
  getContextoPerfil(req, (error, data) => {
    if (error) {
      console.error('Error al cargar perfil comercial:', error);

      if (error.message === 'No hay sesión activa.') {
        return res.redirect('/login');
      }

      return res.status(500).send('Error al cargar perfil comercial');
    }

    return res.render('emprendedor/perfil-comercial', {
      activePage: 'perfil',
      usuario: data.usuario,
      businessProfile: data.businessProfile,
      subscription: data.subscription,
      businessHours: data.businessHours
    });
  });
};

exports.updateBusinessProfile = (req, res) => {
  const usuarioSesion = getUsuarioSesion(req);

  if (!usuarioSesion?.userID) {
    return res.status(401).json({ error: 'Sesión no válida' });
  }

  getBusinessByUser(usuarioSesion.userID, (businessError, businessProfile) => {
    if (businessError) {
      console.error('Error al obtener negocio del usuario:', businessError);
      return res.status(500).json({ error: 'Error al actualizar perfil comercial' });
    }

    if (!businessProfile) {
      return res.status(404).json({ error: 'Negocio no encontrado' });
    }

    const {
      businessName,
      description,
      logoURL,
      department,
      city,
      addressLine,
      contactPhone,
      contactEmail,
      instagram,
      facebook,
      tiktok
    } = req.body;

    const query = `
      UPDATE BusinessProfiles
      SET
        businessName = ?,
        description = ?,
        logoURL = ?,
        department = ?,
        city = ?,
        addressLine = ?,
        contactPhone = ?,
        contactEmail = ?,
        instagram = ?,
        facebook = ?,
        tiktok = ?
      WHERE businessID = ?
    `;

    const values = [
      businessName,
      description,
      logoURL,
      department,
      city,
      addressLine,
      contactPhone,
      contactEmail,
      instagram || null,
      facebook || null,
      tiktok || null,
      businessProfile.businessID
    ];

    db.query(query, values, (error, result) => {
      if (error) {
        console.error('Error al actualizar perfil comercial:', error);
        return res.status(500).json({ error: 'Error al actualizar perfil comercial' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Negocio no encontrado' });
      }

      return res.json({ message: 'Perfil comercial actualizado correctamente' });
    });
  });
};

exports.updateBusinessHours = (req, res) => {
  const usuarioSesion = getUsuarioSesion(req);

  if (!usuarioSesion?.userID) {
    return res.status(401).json({ error: 'Sesión no válida' });
  }

  const { hours } = req.body;

  if (!Array.isArray(hours) || hours.length === 0) {
    return res.status(400).json({ error: 'No se recibieron horarios válidos' });
  }

  getBusinessByUser(usuarioSesion.userID, (businessError, businessProfile) => {
    if (businessError) {
      console.error('Error al obtener negocio del usuario:', businessError);
      return res.status(500).json({ error: 'Error al actualizar horarios' });
    }

    if (!businessProfile) {
      return res.status(404).json({ error: 'Negocio no encontrado' });
    }

    const updates = hours.map((item) => {
      return new Promise((resolve, reject) => {
        const query = `
          UPDATE BusinessHours
          SET
            isClosed = ?,
            openTime = ?,
            closeTime = ?
          WHERE businessID = ? AND dayOfWeek = ?
        `;

        const values = [
          item.isClosed ? 1 : 0,
          item.isClosed ? null : item.openTime || null,
          item.isClosed ? null : item.closeTime || null,
          businessProfile.businessID,
          item.dayOfWeek
        ];

        db.query(query, values, (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
    });

    Promise.all(updates)
      .then(() => {
        res.json({ message: 'Horarios actualizados correctamente' });
      })
      .catch((error) => {
        console.error('Error al actualizar horarios:', error);
        res.status(500).json({ error: 'Error al actualizar horarios' });
      });
  });
};