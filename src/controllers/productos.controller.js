const db = require('../config/db');

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
      businessName
    FROM BusinessProfiles
    WHERE userID = ?
    LIMIT 1
  `;

  db.query(query, [userID], (error, rows) => {
    if (error) return callback(error);
    callback(null, rows[0] || null);
  });
}

function getCategoriasQuery(callback) {
  const query = `
    SELECT categoryID, categoryName
    FROM Categories
    ORDER BY categoryName ASC
  `;

  db.query(query, (error, rows) => {
    if (error) return callback(error);
    callback(null, rows || []);
  });
}

function getProductosByBusiness(businessID, callback) {
  const query = `
    SELECT
      p.productID,
      p.businessID,
      p.categoryID,
      p.productName,
      p.description,
      p.price,
      p.stock,
      p.availabilityStatus,
      p.createdAt,
      p.updatedAt,
      c.categoryName,
      (
        SELECT pi.imageURL
        FROM ProductImages pi
        WHERE pi.productID = p.productID
        ORDER BY pi.imageID DESC
        LIMIT 1
      ) AS imageURL
    FROM Products p
    INNER JOIN Categories c ON c.categoryID = p.categoryID
    WHERE p.businessID = ?
    ORDER BY p.productID DESC
  `;

  db.query(query, [businessID], (error, rows) => {
    if (error) return callback(error);
    callback(null, rows || []);
  });
}

function getProductoByIDAndBusiness(productID, businessID, callback) {
  const query = `
    SELECT
      productID,
      businessID,
      categoryID,
      productName,
      description,
      price,
      stock,
      availabilityStatus
    FROM Products
    WHERE productID = ? AND businessID = ?
    LIMIT 1
  `;

  db.query(query, [productID, businessID], (error, rows) => {
    if (error) return callback(error);
    callback(null, rows[0] || null);
  });
}

function getImagenesByBusiness(businessID, callback) {
  const query = `
    SELECT
      pi.imageID,
      pi.productID,
      pi.imageURL
    FROM ProductImages pi
    INNER JOIN Products p ON p.productID = pi.productID
    WHERE p.businessID = ?
    ORDER BY pi.imageID DESC
  `;

  db.query(query, [businessID], (error, rows) => {
    if (error) return callback(error);
    callback(null, rows || []);
  });
}

function getImagenByIDAndBusiness(imageID, businessID, callback) {
  const query = `
    SELECT
      pi.imageID,
      pi.productID,
      pi.imageURL
    FROM ProductImages pi
    INNER JOIN Products p ON p.productID = pi.productID
    WHERE pi.imageID = ? AND p.businessID = ?
    LIMIT 1
  `;

  db.query(query, [imageID, businessID], (error, rows) => {
    if (error) return callback(error);
    callback(null, rows[0] || null);
  });
}

function getContextoUsuarioNegocio(req, callback) {
  const usuarioSesion = getUsuarioSesion(req);

  if (!usuarioSesion?.userID) {
    return callback(new Error('No hay sesión activa.'));
  }

  getUsuarioActual(usuarioSesion.userID, (errorUsuario, usuario) => {
    if (errorUsuario) return callback(errorUsuario);

    if (!usuario) {
      return callback(new Error('Usuario no encontrado.'));
    }

    getBusinessByUser(usuario.userID, (errorBusiness, business) => {
      if (errorBusiness) return callback(errorBusiness);

      if (!business) {
        return callback(new Error('El usuario no tiene negocio asociado.'));
      }

      const usuarioLimpio = {
        ...usuario,
        profileImageURL:
          usuario.profileImageURL && String(usuario.profileImageURL).trim() !== ''
            ? usuario.profileImageURL
            : null
      };

      callback(null, {
        usuario: usuarioLimpio,
        business
      });
    });
  });
}

exports.renderProductosPage = (req, res) => {
  getContextoUsuarioNegocio(req, (contextoError, contexto) => {
    if (contextoError) {
      console.error('Error al cargar contexto de productos:', contextoError);

      if (contextoError.message === 'No hay sesión activa.') {
        return res.redirect('/login');
      }

      return res.status(500).send('Error al cargar productos');
    }

    getCategoriasQuery((errorCategorias, categorias) => {
      if (errorCategorias) {
        console.error('Error al obtener categorías:', errorCategorias);
        return res.status(500).send('Error al cargar categorías');
      }

      getProductosByBusiness(contexto.business.businessID, (errorProductos, productos) => {
        if (errorProductos) {
          console.error('Error al obtener productos:', errorProductos);
          return res.status(500).send('Error al cargar productos');
        }

        return res.render('emprendedor/productos', {
          activePage: 'productos',
          usuario: contexto.usuario,
          businessID: contexto.business.businessID,
          categorias,
          estados: ['Disponible', 'No disponible'],
          productos
        });
      });
    });
  });
};

exports.getCategorias = (req, res) => {
  getCategoriasQuery((error, categorias) => {
    if (error) {
      console.error('Error al obtener categorías:', error);
      return res.status(500).json({ error: 'Error al obtener categorías' });
    }

    return res.json(categorias);
  });
};

exports.getEstados = (req, res) => {
  return res.json([
    { value: 'Disponible', label: 'Disponible' },
    { value: 'No disponible', label: 'No disponible' }
  ]);
};

exports.getProductos = (req, res) => {
  getContextoUsuarioNegocio(req, (contextoError, contexto) => {
    if (contextoError) {
      console.error('Error al obtener contexto del usuario:', contextoError);

      if (contextoError.message === 'No hay sesión activa.') {
        return res.status(401).json({ error: 'Sesión no válida' });
      }

      return res.status(500).json({ error: 'Error al obtener productos' });
    }

    getProductosByBusiness(contexto.business.businessID, (error, productos) => {
      if (error) {
        console.error('Error al obtener productos:', error);
        return res.status(500).json({ error: 'Error al obtener productos' });
      }

      return res.json(productos);
    });
  });
};

exports.createProducto = (req, res) => {
  getContextoUsuarioNegocio(req, (contextoError, contexto) => {
    if (contextoError) {
      console.error('Error al crear producto:', contextoError);

      if (contextoError.message === 'No hay sesión activa.') {
        return res.status(401).json({ error: 'Sesión no válida' });
      }

      return res.status(500).json({ error: 'Error al crear producto' });
    }

    const {
      categoryID,
      productName,
      description,
      price,
      stock,
      availabilityStatus
    } = req.body;

    const businessID = contexto.business.businessID;

    const query = `
      INSERT INTO Products (
        businessID,
        categoryID,
        productName,
        description,
        price,
        stock,
        availabilityStatus,
        createdAt,
        updatedAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const values = [
      businessID,
      categoryID,
      productName,
      description || '',
      price,
      stock,
      availabilityStatus
    ];

    db.query(query, values, (error, result) => {
      if (error) {
        console.error('Error al crear producto:', error);
        return res.status(500).json({ error: 'Error al crear producto' });
      }

      return res.status(201).json({
        message: 'Producto creado correctamente',
        productID: result.insertId
      });
    });
  });
};

exports.updateProducto = (req, res) => {
  getContextoUsuarioNegocio(req, (contextoError, contexto) => {
    if (contextoError) {
      console.error('Error al actualizar producto:', contextoError);

      if (contextoError.message === 'No hay sesión activa.') {
        return res.status(401).json({ error: 'Sesión no válida' });
      }

      return res.status(500).json({ error: 'Error al actualizar producto' });
    }

    const { id } = req.params;
    const {
      categoryID,
      productName,
      description,
      price,
      stock,
      availabilityStatus
    } = req.body;

    getProductoByIDAndBusiness(id, contexto.business.businessID, (findError, producto) => {
      if (findError) {
        console.error('Error validando producto:', findError);
        return res.status(500).json({ error: 'Error al actualizar producto' });
      }

      if (!producto) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }

      const query = `
        UPDATE Products
        SET
          categoryID = ?,
          productName = ?,
          description = ?,
          price = ?,
          stock = ?,
          availabilityStatus = ?,
          updatedAt = NOW()
        WHERE productID = ? AND businessID = ?
      `;

      const values = [
        categoryID,
        productName,
        description || '',
        price,
        stock,
        availabilityStatus,
        id,
        contexto.business.businessID
      ];

      db.query(query, values, (error, result) => {
        if (error) {
          console.error('Error al actualizar producto:', error);
          return res.status(500).json({ error: 'Error al actualizar producto' });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({ error: 'Producto no encontrado' });
        }

        return res.json({ message: 'Producto actualizado correctamente' });
      });
    });
  });
};

exports.deleteProducto = (req, res) => {
  getContextoUsuarioNegocio(req, (contextoError, contexto) => {
    if (contextoError) {
      console.error('Error al eliminar producto:', contextoError);

      if (contextoError.message === 'No hay sesión activa.') {
        return res.status(401).json({ error: 'Sesión no válida' });
      }

      return res.status(500).json({ error: 'Error al borrar producto' });
    }

    const { id } = req.params;

    getProductoByIDAndBusiness(id, contexto.business.businessID, (findError, producto) => {
      if (findError) {
        console.error('Error validando producto:', findError);
        return res.status(500).json({ error: 'Error al borrar producto' });
      }

      if (!producto) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }

      const deleteImagesQuery = `
        DELETE FROM ProductImages
        WHERE productID = ?
      `;

      const deleteProductQuery = `
        DELETE FROM Products
        WHERE productID = ? AND businessID = ?
      `;

      db.query(deleteImagesQuery, [id], (errorImages) => {
        if (errorImages) {
          console.error('Error al borrar imágenes del producto:', errorImages);
          return res.status(500).json({ error: 'Error al borrar producto' });
        }

        db.query(deleteProductQuery, [id, contexto.business.businessID], (errorProduct, result) => {
          if (errorProduct) {
            console.error('Error al borrar producto:', errorProduct);
            return res.status(500).json({ error: 'Error al borrar producto' });
          }

          if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
          }

          return res.json({ message: 'Producto eliminado correctamente' });
        });
      });
    });
  });
};

exports.getImagenes = (req, res) => {
  getContextoUsuarioNegocio(req, (contextoError, contexto) => {
    if (contextoError) {
      console.error('Error al obtener imágenes:', contextoError);

      if (contextoError.message === 'No hay sesión activa.') {
        return res.status(401).json({ error: 'Sesión no válida' });
      }

      return res.status(500).json({ error: 'Error al obtener imágenes' });
    }

    getImagenesByBusiness(contexto.business.businessID, (error, imagenes) => {
      if (error) {
        console.error('Error al obtener imágenes:', error);
        return res.status(500).json({ error: 'Error al obtener imágenes' });
      }

      return res.json(imagenes);
    });
  });
};

exports.addImagenProducto = (req, res) => {
  getContextoUsuarioNegocio(req, (contextoError, contexto) => {
    if (contextoError) {
      console.error('Error al agregar imagen:', contextoError);

      if (contextoError.message === 'No hay sesión activa.') {
        return res.status(401).json({ error: 'Sesión no válida' });
      }

      return res.status(500).json({ error: 'Error al agregar imagen' });
    }

    const { productID, imageURL } = req.body;

    getProductoByIDAndBusiness(productID, contexto.business.businessID, (findError, producto) => {
      if (findError) {
        console.error('Error validando producto para imagen:', findError);
        return res.status(500).json({ error: 'Error al agregar imagen' });
      }

      if (!producto) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }

      const query = `
        INSERT INTO ProductImages (productID, imageURL)
        VALUES (?, ?)
      `;

      db.query(query, [productID, imageURL], (error, result) => {
        if (error) {
          console.error('Error al agregar imagen:', error);
          return res.status(500).json({ error: 'Error al agregar imagen' });
        }

        return res.status(201).json({
          message: 'Imagen agregada correctamente',
          imageID: result.insertId
        });
      });
    });
  });
};

exports.updateImagenProducto = (req, res) => {
  getContextoUsuarioNegocio(req, (contextoError, contexto) => {
    if (contextoError) {
      console.error('Error al actualizar imagen:', contextoError);

      if (contextoError.message === 'No hay sesión activa.') {
        return res.status(401).json({ error: 'Sesión no válida' });
      }

      return res.status(500).json({ error: 'Error al actualizar imagen' });
    }

    const { id } = req.params;
    const { productID, imageURL } = req.body;

    getProductoByIDAndBusiness(productID, contexto.business.businessID, (productoError, producto) => {
      if (productoError) {
        console.error('Error validando producto de la imagen:', productoError);
        return res.status(500).json({ error: 'Error al actualizar imagen' });
      }

      if (!producto) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }

      getImagenByIDAndBusiness(id, contexto.business.businessID, (imagenError, imagen) => {
        if (imagenError) {
          console.error('Error validando imagen:', imagenError);
          return res.status(500).json({ error: 'Error al actualizar imagen' });
        }

        if (!imagen) {
          return res.status(404).json({ error: 'Imagen no encontrada' });
        }

        const query = `
          UPDATE ProductImages
          SET productID = ?, imageURL = ?
          WHERE imageID = ?
        `;

        db.query(query, [productID, imageURL, id], (error, result) => {
          if (error) {
            console.error('Error al actualizar imagen:', error);
            return res.status(500).json({ error: 'Error al actualizar imagen' });
          }

          if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Imagen no encontrada' });
          }

          return res.json({ message: 'Imagen actualizada correctamente' });
        });
      });
    });
  });
};

exports.deleteImagenProducto = (req, res) => {
  getContextoUsuarioNegocio(req, (contextoError, contexto) => {
    if (contextoError) {
      console.error('Error al borrar imagen:', contextoError);

      if (contextoError.message === 'No hay sesión activa.') {
        return res.status(401).json({ error: 'Sesión no válida' });
      }

      return res.status(500).json({ error: 'Error al borrar imagen' });
    }

    const { id } = req.params;

    getImagenByIDAndBusiness(id, contexto.business.businessID, (findError, imagen) => {
      if (findError) {
        console.error('Error validando imagen:', findError);
        return res.status(500).json({ error: 'Error al borrar imagen' });
      }

      if (!imagen) {
        return res.status(404).json({ error: 'Imagen no encontrada' });
      }

      const query = `
        DELETE FROM ProductImages
        WHERE imageID = ?
      `;

      db.query(query, [id], (error, result) => {
        if (error) {
          console.error('Error al borrar imagen:', error);
          return res.status(500).json({ error: 'Error al borrar imagen' });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({ error: 'Imagen no encontrada' });
        }

        return res.json({ message: 'Imagen eliminada correctamente' });
      });
    });
  });
};