const db = require('../config/db');

exports.showLogin = (req, res) => {
  res.render('auth/login', {
    showReset: false,
    role: '',
    errorReset: null,
    successReset: null,
    error: null
  });
};

exports.login = (req, res) => {
  const { username, password, role } = req.body || {};

  console.log('BODY:', req.body);

  if (!username || !password || !role) {
    return res.render('auth/login', {
      error: 'Debes completar usuario, contrasena y seleccionar un rol.',
      showReset: false,
      role,
      errorReset: null,
      successReset: null
    });
  }

  db.query(
    'SELECT * FROM Users WHERE username = ?',
    [username],
    (error, rows) => {
      if (error) {
        console.error('Error en query:', error);
        return res.render('auth/login', {
          error: 'Error en login',
          showReset: false,
          role,
          errorReset: null,
          successReset: null
        });
      }

      console.log('ROWS:', rows);

      if (rows.length === 0) {
        return res.render('auth/login', {
          error: 'Usuario no encontrado',
          showReset: false,
          role,
          errorReset: null,
          successReset: null
        });
      }

      const user = rows[0];

      if (password !== user.password) {
        return res.render('auth/login', {
          error: 'Contrasena incorrecta',
          showReset: false,
          role,
          errorReset: null,
          successReset: null
        });
      }

      const expectedRoleId = role === 'vendedor' ? 2 : 3;

      if (user.roleID !== expectedRoleId) {
        return res.render('auth/login', {
          error: 'Este usuario no corresponde al panel seleccionado.',
          showReset: false,
          role,
          errorReset: null,
          successReset: null
        });
      }

      req.session.usuario = user;

      req.session.save((err) => {
        if (err) {
          console.error('Error guardando sesion:', err);
          return res.render('auth/login', {
            error: 'Error guardando sesion',
            showReset: false,
            role,
            errorReset: null,
            successReset: null
          });
        }

        const redirectPath = user.roleID === 3 ? '/admin/tablero' : '/tablero';
        console.log(`Login OK -> redirigiendo a ${redirectPath}`);
        return res.redirect(redirectPath);
      });
    }
  );
};

exports.resetPasswordSimple = (req, res) => {
  const {
    resetEmail,
    resetPassword,
    resetConfirmPassword,
    resetRole
  } = req.body || {};

  if (!resetEmail || !resetPassword || !resetConfirmPassword || !resetRole) {
    return res.render('auth/login', {
      errorReset: 'Debes completar todos los campos.',
      showReset: true,
      role: resetRole || '',
      successReset: null,
      error: null
    });
  }

  if (resetPassword !== resetConfirmPassword) {
    return res.render('auth/login', {
      errorReset: 'Las contrasenas no coinciden.',
      showReset: true,
      role: resetRole || '',
      successReset: null,
      error: null
    });
  }

  if (resetPassword.length < 4) {
    return res.render('auth/login', {
      errorReset: 'La contrasena debe tener al menos 4 caracteres.',
      showReset: true,
      role: resetRole || '',
      successReset: null,
      error: null
    });
  }

  const expectedRoleId = resetRole === 'vendedor' ? 2 : 3;

  db.query(
    'SELECT * FROM Users WHERE email = ? AND roleID = ?',
    [resetEmail, expectedRoleId],
    (error, rows) => {
      if (error) {
        console.error('Error consultando usuario para reset:', error);
        return res.render('auth/login', {
          errorReset: 'Error del servidor.',
          showReset: true,
          role: resetRole || '',
          successReset: null,
          error: null
        });
      }

      if (rows.length === 0) {
        return res.render('auth/login', {
          errorReset: 'No existe un usuario con ese correo en el panel seleccionado.',
          showReset: true,
          role: resetRole || '',
          successReset: null,
          error: null
        });
      }

      db.query(
        'UPDATE Users SET password = ? WHERE email = ? AND roleID = ?',
        [resetPassword, resetEmail, expectedRoleId],
        (updateError) => {
          if (updateError) {
            console.error('Error actualizando contrasena:', updateError);
            return res.render('auth/login', {
              errorReset: 'No se pudo actualizar la contrasena.',
              showReset: true,
              role: resetRole || '',
              successReset: null,
              error: null
            });
          }

          return res.render('auth/login', {
            successReset: 'Contrasena actualizada correctamente. Ahora puedes iniciar sesion.',
            showReset: false,
            role: resetRole || '',
            errorReset: null,
            error: null
          });
        }
      );
    }
  );
};

exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
};
