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
      phone,
      nationalID,
      password,
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
      userID,
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
    FROM BusinessProfiles
    WHERE userID = ?
    LIMIT 1
  `;

  db.query(query, [userID], (error, rows) => {
    if (error) return callback(error);
    callback(null, rows[0] || null);
  });
}

function getStudentProfileByUser(userID, callback) {
  const query = `
    SELECT
      sp.studentIDCode,
      sp.career,
      sp.isStudentVerified,
      u.universityName
    FROM StudentProfiles sp
    INNER JOIN Universities u ON u.universityID = sp.universityID
    WHERE sp.userID = ?
    LIMIT 1
  `;

  db.query(query, [userID], (error, rows) => {
    if (error) return callback(error);
    callback(null, rows[0] || null);
  });
}

function getPlanes(callback) {
  const query = `
    SELECT
      planID,
      planName,
      price,
      durationDays
    FROM Plans
    ORDER BY price ASC, planID ASC
  `;

  db.query(query, (error, rows) => {
    if (error) return callback(error);
    callback(null, rows || []);
  });
}

function getHistorialSuscripciones(businessID, callback) {
  const query = `
    SELECT
      s.subscriptionID,
      p.planName,
      s.startDate,
      s.endDate,
      s.status
    FROM Subscriptions s
    INNER JOIN Plans p ON p.planID = s.planID
    WHERE s.businessID = ?
    ORDER BY s.subscriptionID DESC
  `;

  db.query(query, [businessID], (error, rows) => {
    if (error) return callback(error);
    callback(null, rows || []);
  });
}

function getContextoConfiguracion(req, callback) {
  const usuarioSesion = getUsuarioSesion(req);

  if (!usuarioSesion?.userID) {
    return callback(new Error('No hay sesión activa.'));
  }

  getUsuarioActual(usuarioSesion.userID, (usuarioError, usuario) => {
    if (usuarioError) return callback(usuarioError);

    if (!usuario) {
      return callback(new Error('Usuario no encontrado.'));
    }

    getStudentProfileByUser(usuario.userID, (studentError, studentProfile) => {
      if (studentError) return callback(studentError);

      getBusinessByUser(usuario.userID, (businessError, businessProfile) => {
        if (businessError) return callback(businessError);

        if (!businessProfile) {
          return callback(new Error('El usuario no tiene negocio asociado.'));
        }

        getPlanes((planesError, planes) => {
          if (planesError) return callback(planesError);

          getHistorialSuscripciones(businessProfile.businessID, (historialError, historialSuscripciones) => {
            if (historialError) return callback(historialError);

            const usuarioLimpio = {
              ...usuario,
              profileImageURL:
                usuario.profileImageURL && String(usuario.profileImageURL).trim() !== ''
                  ? usuario.profileImageURL
                  : null
            };

            callback(null, {
              usuario: usuarioLimpio,
              studentProfile,
              businessProfile,
              planes,
              historialSuscripciones
            });
          });
        });
      });
    });
  });
}

exports.renderConfiguracionPage = (req, res) => {
  getContextoConfiguracion(req, (error, data) => {
    if (error) {
      console.error('Error al cargar configuración:', error);

      if (error.message === 'No hay sesión activa.') {
        return res.redirect('/login');
      }

      return res.status(500).send('Error al cargar configuración');
    }

    return res.render('emprendedor/configuracion', {
      activePage: 'configuracion',
      usuario: data.usuario,
      studentProfile: data.studentProfile,
      businessProfile: data.businessProfile,
      planes: data.planes,
      historialSuscripciones: data.historialSuscripciones
    });
  });
};

exports.updateUsuario = (req, res) => {
  const usuarioSesion = getUsuarioSesion(req);

  if (!usuarioSesion?.userID) {
    return res.status(401).json({ error: 'Sesión no válida' });
  }

  const userID = usuarioSesion.userID;

  const {
    firstName,
    lastName,
    email,
    phone,
    password,
    instagram,
    facebook,
    tiktok
  } = req.body;

  getBusinessByUser(userID, (businessError, businessProfile) => {
    if (businessError) {
      console.error('Error al obtener negocio del usuario:', businessError);
      return res.status(500).json({ error: 'Error al actualizar usuario' });
    }

    if (!businessProfile) {
      return res.status(404).json({ error: 'Negocio no encontrado' });
    }

    const updateUserQuery = `
      UPDATE Users
      SET
        firstName = ?,
        lastName = ?,
        email = ?,
        phone = ?,
        password = ?
      WHERE userID = ? AND roleID = 2
    `;

    const updateBusinessProfileQuery = `
      UPDATE BusinessProfiles
      SET
        instagram = ?,
        facebook = ?,
        tiktok = ?
      WHERE businessID = ? AND userID = ?
    `;

    db.query(
      updateUserQuery,
      [firstName, lastName, email, phone, password, userID],
      (userError, userResult) => {
        if (userError) {
          console.error('Error al actualizar usuario:', userError);
          return res.status(500).json({ error: 'Error al actualizar usuario' });
        }

        if (userResult.affectedRows === 0) {
          return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        db.query(
          updateBusinessProfileQuery,
          [
            instagram || null,
            facebook || null,
            tiktok || null,
            businessProfile.businessID,
            userID
          ],
          (profileError) => {
            if (profileError) {
              console.error('Error al actualizar redes del negocio:', profileError);
              return res.status(500).json({ error: 'Error al actualizar redes sociales' });
            }

            getUsuarioActual(userID, (refreshError, usuarioActualizado) => {
              if (refreshError) {
                console.error('Error al refrescar sesión del usuario:', refreshError);
                return res.json({ message: 'Usuario actualizado correctamente' });
              }

              if (req.session.usuario) {
                req.session.usuario = {
                  ...req.session.usuario,
                  userID: usuarioActualizado.userID,
                  username: usuarioActualizado.username,
                  firstName: usuarioActualizado.firstName,
                  lastName: usuarioActualizado.lastName,
                  email: usuarioActualizado.email,
                  phone: usuarioActualizado.phone,
                  nationalID: usuarioActualizado.nationalID,
                  roleID: usuarioActualizado.roleID,
                  profileImageURL: usuarioActualizado.profileImageURL
                };
              }

              return req.session.save((sessionError) => {
                if (sessionError) {
                  console.error('Error guardando sesión actualizada:', sessionError);
                }

                return res.json({ message: 'Usuario actualizado correctamente' });
              });
            });
          }
        );
      }
    );
  });
};

exports.updateFotoPerfil = (req, res) => {
  const usuarioSesion = getUsuarioSesion(req);

  if (!usuarioSesion?.userID) {
    return res.status(401).json({ error: 'Sesión no válida' });
  }

  const userID = usuarioSesion.userID;

  if (!req.file) {
    return res.status(400).json({ error: 'No se recibió ninguna imagen' });
  }

  const imagePath = `/uploads/perfiles/${req.file.filename}`;

  const query = `
    UPDATE Users
    SET profileImageURL = ?
    WHERE userID = ? AND roleID = 2
  `;

  db.query(query, [imagePath, userID], (error, result) => {
    if (error) {
      console.error('Error al actualizar foto de perfil:', error);
      return res.status(500).json({ error: 'Error al actualizar foto de perfil' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (req.session.usuario) {
      req.session.usuario = {
        ...req.session.usuario,
        profileImageURL: imagePath
      };
    }

    return req.session.save((sessionError) => {
      if (sessionError) {
        console.error('Error guardando sesión tras actualizar foto:', sessionError);
      }

      return res.json({
        message: 'Foto de perfil actualizada correctamente',
        profileImageURL: imagePath
      });
    });
  });
};

exports.solicitarPlan = (req, res) => {
  const usuarioSesion = getUsuarioSesion(req);

  if (!usuarioSesion?.userID) {
    return res.status(401).json({ error: 'Sesión no válida' });
  }

  const userID = usuarioSesion.userID;
  const { planID, planName, message } = req.body;

  getBusinessByUser(userID, async (businessError, negocio) => {
    if (businessError) {
      console.error('Error al obtener negocio para solicitar plan:', businessError);
      return res.status(500).json({ error: 'Error al procesar solicitud' });
    }

    if (!negocio) {
      return res.status(404).json({ error: 'Negocio no encontrado' });
    }

    getUsuarioActual(userID, async (usuarioError, usuario) => {
      if (usuarioError) {
        console.error('Error al obtener usuario para solicitar plan:', usuarioError);
        return res.status(500).json({ error: 'Error al procesar solicitud' });
      }

      if (!usuario) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      try {
        await transporter.sendMail({
          from: `"Dale Click" <${process.env.EMAIL_USER}>`,
          to: 'daleclick26@gmail.com',
          replyTo: negocio.contactEmail || usuario.email,
          subject: `Solicitud de plan: ${planName}`,
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.5;">
              <h2>Solicitud de suscripción</h2>
              <p><strong>Plan solicitado:</strong> ${planName}</p>
              <p><strong>ID del plan:</strong> ${planID}</p>
              <p><strong>Negocio:</strong> ${negocio.businessName || 'N/D'}</p>
              <p><strong>Emprendedor:</strong> ${usuario.firstName || ''} ${usuario.lastName || ''}</p>
              <p><strong>Correo de contacto:</strong> ${negocio.contactEmail || usuario.email || 'N/D'}</p>
              <p><strong>Mensaje:</strong></p>
              <p>${(message || '').replace(/\n/g, '<br>')}</p>
            </div>
          `
        });

        return res.json({ message: 'Solicitud enviada correctamente a Dale Click.' });
      } catch (mailError) {
        console.error('Error al enviar solicitud de plan:', mailError);
        return res.status(500).json({ error: 'No se pudo enviar la solicitud del plan' });
      }
    });
  });
};