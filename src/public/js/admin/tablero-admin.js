document.addEventListener('DOMContentLoaded', () => {
  const dashboard = document.getElementById('adminDashboard');

  let negociosLabels = ['Sin datos'];
  let negociosValues = [0];
  let productosLabels = ['Sin datos'];
  let productosValues = [0];

  if (dashboard) {
    try {
      const rawNegociosLabels = dashboard.dataset.negociosLabels || '[]';
      const rawNegociosValues = dashboard.dataset.negociosValues || '[]';
      const rawProductosLabels = dashboard.dataset.productosLabels || '[]';
      const rawProductosValues = dashboard.dataset.productosValues || '[]';

      const parsedNegociosLabels = JSON.parse(rawNegociosLabels);
      const parsedNegociosValues = JSON.parse(rawNegociosValues);
      const parsedProductosLabels = JSON.parse(rawProductosLabels);
      const parsedProductosValues = JSON.parse(rawProductosValues);

      if (Array.isArray(parsedNegociosLabels) && parsedNegociosLabels.length) {
        negociosLabels = parsedNegociosLabels;
      }

      if (Array.isArray(parsedNegociosValues) && parsedNegociosValues.length) {
        negociosValues = parsedNegociosValues;
      }

      if (Array.isArray(parsedProductosLabels) && parsedProductosLabels.length) {
        productosLabels = parsedProductosLabels;
      }

      if (Array.isArray(parsedProductosValues) && parsedProductosValues.length) {
        productosValues = parsedProductosValues;
      }
    } catch (error) {
      console.error('Error leyendo datos del dashboard admin:', error);
    }
  }

  const ctxNegocios = document.getElementById('chartTopNegocios');
  if (ctxNegocios) {
    new Chart(ctxNegocios, {
      type: 'bar',
      data: {
        labels: negociosLabels,
        datasets: [
          {
            label: 'Pedidos',
            data: negociosValues,
            borderWidth: 1,
            borderRadius: 8,
            backgroundColor: 'rgba(66, 153, 225, 0.55)',
            borderColor: 'rgba(49, 130, 206, 1)'
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
            beginAtZero: true,
            ticks: {
              precision: 0
            }
          }
        }
      }
    });
  }

  const ctxProductos = document.getElementById('chartTopProductos');
  if (ctxProductos) {
    new Chart(ctxProductos, {
      type: 'doughnut',
      data: {
        labels: productosLabels,
        datasets: [
          {
            label: 'Cantidad vendida',
            data: productosValues,
            borderWidth: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '58%',
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    });
  }

});
