const db = require('../../config/db');
const util = require('util');

const query = util.promisify(db.query).bind(db);

function normalizeUserStatus(value) {
  const v = String(value || '').trim().toLowerCase();

  if (['activo', 'active', '1', 'true'].includes(v)) return 'Activo';
  if (['inactivo', 'inactive', '0', 'false'].includes(v)) return 'Inactivo';

  return 'Activo';
}

function normalizeRoleLabel(roleID, roleName) {
  const id = Number(roleID);
  const name = String(roleName || '').trim().toLowerCase();

  if (id === 1 || name.includes('cliente') || name.includes('customer')) return 'Cliente';
  if (id === 2 || name.includes('emprendedor') || name.includes('entrepreneur') || name.includes('seller') || name.includes('vendor')) return 'Emprendedor';
  if (id === 3 || name.includes('administrador') || name.includes('admin')) return 'Administrador';

  return roleName || 'Sin rol';
}

function normalizeVerificationLabel(value, studentVerified) {
  const status = String(value || '').trim().toLowerCase();

  if (status.includes('verif') || status.includes('approved') || status.includes('aprob')) {
    return 'Verificado';
  }

  if (studentVerified === 1 || studentVerified === true) {
    return 'Verificado';
  }

  return 'Pendiente';
}

function splitNameParts(firstName, lastName) {
  return {
    firstName: String(firstName || '').trim(),
    lastName: String(lastName || '').trim()
  };
}

function getUsuarioSesion(req) {
  return req.session?.usuario || null;
}

async function getUsuarioActual(userID) {
  const rows = await query(
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
    [userID]
  );

  if (!rows[0]) {
    return null;
  }

  return {
    ...rows[0],
    profileImageURL:
      rows[0].profileImageURL && String(rows[0].profileImageURL).trim() !== ''
        ? rows[0].profileImageURL
        : null
  };
}

function buildUsername(firstName, lastName) {
  const base = `${firstName}.${lastName}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9.]/g, '')
    .replace(/\.+/g, '.')
    .replace(/^\.|\.$/g, '');

  return base || `usuario${Date.now()}`;
}

function mapUserRow(row) {
  return {
    userID: row.userID,
    firstName: row.firstName || '',
    lastName: row.lastName || '',
    email: row.email || '',
    phone: row.phone || '',
    nationalID: row.nationalID || '',
    status: normalizeUserStatus(row.status),
    roleID: row.roleID,
    role: normalizeRoleLabel(row.roleID, row.roleName),
    verificationStatus: normalizeVerificationLabel(row.verificationStatus, row.isStudentVerified),
    username: row.username || '',
    createdAt: row.createdAt || ''
  };
}

async function renderUsuariosAdmin(req, res) {
  try {
    const usuarioSesion = getUsuarioSesion(req);

    if (!usuarioSesion?.userID) {
      return res.redirect('/login');
    }

    const [roles, universities, usuario] = await Promise.all([
      query(`
        SELECT roleID, roleName, description
        FROM Roles
        ORDER BY roleID ASC
      `),
      query(`
        SELECT universityID, universityName
        FROM Universities
        ORDER BY universityName ASC
      `),
      getUsuarioActual(usuarioSesion.userID)
    ]);

    if (!usuario) {
      return res.redirect('/login');
    }

    res.render('admin/usuarios', {
      title: 'Dale Click | Usuarios',
      activePage: 'usuarios',
      usuario,
      roles,
      universities
    });
  } catch (error) {
    console.error('Error renderUsuariosAdmin:', error);
    res.status(500).send('No se pudo cargar la vista de usuarios.');
  }
}

async function getUsuariosAdminData(req, res) {
  try {
    const search = String(req.query.search || '').trim();
    const roleID = Number(req.query.roleID || 0);

    const params = [];
    let where = 'WHERE 1 = 1';

    if (search) {
      where += `
        AND (
          u.firstName LIKE ?
          OR u.lastName LIKE ?
          OR u.nationalID LIKE ?
        )
      `;
      const searchLike = `%${search}%`;
      params.push(searchLike, searchLike, searchLike);
    }

    if (roleID) {
      where += ' AND u.roleID = ?';
      params.push(roleID);
    }

    const rows = await query(
      `
      SELECT
        u.userID,
        u.username,
        u.firstName,
        u.lastName,
        u.email,
        u.phone,
        u.nationalID,
        u.status,
        u.roleID,
        r.roleName,
        DATE_FORMAT(u.createdAt, '%Y-%m-%d %H:%i:%s') AS createdAt,
        sp.isStudentVerified,
        iv.verificationStatus
      FROM Users u
      LEFT JOIN Roles r
        ON r.roleID = u.roleID
      LEFT JOIN StudentProfiles sp
        ON sp.userID = u.userID
      LEFT JOIN (
        SELECT t.userID, t.verificationStatus
        FROM IdentityVerificators t
        INNER JOIN (
          SELECT userID, MAX(verificationID) AS lastVerificationID
          FROM IdentityVerificators
          GROUP BY userID
        ) lastIv
          ON lastIv.lastVerificationID = t.verificationID
      ) iv
        ON iv.userID = u.userID
      ${where}
      ORDER BY u.createdAt DESC, u.userID DESC
      `,
      params
    );

    res.json(rows.map(mapUserRow));
  } catch (error) {
    console.error('Error getUsuariosAdminData:', error);
    res.status(500).json({ message: 'No se pudieron cargar los usuarios.' });
  }
}

async function createUsuarioAdmin(req, res) {
  try {
    const {
      username,
      firstName,
      lastName,
      email,
      phone,
      nationalID,
      password,
      status,
      roleID
    } = req.body;

    const firstNameClean = String(firstName || '').trim();
    const lastNameClean = String(lastName || '').trim();
    const emailClean = String(email || '').trim();
    const phoneClean = String(phone || '').trim();
    const nationalIDClean = String(nationalID || '').trim();
    const passwordClean = String(password || '').trim();
    const statusClean = normalizeUserStatus(status);
    const roleIDNumber = Number(roleID);
    const usernameClean = String(username || '').trim() || buildUsername(firstNameClean, lastNameClean);

    if (!firstNameClean || !lastNameClean || !emailClean || !nationalIDClean || !passwordClean || !roleIDNumber) {
      return res.status(400).json({
        message: 'Nombre, apellido, email, nationalID, contraseña y rol son obligatorios.'
      });
    }

    const existing = await query(
      `
      SELECT userID
      FROM Users
      WHERE email = ? OR username = ? OR nationalID = ?
      LIMIT 1
      `,
      [emailClean, usernameClean, nationalIDClean]
    );

    if (existing.length) {
      return res.status(409).json({
        message: 'Ya existe un usuario con ese email, username o nationalID.'
      });
    }

    const result = await query(
      `
      INSERT INTO Users (
        username,
        firstName,
        lastName,
        email,
        phone,
        nationalID,
        password,
        status,
        roleID
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        usernameClean,
        firstNameClean,
        lastNameClean,
        emailClean,
        phoneClean,
        nationalIDClean,
        passwordClean,
        statusClean,
        roleIDNumber
      ]
    );

    const rows = await query(
      `
      SELECT
        u.userID,
        u.username,
        u.firstName,
        u.lastName,
        u.email,
        u.phone,
        u.nationalID,
        u.status,
        u.roleID,
        r.roleName,
        DATE_FORMAT(u.createdAt, '%Y-%m-%d %H:%i:%s') AS createdAt,
        NULL AS isStudentVerified,
        NULL AS verificationStatus
      FROM Users u
      LEFT JOIN Roles r ON r.roleID = u.roleID
      WHERE u.userID = ?
      `,
      [result.insertId]
    );

    res.status(201).json(mapUserRow(rows[0]));
  } catch (error) {
    console.error('Error createUsuarioAdmin:', error);

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        message: 'No se pudo crear el usuario porque ya existe un dato único duplicado.'
      });
    }

    res.status(500).json({ message: 'No se pudo crear el usuario.' });
  }
}

async function updateUsuarioAdmin(req, res) {
  try {
    const userID = Number(req.params.id);

    if (!userID) {
      return res.status(400).json({ message: 'ID de usuario inválido.' });
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      nationalID,
      status,
      roleID
    } = req.body;

    const firstNameClean = String(firstName || '').trim();
    const lastNameClean = String(lastName || '').trim();
    const emailClean = String(email || '').trim();
    const phoneClean = String(phone || '').trim();
    const nationalIDClean = String(nationalID || '').trim();
    const statusClean = normalizeUserStatus(status);
    const roleIDNumber = Number(roleID);

    if (!firstNameClean || !lastNameClean || !emailClean || !nationalIDClean || !roleIDNumber) {
      return res.status(400).json({
        message: 'Nombre, apellido, email, nationalID y rol son obligatorios.'
      });
    }

    const existing = await query(
      `
      SELECT userID
      FROM Users
      WHERE userID = ?
      LIMIT 1
      `,
      [userID]
    );

    if (!existing.length) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    const duplicated = await query(
      `
      SELECT userID
      FROM Users
      WHERE userID <> ?
        AND (email = ? OR nationalID = ?)
      LIMIT 1
      `,
      [userID, emailClean, nationalIDClean]
    );

    if (duplicated.length) {
      return res.status(409).json({
        message: 'Ya existe otro usuario con ese email o nationalID.'
      });
    }

    await query(
      `
      UPDATE Users
      SET
        firstName = ?,
        lastName = ?,
        email = ?,
        phone = ?,
        nationalID = ?,
        status = ?,
        roleID = ?
      WHERE userID = ?
      `,
      [
        firstNameClean,
        lastNameClean,
        emailClean,
        phoneClean,
        nationalIDClean,
        statusClean,
        roleIDNumber,
        userID
      ]
    );

    const rows = await query(
      `
      SELECT
        u.userID,
        u.username,
        u.firstName,
        u.lastName,
        u.email,
        u.phone,
        u.nationalID,
        u.status,
        u.roleID,
        r.roleName,
        DATE_FORMAT(u.createdAt, '%Y-%m-%d %H:%i:%s') AS createdAt,
        sp.isStudentVerified,
        iv.verificationStatus
      FROM Users u
      LEFT JOIN Roles r ON r.roleID = u.roleID
      LEFT JOIN StudentProfiles sp ON sp.userID = u.userID
      LEFT JOIN (
        SELECT t.userID, t.verificationStatus
        FROM IdentityVerificators t
        INNER JOIN (
          SELECT userID, MAX(verificationID) AS lastVerificationID
          FROM IdentityVerificators
          GROUP BY userID
        ) lastIv
          ON lastIv.lastVerificationID = t.verificationID
      ) iv
        ON iv.userID = u.userID
      WHERE u.userID = ?
      `,
      [userID]
    );

    res.json(mapUserRow(rows[0]));
  } catch (error) {
    console.error('Error updateUsuarioAdmin:', error);
    res.status(500).json({ message: 'No se pudo actualizar el usuario.' });
  }
}

async function deleteUsuarioAdmin(req, res) {
  try {
    const userID = Number(req.params.id);

    if (!userID) {
      return res.status(400).json({ message: 'ID de usuario inválido.' });
    }

    const rows = await query(
      `
      SELECT userID
      FROM Users
      WHERE userID = ?
      LIMIT 1
      `,
      [userID]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    await query('DELETE FROM StudentProfiles WHERE userID = ?', [userID]);
    await query('DELETE FROM IdentityVerificators WHERE userID = ?', [userID]);
    await query('DELETE FROM Users WHERE userID = ?', [userID]);

    res.status(204).end();
  } catch (error) {
    console.error('Error deleteUsuarioAdmin:', error);

    if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_ROW_IS_REFERENCED') {
      return res.status(409).json({
        message: 'No se puede borrar este usuario porque tiene registros asociados en otras tablas.'
      });
    }

    res.status(500).json({ message: 'No se pudo borrar el usuario.' });
  }
}

async function createRolAdmin(req, res) {
  try {
    const roleName = String(req.body.roleName || '').trim();
    const description = String(req.body.description || '').trim();

    if (!roleName) {
      return res.status(400).json({ message: 'El nombre del rol es obligatorio.' });
    }

    const result = await query(
      `
      INSERT INTO Roles (roleName, description)
      VALUES (?, ?)
      `,
      [roleName, description]
    );

    const rows = await query(
      `
      SELECT roleID, roleName, description
      FROM Roles
      WHERE roleID = ?
      `,
      [result.insertId]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Error createRolAdmin:', error);

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        message: 'Ya existe un rol con ese nombre.'
      });
    }

    res.status(500).json({ message: 'No se pudo crear el rol.' });
  }
}

async function createPerfilEstudianteAdmin(req, res) {
  try {
    const userID = Number(req.body.userID);
    const universityID = Number(req.body.universityID);
    const studentIDCode = String(req.body.studentIDCode || '').trim();
    const career = String(req.body.career || '').trim();
    const isStudentVerified = Number(req.body.isStudentVerified) === 1 ? 1 : 0;

    if (!userID || !universityID || !studentIDCode || !career) {
      return res.status(400).json({
        message: 'Usuario, universidad, carné y carrera son obligatorios.'
      });
    }

    const userRows = await query(
      `
      SELECT userID, roleID
      FROM Users
      WHERE userID = ?
      LIMIT 1
      `,
      [userID]
    );

    if (!userRows.length) {
      return res.status(404).json({ message: 'El usuario seleccionado no existe.' });
    }

    const profileRows = await query(
      `
      SELECT studentProfileID
      FROM StudentProfiles
      WHERE userID = ?
      LIMIT 1
      `,
      [userID]
    );

    if (profileRows.length) {
      return res.status(409).json({
        message: 'Ese usuario ya tiene perfil de estudiante.'
      });
    }

    const result = await query(
      `
      INSERT INTO StudentProfiles (
        userID,
        universityID,
        studentIDCode,
        career,
        isStudentVerified
      )
      VALUES (?, ?, ?, ?, ?)
      `,
      [userID, universityID, studentIDCode, career, isStudentVerified]
    );

    const rows = await query(
      `
      SELECT
        sp.studentProfileID,
        sp.userID,
        sp.universityID,
        sp.studentIDCode,
        sp.career,
        sp.isStudentVerified,
        u.universityName
      FROM StudentProfiles sp
      LEFT JOIN Universities u
        ON u.universityID = sp.universityID
      WHERE sp.studentProfileID = ?
      `,
      [result.insertId]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Error createPerfilEstudianteAdmin:', error);
    res.status(500).json({ message: 'No se pudo crear el perfil de estudiante.' });
  }
}

module.exports = {
  renderUsuariosAdmin,
  getUsuariosAdminData,
  createUsuarioAdmin,
  updateUsuarioAdmin,
  deleteUsuarioAdmin,
  createRolAdmin,
  createPerfilEstudianteAdmin
};
