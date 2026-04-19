document.addEventListener("DOMContentLoaded", () => {
  const seccionProductos = document.querySelector(".seccion-productos");

  const inputBusqueda = document.getElementById("busquedaProducto");
  const filtroCategoria = document.getElementById("filtroCategoria");
  const filtroEstado = document.getElementById("filtroEstado");
  const tablaBody = document.getElementById("tablaProductosBody");

  const btnAbrirModalCrear = document.getElementById("btnAbrirModalCrear");

  const modalCrear = document.getElementById("modalCrearProductoOverlay");
  const modalEditar = document.getElementById("modalEditarProductoOverlay");
  const modalEliminar = document.getElementById("modalEliminarProductoOverlay");
  const modalImagen = document.getElementById("modalImagenProductoOverlay");

  const formCrear = document.getElementById("formCrearProducto");
  const formEditar = document.getElementById("formEditarProducto");
  const formImagen = document.getElementById("formImagenProducto");

  const confirmarEliminarBtn = document.getElementById("confirmarEliminarProducto");

  const crearBusinessID = document.getElementById("crearBusinessID");

  const editarProductID = document.getElementById("editarProductID");
  const editarCategoryID = document.getElementById("editarCategoryID");
  const editarProductName = document.getElementById("editarProductName");
  const editarDescription = document.getElementById("editarDescription");
  const editarPrice = document.getElementById("editarPrice");
  const editarStock = document.getElementById("editarStock");
  const editarAvailabilityStatus = document.getElementById("editarAvailabilityStatus");

  const imagenID = document.getElementById("imagenID");
  const imagenProductID = document.getElementById("imagenProductID");
  const imagenURL = document.getElementById("imagenURL");

  const btnAgregarImagen = document.getElementById("btnAgregarImagen");
  const btnActualizarImagen = document.getElementById("btnActualizarImagen");
  const btnBorrarImagen = document.getElementById("btnBorrarImagen");

  let productoAEliminar = null;

  function abrirModal(modal) {
    if (!modal) return;
    modal.classList.remove("hidden");
  }

  function cerrarModal(modal) {
    if (!modal) return;
    modal.classList.add("hidden");
  }

  function limpiarFormularioCrear() {
    if (formCrear) formCrear.reset();

    const businessID = seccionProductos?.dataset.businessId || "";
    if (crearBusinessID) crearBusinessID.value = businessID;
  }

  function limpiarFormularioImagen() {
    if (formImagen) formImagen.reset();
    if (imagenID) imagenID.value = "";
  }

  function filtrarTabla() {
    const texto = (inputBusqueda?.value || "").toLowerCase().trim();
    const categoriaSeleccionada = (filtroCategoria?.value || "").toLowerCase().trim();
    const estadoSeleccionado = (filtroEstado?.value || "").toLowerCase().trim();

    const filas = document.querySelectorAll("#tablaProductosBody tr");

    filas.forEach((fila) => {
      if (fila.querySelector(".sin-resultados")) return;

      const nombre = fila.querySelector(".nombre-producto")?.textContent.toLowerCase() || "";
      const descripcion = fila.querySelector(".info-producto p")?.textContent.toLowerCase() || "";
      const categoria = fila.dataset.categoryName?.toLowerCase().trim() || "";
      const estado = fila.querySelector(".estado")?.textContent.toLowerCase().trim() || "";

      const coincideTexto = nombre.includes(texto) || descripcion.includes(texto);
      const coincideCategoria = !categoriaSeleccionada || categoria === categoriaSeleccionada;
      const coincideEstado = !estadoSeleccionado || estado === estadoSeleccionado;

      fila.style.display = coincideTexto && coincideCategoria && coincideEstado ? "" : "none";
    });
  }

  function obtenerDatosFila(fila) {
    return {
      productID: fila.dataset.productId,
      businessID: fila.dataset.businessId,
      categoryID: fila.dataset.categoryId,
      categoryName: fila.dataset.categoryName,
      productName: fila.dataset.productName,
      description: fila.dataset.description,
      price: fila.dataset.price,
      stock: fila.dataset.stock,
      availabilityStatus: fila.dataset.status,
      imageURL: fila.dataset.imageUrl
    };
  }

  async function crearProducto(data) {
    const response = await fetch("/productos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    return response.json();
  }

  async function actualizarProducto(productID, data) {
    const response = await fetch(`/productos/${productID}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    return response.json();
  }

  async function eliminarProducto(productID) {
    const response = await fetch(`/productos/${productID}`, {
      method: "DELETE"
    });

    return response.json();
  }

  async function obtenerImagenes() {
    const response = await fetch("/productos/imagenes");
    return response.json();
  }

  async function agregarImagen(data) {
    const response = await fetch("/productos/imagenes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    return response.json();
  }

  async function actualizarImagen(id, data) {
    const response = await fetch(`/productos/imagenes/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    return response.json();
  }

  async function borrarImagen(id) {
    const response = await fetch(`/productos/imagenes/${id}`, {
      method: "DELETE"
    });

    return response.json();
  }

  if (btnAbrirModalCrear) {
    btnAbrirModalCrear.addEventListener("click", () => {
      limpiarFormularioCrear();
      abrirModal(modalCrear);
    });
  }

  document.querySelectorAll("[data-close-modal]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const modalID = btn.getAttribute("data-close-modal");
      const modal = document.getElementById(modalID);
      cerrarModal(modal);
    });
  });

  [modalCrear, modalEditar, modalEliminar, modalImagen].forEach((modal) => {
    if (!modal) return;

    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        cerrarModal(modal);
      }
    });
  });

  if (inputBusqueda) inputBusqueda.addEventListener("input", filtrarTabla);
  if (filtroCategoria) filtroCategoria.addEventListener("change", filtrarTabla);
  if (filtroEstado) filtroEstado.addEventListener("change", filtrarTabla);

  if (formCrear) {
    formCrear.addEventListener("submit", async (e) => {
      e.preventDefault();

      const formData = new FormData(formCrear);
      const data = Object.fromEntries(formData.entries());

      data.price = parseFloat(data.price);
      data.stock = parseInt(data.stock, 10);
      data.categoryID = parseInt(data.categoryID, 10);

      if (data.businessID) {
        data.businessID = parseInt(data.businessID, 10);
      }

      try {
        const resultado = await crearProducto(data);

        if (resultado.error) {
          alert(resultado.error);
          return;
        }

        cerrarModal(modalCrear);
        window.location.reload();
      } catch (error) {
        console.error("Error al crear producto:", error);
        alert("No se pudo crear el producto.");
      }
    });
  }

  if (tablaBody) {
    tablaBody.addEventListener("click", async (e) => {
      const botonEditar = e.target.closest(".btn-editar-producto");
      const botonEliminar = e.target.closest(".btn-eliminar-producto");
      const botonImagen = e.target.closest(".btn-imagen-producto");

      if (botonEditar) {
        const fila = botonEditar.closest("tr");
        if (!fila) return;

        const datos = obtenerDatosFila(fila);

        editarProductID.value = datos.productID;
        editarCategoryID.value = datos.categoryID;
        editarProductName.value = datos.productName;
        editarDescription.value = datos.description;
        editarPrice.value = datos.price;
        editarStock.value = datos.stock;
        editarAvailabilityStatus.value = datos.availabilityStatus;

        abrirModal(modalEditar);
      }

      if (botonEliminar) {
        const fila = botonEliminar.closest("tr");
        if (!fila) return;

        productoAEliminar = fila.dataset.productId;
        abrirModal(modalEliminar);
      }

      if (botonImagen) {
        const fila = botonImagen.closest("tr");
        if (!fila) return;

        const datos = obtenerDatosFila(fila);

        limpiarFormularioImagen();
        imagenProductID.value = datos.productID;
        imagenURL.value = datos.imageURL || "";

        try {
          const imagenes = await obtenerImagenes();
          const imagenExistente = imagenes.find(
            (img) => Number(img.productID) === Number(datos.productID)
          );

          if (imagenExistente) {
            imagenID.value = imagenExistente.imageID;
            imagenURL.value = imagenExistente.imageURL || "";
          }
        } catch (error) {
          console.error("Error al cargar imágenes:", error);
        }

        abrirModal(modalImagen);
      }
    });
  }

  if (formEditar) {
    formEditar.addEventListener("submit", async (e) => {
      e.preventDefault();

      const productID = editarProductID.value;

      const data = {
        categoryID: parseInt(editarCategoryID.value, 10),
        productName: editarProductName.value.trim(),
        description: editarDescription.value.trim(),
        price: parseFloat(editarPrice.value),
        stock: parseInt(editarStock.value, 10),
        availabilityStatus: editarAvailabilityStatus.value
      };

      try {
        const resultado = await actualizarProducto(productID, data);

        if (resultado.error) {
          alert(resultado.error);
          return;
        }

        cerrarModal(modalEditar);
        window.location.reload();
      } catch (error) {
        console.error("Error al actualizar producto:", error);
        alert("No se pudo actualizar el producto.");
      }
    });
  }

  if (confirmarEliminarBtn) {
    confirmarEliminarBtn.addEventListener("click", async () => {
      if (!productoAEliminar) return;

      try {
        const resultado = await eliminarProducto(productoAEliminar);

        if (resultado.error) {
          alert(resultado.error);
          return;
        }

        cerrarModal(modalEliminar);
        productoAEliminar = null;
        window.location.reload();
      } catch (error) {
        console.error("Error al eliminar producto:", error);
        alert("No se pudo eliminar el producto.");
      }
    });
  }

  if (btnAgregarImagen) {
    btnAgregarImagen.addEventListener("click", async () => {
      const data = {
        productID: parseInt(imagenProductID.value, 10),
        imageURL: imagenURL.value.trim()
      };

      if (!data.productID || !data.imageURL) {
        alert("Completa los campos de imagen.");
        return;
      }

      try {
        const resultado = await agregarImagen(data);

        if (resultado.error) {
          alert(resultado.error);
          return;
        }

        cerrarModal(modalImagen);
        window.location.reload();
      } catch (error) {
        console.error("Error al agregar imagen:", error);
        alert("No se pudo agregar la imagen.");
      }
    });
  }

  if (btnActualizarImagen) {
    btnActualizarImagen.addEventListener("click", async () => {
      const id = imagenID.value;

      if (!id) {
        alert("No hay imagen registrada para actualizar.");
        return;
      }

      const data = {
        productID: parseInt(imagenProductID.value, 10),
        imageURL: imagenURL.value.trim()
      };

      try {
        const resultado = await actualizarImagen(id, data);

        if (resultado.error) {
          alert(resultado.error);
          return;
        }

        cerrarModal(modalImagen);
        window.location.reload();
      } catch (error) {
        console.error("Error al actualizar imagen:", error);
        alert("No se pudo actualizar la imagen.");
      }
    });
  }

  if (btnBorrarImagen) {
    btnBorrarImagen.addEventListener("click", async () => {
      const id = imagenID.value;

      if (!id) {
        alert("No hay imagen registrada para borrar.");
        return;
      }

      try {
        const resultado = await borrarImagen(id);

        if (resultado.error) {
          alert(resultado.error);
          return;
        }

        cerrarModal(modalImagen);
        window.location.reload();
      } catch (error) {
        console.error("Error al borrar imagen:", error);
        alert("No se pudo borrar la imagen.");
      }
    });
  }
});