document.addEventListener("DOMContentLoaded", () => {
  const rutaActual = window.location.pathname;
  const enlaces = document.querySelectorAll(".menu-item");
  const botonMenu = document.querySelector(".boton-menu");
  const sidebar = document.querySelector(".sidebar");

  enlaces.forEach(enlace => {
    const href = enlace.getAttribute("href");
    if (href === rutaActual) {
      enlace.classList.add("activo");
    }
  });

  // TOGGLE SIDEBAR
  botonMenu?.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
    document.body.classList.toggle("sidebar-collapsed");
  });
});