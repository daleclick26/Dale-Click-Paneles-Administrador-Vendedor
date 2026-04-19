document.addEventListener("DOMContentLoaded", () => {
  const seccionTablero = document.querySelector(".seccion-tablero");
  const filtroPeriodo = document.getElementById("filtroPeriodoTablero");

  if (!seccionTablero) return;

  const ventasRaw = seccionTablero.dataset.chartVentas || "[]";
  const estadosRaw = seccionTablero.dataset.chartEstados || "[]";

  let chartVentasMes = null;
  let chartPedidosEstado = null;

  function parseJSONSeguro(value, fallback = []) {
    try {
      return JSON.parse(value);
    } catch (error) {
      console.error("Error parseando JSON del tablero:", error);
      return fallback;
    }
  }

  function crearGraficoVentas(data) {
    const canvas = document.getElementById("graficoVentasMes");
    if (!canvas) return;

    const rows = parseJSONSeguro(data);
    const labels = rows.map((item) => item.mes || "");
    const values = rows.map((item) => Number(item.totalVentas || 0));

    if (chartVentasMes) {
      chartVentasMes.destroy();
    }

    chartVentasMes = new Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Ventas",
            data: values,
            tension: 0.35,
            fill: false,
            borderWidth: 3,
            pointRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  function crearGraficoEstados(data) {
    const canvas = document.getElementById("graficoPedidosEstado");
    if (!canvas) return;

    const rows = parseJSONSeguro(data);
    const labels = rows.map((item) => item.orderStatus || "Sin estado");
    const values = rows.map((item) => Number(item.total || 0));

    if (chartPedidosEstado) {
      chartPedidosEstado.destroy();
    }

    chartPedidosEstado = new Chart(canvas, {
      type: "doughnut",
      data: {
        labels,
        datasets: [
          {
            label: "Pedidos",
            data: values,
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom"
          }
        }
      }
    });
  }

  function actualizarLinksCSV(periodo) {
    document.querySelectorAll(".boton-exportar").forEach((link) => {
      try {
        const url = new URL(link.href, window.location.origin);
        url.searchParams.set("periodo", periodo);
        link.href = url.pathname + url.search;
      } catch (error) {
        console.error("Error actualizando link CSV:", error);
      }
    });
  }

  if (filtroPeriodo) {
    filtroPeriodo.addEventListener("change", () => {
      const periodo = filtroPeriodo.value || "30";
      const url = new URL(window.location.href);
      url.searchParams.set("periodo", periodo);
      window.location.href = url.toString();
    });
  }

  crearGraficoVentas(ventasRaw);
  crearGraficoEstados(estadosRaw);
  actualizarLinksCSV(seccionTablero.dataset.periodo || "30");
});