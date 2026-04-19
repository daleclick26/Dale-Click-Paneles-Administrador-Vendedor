document.addEventListener("DOMContentLoaded", () => {
  const rutaActual = window.location.pathname;
  const enlaces = document.querySelectorAll(".menu-item");
  const botonMenu = document.querySelector(".boton-menu");
  const sidebar = document.querySelector(".sidebar");
  const mobileQuery = window.matchMedia("(max-width: 900px)");

  function cerrarSidebarMobile() {
    if (!mobileQuery.matches || !sidebar) return;
    sidebar.classList.remove("is-open");
    document.body.classList.remove("sidebar-open");
  }

  function sincronizarSidebar() {
    if (!sidebar) return;

    if (mobileQuery.matches) {
      sidebar.classList.remove("collapsed");
      document.body.classList.remove("sidebar-collapsed");
      cerrarSidebarMobile();
      return;
    }

    sidebar.classList.remove("is-open");
    document.body.classList.remove("sidebar-open");
  }

  enlaces.forEach(enlace => {
    const href = enlace.getAttribute("href");
    if (href === rutaActual) {
      enlace.classList.add("activo");
    }

    enlace.addEventListener("click", () => {
      cerrarSidebarMobile();
    });
  });

  sincronizarSidebar();
  mobileQuery.addEventListener("change", sincronizarSidebar);

  botonMenu?.addEventListener("click", () => {
    if (!sidebar) return;

    if (mobileQuery.matches) {
      const abierto = sidebar.classList.toggle("is-open");
      document.body.classList.toggle("sidebar-open", abierto);
      return;
    }

    sidebar.classList.toggle("collapsed");
    document.body.classList.toggle("sidebar-collapsed");
  });

  document.addEventListener("click", (event) => {
    if (!mobileQuery.matches || !sidebar) return;
    if (!sidebar.classList.contains("is-open")) return;

    const clickEnSidebar = sidebar.contains(event.target);
    const clickEnBoton = botonMenu?.contains(event.target);

    if (!clickEnSidebar && !clickEnBoton) {
      cerrarSidebarMobile();
    }
  });
});
