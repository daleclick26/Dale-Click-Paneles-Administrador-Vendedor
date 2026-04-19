document.addEventListener("DOMContentLoaded", () => {
  const inputBusqueda = document.getElementById("busquedaPedido");
  const filtroProducto = document.getElementById("filtroProductoPedido");
  const filtroEstado = document.getElementById("filtroEstadoPedido");
  const tablaBody = document.getElementById("tablaPedidosBody");

  const modalEstado = document.getElementById("modalEstado");
  const selectNuevoEstado = document.getElementById("nuevoEstadoPedido");
  const btnCerrarModal = document.getElementById("cerrarModalEstado");
  const btnCancelarModal = document.getElementById("cancelarCambioEstado");
  const btnConfirmarCambio = document.getElementById("confirmarCambioEstado");

  let orderIDSeleccionado = null;
  let filaSeleccionada = null;

  function normalizarTexto(texto) {
    return String(texto || "").trim().toLowerCase();
  }

  function abrirModal() {
    if (!modalEstado) return;
    modalEstado.classList.remove("hidden");
    modalEstado.setAttribute("aria-hidden", "false");
  }

  function cerrarModal() {
    if (!modalEstado) return;
    modalEstado.classList.add("hidden");
    modalEstado.setAttribute("aria-hidden", "true");
    orderIDSeleccionado = null;
    filaSeleccionada = null;
  }

  function actualizarBadgeEstado(fila, nuevoEstado) {
    if (!fila) return;

    const badge = fila.querySelector(".badge-estado");
    if (!badge) return;

    badge.textContent = nuevoEstado;
    badge.classList.remove("estado-reservado", "estado-entregado");

    if (normalizarTexto(nuevoEstado) === "entregado") {
      badge.classList.add("estado-entregado");
    } else {
      badge.classList.add("estado-reservado");
    }

    fila.dataset.orderStatus = nuevoEstado;

    const botonEditar = fila.querySelector(".boton-editar-estado");
    if (botonEditar) {
      botonEditar.dataset.orderStatus = nuevoEstado;
    }
  }

  function filtrarTabla() {
    const textoBusqueda = normalizarTexto(inputBusqueda?.value);
    const productoSeleccionado = normalizarTexto(filtroProducto?.value);
    const estadoSeleccionado = normalizarTexto(filtroEstado?.value);

    const filas = document.querySelectorAll("#tablaPedidosBody tr");

    filas.forEach((fila) => {
      if (fila.querySelector(".sin-resultados")) return;

      const idPedido = normalizarTexto(fila.querySelector(".id-pedido")?.textContent);
      const nombre = normalizarTexto(fila.querySelector(".nombre-cliente-pedido")?.textContent);
      const apellido = normalizarTexto(fila.querySelector(".apellido-cliente-pedido")?.textContent);
      const nombreProducto = normalizarTexto(fila.querySelector(".nombre-producto-pedido")?.textContent);
      const estadoActual = normalizarTexto(fila.dataset.orderStatus);

      const coincideBusqueda =
        !textoBusqueda ||
        idPedido.includes(textoBusqueda) ||
        nombre.includes(textoBusqueda) ||
        apellido.includes(textoBusqueda);

      const coincideProducto =
        !productoSeleccionado || nombreProducto === productoSeleccionado;

      const coincideEstado =
        !estadoSeleccionado || estadoActual === estadoSeleccionado;

      fila.style.display =
        coincideBusqueda && coincideProducto && coincideEstado ? "" : "none";
    });
  }

  async function actualizarEstadoPedido(orderID, orderStatus) {
    const response = await fetch(`/pedidos/${orderID}/estado`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ orderStatus })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || "No se pudo actualizar el estado del pedido.");
    }

    return data;
  }

  if (tablaBody) {
    tablaBody.addEventListener("click", (e) => {
      const botonEditar = e.target.closest(".boton-editar-estado");
      if (!botonEditar) return;

      filaSeleccionada = botonEditar.closest("tr");
      orderIDSeleccionado = botonEditar.dataset.orderId || filaSeleccionada?.dataset.orderId;

      const estadoActual =
        botonEditar.dataset.orderStatus ||
        filaSeleccionada?.dataset.orderStatus ||
        "";

      if (selectNuevoEstado) {
        selectNuevoEstado.value = estadoActual;
      }

      abrirModal();
    });
  }

  if (btnCerrarModal) {
    btnCerrarModal.addEventListener("click", cerrarModal);
  }

  if (btnCancelarModal) {
    btnCancelarModal.addEventListener("click", cerrarModal);
  }

  if (modalEstado) {
    modalEstado.addEventListener("click", (e) => {
      if (e.target === modalEstado) {
        cerrarModal();
      }
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modalEstado && !modalEstado.classList.contains("hidden")) {
      cerrarModal();
    }
  });

  if (btnConfirmarCambio) {
    btnConfirmarCambio.addEventListener("click", async () => {
      if (!orderIDSeleccionado || !selectNuevoEstado) return;

      const nuevoEstado = selectNuevoEstado.value;
      const textoOriginal = btnConfirmarCambio.textContent;

      btnConfirmarCambio.disabled = true;
      btnConfirmarCambio.textContent = "Guardando...";

      try {
        const resultado = await actualizarEstadoPedido(orderIDSeleccionado, nuevoEstado);

        if (resultado?.error) {
          throw new Error(resultado.error);
        }

        actualizarBadgeEstado(filaSeleccionada, nuevoEstado);
        filtrarTabla();
        cerrarModal();
      } catch (error) {
        console.error("Error al actualizar estado del pedido:", error);
        alert(error.message || "No se pudo actualizar el estado del pedido.");
      } finally {
        btnConfirmarCambio.disabled = false;
        btnConfirmarCambio.textContent = textoOriginal;
      }
    });
  }

  if (inputBusqueda) {
    inputBusqueda.addEventListener("input", filtrarTabla);
  }

  if (filtroProducto) {
    filtroProducto.addEventListener("change", filtrarTabla);
  }

  if (filtroEstado) {
    filtroEstado.addEventListener("change", filtrarTabla);
  }
});