const tablaOrdenes = document.getElementById('tablaOrdenes');
const tablaDetallesOrden = document.getElementById('tablaDetallesOrden');
const btnBuscar = document.getElementById('btnBuscar');

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatMoney(value) {
  const num = Number(value || 0);
  return `C$${num.toFixed(2)}`;
}

function renderEstadoBadge(estado) {
  const limpio = String(estado || '').toLowerCase();
  let clase = 'estado-badge';

  if (limpio.includes('entreg')) {
    clase += ' estado-badge--ok';
  } else {
    clase += ' estado-badge--warn';
  }

  return `<span class="${clase}">${escapeHtml(estado || 'Pendiente')}</span>`;
}

function getParams() {
  return new URLSearchParams({
    search: document.getElementById('search').value.trim(),
    departamento: document.getElementById('departamento').value.trim(),
    ciudad: document.getElementById('ciudad').value.trim()
  });
}

async function cargarOrdenes() {
  try {
    const res = await fetch(`/admin/reportes/data?${getParams().toString()}`);
    const json = await res.json();

    if (!res.ok || !json.ok) {
      throw new Error(json.message || 'No se pudieron cargar las órdenes.');
    }

    const data = json.data || [];
    tablaOrdenes.innerHTML = '';

    if (!data.length) {
      tablaOrdenes.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state">No se encontraron órdenes.</td>
        </tr>
      `;
      return;
    }

    data.forEach((item) => {
      tablaOrdenes.innerHTML += `
        <tr>
          <td>${escapeHtml(item.orderID)}</td>
          <td>${escapeHtml(item.businessName)}</td>
          <td>${escapeHtml(`${item.firstName || ''} ${item.lastName || ''}`.trim())}</td>
          <td>${escapeHtml(item.orderDate)}</td>
          <td>${renderEstadoBadge(item.orderStatus)}</td>
          <td>${escapeHtml(item.productName)}</td>
          <td>${escapeHtml(formatMoney(item.totalAmount))}</td>
        </tr>
      `;
    });
  } catch (error) {
    console.error('Error cargarOrdenes:', error);
    tablaOrdenes.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">Ocurrió un error cargando las órdenes.</td>
      </tr>
    `;
  }
}

async function cargarDetallesOrden() {
  try {
    const res = await fetch(`/admin/reportes/detalles?${getParams().toString()}`);
    const json = await res.json();

    if (!res.ok || !json.ok) {
      throw new Error(json.message || 'No se pudieron cargar los detalles.');
    }

    const data = json.data || [];
    tablaDetallesOrden.innerHTML = '';

    if (!data.length) {
      tablaDetallesOrden.innerHTML = `
        <tr>
          <td colspan="5" class="empty-state">No se encontraron detalles de órden.</td>
        </tr>
      `;
      return;
    }

    data.forEach((item) => {
      tablaDetallesOrden.innerHTML += `
        <tr>
          <td>${escapeHtml(item.orderDetailID)}</td>
          <td>${escapeHtml(item.orderID)}</td>
          <td>${escapeHtml(item.productName)}</td>
          <td>${escapeHtml(item.quantity)}</td>
          <td>${escapeHtml(formatMoney(item.unitPrice))}</td>
        </tr>
      `;
    });
  } catch (error) {
    console.error('Error cargarDetallesOrden:', error);
    tablaDetallesOrden.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">Ocurrió un error cargando los detalles de órden.</td>
      </tr>
    `;
  }
}

async function cargarTodo() {
  await Promise.all([
    cargarOrdenes(),
    cargarDetallesOrden()
  ]);
}

btnBuscar.addEventListener('click', cargarTodo);

document.getElementById('search').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') cargarTodo();
});

(async function init() {
  await cargarTodo();
})();