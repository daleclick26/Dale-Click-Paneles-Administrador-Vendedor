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

const renderCatalogoAdmin = (req, res) => {
  const usuarioSesion = getUsuarioSesion(req);

  if (!usuarioSesion?.userID) {
    return res.redirect('/login');
  }

  getUsuarioActual(usuarioSesion.userID)
    .then((usuario) => {
      if (!usuario) {
        return res.redirect('/login');
      }

      return res.render('admin/catalogo', {
        title: 'Catálogo | Dale Click',
        activePage: 'catalogo',
        usuario
      });
    })
    .catch((error) => {
      console.error('Error renderCatalogoAdmin:', error);
      res.status(500).send('No se pudo cargar la vista de catálogo.');
    });
};

const getCatalogoAdminData = (req, res) => {
  const {
    search = '',
    negocio = '',
    precio = '',
    stock = ''
  } = req.query;

  let sql = `
    SELECT
      p.productID,
      bp.businessID,
      bp.businessName,
      c.categoryID,
      c.categoryName,
      p.productName,
      p.price,
      p.stock,
      p.availabilityStatus
    FROM Products p
    INNER JOIN BusinessProfiles bp ON p.businessID = bp.businessID
    INNER JOIN Categories c ON p.categoryID = c.categoryID
    WHERE 1 = 1
  `;

  const params = [];

  if (search.trim()) {
    sql += `
      AND (
        c.categoryName LIKE ?
        OR p.productName LIKE ?
        OR bp.businessName LIKE ?
      )
    `;
    const like = `%${search.trim()}%`;
    params.push(like, like, like);
  }

  if (negocio) {
    sql += ` AND bp.businessID = ?`;
    params.push(negocio);
  }

  if (precio !== '') {
    sql += ` AND p.price = ?`;
    params.push(Number(precio));
  }

  if (stock !== '') {
    sql += ` AND p.stock = ?`;
    params.push(Number(stock));
  }

  sql += ` ORDER BY p.productID DESC`;

  db.query(sql, params, (err, rows) => {
    if (err) {
      console.error('Error getCatalogoAdminData:', err);
      return res.status(500).json({
        ok: false,
        message: 'No se pudo cargar el catálogo.'
      });
    }

    return res.json({
      ok: true,
      data: rows
    });
  });
};

const getCatalogoFormData = (req, res) => {
  const result = {
    negocios: [],
    categorias: []
  };

  const sqlNegocios = `
    SELECT
      businessID,
      businessName
    FROM BusinessProfiles
    ORDER BY businessName ASC
  `;

  const sqlCategorias = `
    SELECT
      categoryID,
      categoryName
    FROM Categories
    ORDER BY categoryName ASC
  `;

  db.query(sqlNegocios, (errNegocios, rowsNegocios) => {
    if (errNegocios) {
      console.error('Error getCatalogoFormData negocios:', errNegocios);
      return res.status(500).json({
        ok: false,
        message: 'No se pudieron cargar los negocios.'
      });
    }

    result.negocios = rowsNegocios || [];

    db.query(sqlCategorias, (errCategorias, rowsCategorias) => {
      if (errCategorias) {
        console.error('Error getCatalogoFormData categorías:', errCategorias);
        return res.status(500).json({
          ok: false,
          message: 'No se pudieron cargar las categorías.'
        });
      }

      result.categorias = rowsCategorias || [];

      return res.json({
        ok: true,
        ...result
      });
    });
  });
};

const createCategoriaAdmin = (req, res) => {
  const { categoryName, description } = req.body;

  if (!categoryName || !String(categoryName).trim()) {
    return res.status(400).json({
      ok: false,
      message: 'El nombre de la categoría es obligatorio.'
    });
  }

  const sql = `
    INSERT INTO Categories (
      categoryName,
      description
    ) VALUES (?, ?)
  `;

  db.query(
    sql,
    [String(categoryName).trim(), description || null],
    (err, result) => {
      if (err) {
        console.error('Error createCategoriaAdmin:', err);
        return res.status(500).json({
          ok: false,
          message: 'No se pudo crear la categoría.'
        });
      }

      return res.status(201).json({
        ok: true,
        message: 'Categoría creada correctamente.',
        categoryID: result.insertId
      });
    }
  );
};

const createProductoAdmin = (req, res) => {
  const {
    businessID,
    categoryID,
    productName,
    description,
    price,
    stock,
    availabilityStatus
  } = req.body;

  if (
    !businessID ||
    !categoryID ||
    !productName ||
    price === undefined ||
    stock === undefined ||
    !availabilityStatus
  ) {
    return res.status(400).json({
      ok: false,
      message: 'Completa todos los campos obligatorios del producto.'
    });
  }

  const sql = `
    INSERT INTO Products (
      businessID,
      categoryID,
      productName,
      description,
      price,
      stock,
      availabilityStatus,
      updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
  `;

  db.query(
    sql,
    [
      businessID,
      categoryID,
      productName,
      description || null,
      Number(price),
      Number(stock),
      availabilityStatus
    ],
    (err, result) => {
      if (err) {
        console.error('Error createProductoAdmin:', err);
        return res.status(500).json({
          ok: false,
          message: 'No se pudo crear el producto.'
        });
      }

      return res.status(201).json({
        ok: true,
        message: 'Producto creado correctamente.',
        productID: result.insertId
      });
    }
  );
};

module.exports = {
  renderCatalogoAdmin,
  getCatalogoAdminData,
  getCatalogoFormData,
  createCategoriaAdmin,
  createProductoAdmin
};
