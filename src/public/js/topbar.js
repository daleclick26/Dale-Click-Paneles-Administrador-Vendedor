// ============================
// 🔍 BÚSQUEDA GLOBAL
// ============================

const toggleBtn = document.getElementById("toggleBusqueda");
const inputBusqueda = document.getElementById("inputBusquedaGlobal");
const busquedaContainer = document.querySelector(".busqueda-container");
const notifyContainer = document.querySelector(".notificaciones-container");

toggleBtn?.addEventListener("click", (event) => {
  event.stopPropagation();
  inputBusqueda.classList.toggle("hidden");

  if (!inputBusqueda.classList.contains("hidden")) {
    inputBusqueda.focus();
  }
});

inputBusqueda?.addEventListener("blur", () => {
  setTimeout(() => {
    inputBusqueda.classList.add("hidden");
  }, 150);
});

document.addEventListener("click", (event) => {
  if (inputBusqueda && !inputBusqueda.classList.contains("hidden")) {
    const isInsideSearch = busquedaContainer?.contains(event.target);
    if (!isInsideSearch) {
      inputBusqueda.classList.add("hidden");
    }
  }

  if (dropdownNotif && !dropdownNotif.classList.contains("hidden")) {
    const isInsideNotif = notifyContainer?.contains(event.target);
    if (!isInsideNotif) {
      dropdownNotif.classList.add("hidden");
    }
  }
});

busquedaContainer?.addEventListener("pointerleave", () => {
  if (document.activeElement !== inputBusqueda) {
    inputBusqueda.classList.add("hidden");
  }
});

notifyContainer?.addEventListener("pointerleave", () => {
  dropdownNotif.classList.add("hidden");
});

inputBusqueda?.addEventListener("input", () => {
  const texto = inputBusqueda.value.toLowerCase();

  const elementos = document.querySelectorAll(
    ".tarjeta-resumen, .mini-tarjeta, .bloque-grafico"
  );

  elementos.forEach(el => {
    const contenido = el.textContent.toLowerCase();
    el.style.display = contenido.includes(texto) ? "" : "none";
  });
});


// ============================
// NOTIFICACIONES
// ============================

const btnNotif = document.getElementById("btnNotificaciones");
const dropdownNotif = document.getElementById("dropdownNotificaciones");
const listaNotif = document.getElementById("listaNotificaciones");
const esPanelAdmin = window.location.pathname.startsWith("/admin");

btnNotif?.addEventListener("click", async () => {
  dropdownNotif.classList.toggle("hidden");

  if (!listaNotif.dataset.loaded) {
    await cargarNotificaciones();
    listaNotif.dataset.loaded = "true";
  }
});

async function cargarNotificaciones() {
  try {
    if (esPanelAdmin) {
      const resAdmin = await fetch("/admin/notificaciones");

      if (!resAdmin.ok) {
        throw new Error("No se pudieron cargar las notificaciones del panel admin");
      }

      const notificaciones = await resAdmin.json();

      listaNotif.innerHTML = (notificaciones || [])
        .map((item) => `<li>${item.texto}</li>`)
        .join("") || "<li>Sin notificaciones por ahora</li>";

      return;
    }

    const resPedidos = await fetch("/pedidos/lista");

    if (!resPedidos.ok) {
      throw new Error("No se pudieron cargar los pedidos");
    }

    const pedidos = await resPedidos.json();

    const resClientes = await fetch("/clientes/lista");

    if (!resClientes.ok) {
      throw new Error("No se pudieron cargar los clientes");
    }

    const clientes = await resClientes.json();

    const notificaciones = [];

    pedidos.slice(0, 3).forEach(p => {
      notificaciones.push(`🛒 Pedido #${p.orderID} - ${p.orderStatus}`);
    });

    clientes.slice(0, 2).forEach(c => {
      notificaciones.push(`👤 Nuevo cliente: ${c.firstName}`);
    });

    listaNotif.innerHTML = notificaciones
      .map(n => `<li>${n}</li>`)
      .join("") || "<li>Sin notificaciones por ahora</li>";

  } catch (error) {
    console.error(error);
    listaNotif.innerHTML = "<li>Error cargando notificaciones</li>";
  }
}
