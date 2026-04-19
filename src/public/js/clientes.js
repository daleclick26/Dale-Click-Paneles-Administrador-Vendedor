document.addEventListener("DOMContentLoaded", () => {
  const inputBusqueda = document.getElementById("busquedaCliente");
  const filtroSegmento = document.getElementById("filtroSegmento");
  const filtroFecha = document.getElementById("filtroFecha");
  const ordenarClientes = document.getElementById("ordenarClientes");
  const tablaBody = document.getElementById("tablaClientesBody");
  const contadorClientesVisibles = document.getElementById("contadorClientesVisibles");

  const modalContacto = document.getElementById("modalContactoClienteOverlay");
  const formContacto = document.getElementById("formContactoCliente");
  const contactClientId = document.getElementById("contactClientId");
  const contactClientEmail = document.getElementById("contactClientEmail");
  const contactSubject = document.getElementById("contactSubject");
  const contactMessage = document.getElementById("contactMessage");

  function abrirModal(modal) {
    if (!modal) return;
    modal.classList.remove("hidden");
  }

  function cerrarModal(modal) {
    if (!modal) return;
    modal.classList.add("hidden");
  }

  function limpiarModalContacto() {
    if (!formContacto) return;
    formContacto.reset();
    if (contactClientId) contactClientId.value = "";
    if (contactClientEmail) contactClientEmail.value = "";
  }

  function convertirFechaTextoAISO(fechaTexto) {
    const [dia, mes, anio] = fechaTexto.split("/");
    return `${anio}-${mes}-${dia}`;
  }

  function actualizarContador() {
    if (!tablaBody || !contadorClientesVisibles) return;

    const filasVisibles = Array.from(tablaBody.querySelectorAll("tr")).filter((fila) => {
      if (fila.querySelector(".sin-resultados")) return false;
      return fila.style.display !== "none";
    });

    contadorClientesVisibles.textContent = filasVisibles.length;
  }

  function filtrarYOrdenarClientes() {
    if (!tablaBody) return;

    const textoBusqueda = (inputBusqueda?.value || "").trim().toLowerCase();
    const segmentoSeleccionado = (filtroSegmento?.value || "").trim().toLowerCase();
    const rangoFecha = (filtroFecha?.value || "").trim();
    const criterioOrden = (ordenarClientes?.value || "").trim();

    const filas = Array.from(tablaBody.querySelectorAll("tr"));

    filas.forEach((fila) => {
      if (fila.querySelector(".sin-resultados")) return;

      const idCliente = fila.children[0]?.textContent.trim().toLowerCase() || "";
      const nombre = fila.children[1]?.textContent.trim().toLowerCase() || "";
      const apellido = fila.children[2]?.textContent.trim().toLowerCase() || "";
      const contacto = fila.querySelector(".texto-contacto")?.textContent.toLowerCase() || "";
      const segmento = (fila.dataset.segmento || "").toLowerCase();
      const fechaData = fila.dataset.fecha || "";
      const hoy = new Date();

      const coincideBusqueda =
        idCliente.includes(textoBusqueda) ||
        nombre.includes(textoBusqueda) ||
        apellido.includes(textoBusqueda) ||
        contacto.includes(textoBusqueda);

      const coincideSegmento =
        !segmentoSeleccionado || segmento === segmentoSeleccionado;

      let coincideFecha = true;
      if (rangoFecha && fechaData) {
        const fechaCliente = new Date(fechaData);
        const diferenciaDias = Math.floor(
          (hoy - fechaCliente) / (1000 * 60 * 60 * 24)
        );
        coincideFecha = diferenciaDias <= Number(rangoFecha);
      }

      fila.style.display =
        coincideBusqueda && coincideSegmento && coincideFecha ? "" : "none";
    });

    const filasVisibles = filas.filter((fila) => {
      if (fila.querySelector(".sin-resultados")) return false;
      return fila.style.display !== "none";
    });

    filasVisibles.sort((a, b) => {
      const gastoA = Number(a.dataset.gasto || 0);
      const gastoB = Number(b.dataset.gasto || 0);
      const pedidosA = Number(a.dataset.pedidos || 0);
      const pedidosB = Number(b.dataset.pedidos || 0);
      const fechaA = new Date(
        a.dataset.fecha ||
          convertirFechaTextoAISO(a.querySelector(".celda-fecha")?.textContent.trim())
      );
      const fechaB = new Date(
        b.dataset.fecha ||
          convertirFechaTextoAISO(b.querySelector(".celda-fecha")?.textContent.trim())
      );

      switch (criterioOrden) {
        case "gasto-desc":
          return gastoB - gastoA;
        case "gasto-asc":
          return gastoA - gastoB;
        case "pedidos-desc":
          return pedidosB - pedidosA;
        case "fecha-desc":
          return fechaB - fechaA;
        case "fecha-asc":
          return fechaA - fechaB;
        default:
          return 0;
      }
    });

    filasVisibles.forEach((fila) => tablaBody.appendChild(fila));
    actualizarContador();
  }

  async function contactarCliente(data) {
    const response = await fetch("/clientes/contactar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    return response.json();
  }

  if (inputBusqueda) {
    inputBusqueda.addEventListener("input", filtrarYOrdenarClientes);
  }

  if (filtroSegmento) {
    filtroSegmento.addEventListener("change", filtrarYOrdenarClientes);
  }

  if (filtroFecha) {
    filtroFecha.addEventListener("change", filtrarYOrdenarClientes);
  }

  if (ordenarClientes) {
    ordenarClientes.addEventListener("change", filtrarYOrdenarClientes);
  }

  document.querySelectorAll("[data-close-modal]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const modalID = btn.getAttribute("data-close-modal");
      const modal = document.getElementById(modalID);
      cerrarModal(modal);
    });
  });

  if (modalContacto) {
    modalContacto.addEventListener("click", (e) => {
      if (e.target === modalContacto) {
        cerrarModal(modalContacto);
      }
    });
  }

  if (tablaBody) {
    tablaBody.addEventListener("click", (e) => {
      const botonContacto = e.target.closest(".btn-contacto-general");
      if (!botonContacto) return;

      const fila = botonContacto.closest("tr");
      if (!fila) return;

      limpiarModalContacto();

      if (contactClientId) {
        contactClientId.value = fila.dataset.clientId || "";
      }

      if (contactClientEmail) {
        contactClientEmail.value = fila.dataset.clientEmail || "";
      }

      const nombreCliente = fila.dataset.clientName || "cliente";
      if (contactSubject) {
        contactSubject.value = `Contacto de tu negocio para ${nombreCliente}`;
      }

      abrirModal(modalContacto);
    });
  }

  if (formContacto) {
    formContacto.addEventListener("submit", async (e) => {
      e.preventDefault();

      const data = {
        clientId: contactClientId.value,
        clientEmail: contactClientEmail.value,
        subject: contactSubject.value.trim(),
        message: contactMessage.value.trim()
      };

      if (!data.clientEmail || !data.subject || !data.message) {
        alert("Completa todos los campos del mensaje.");
        return;
      }

      try {
        const resultado = await contactarCliente(data);

        if (resultado.error) {
          alert(resultado.error);
          return;
        }

        alert(resultado.message || "Solicitud procesada correctamente.");
        cerrarModal(modalContacto);
        limpiarModalContacto();
      } catch (error) {
        console.error("Error al contactar cliente:", error);
        alert("No se pudo procesar el contacto del cliente.");
      }
    });
  }

  actualizarContador();
});