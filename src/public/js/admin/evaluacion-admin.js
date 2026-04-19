const tabla = document.getElementById('tablaEvaluaciones');
const searchInput = document.getElementById('search');
const ratingSelect = document.getElementById('rating');
const btnBuscar = document.getElementById('btnBuscar');

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderStars(rating) {
  const total = Number(rating) || 0;
  return '★'.repeat(total) || '-';
}

async function cargarEvaluaciones() {
  try {
    const params = new URLSearchParams({
      search: searchInput.value.trim(),
      rating: ratingSelect.value
    });

    const res = await fetch(`/admin/evaluacion/data?${params.toString()}`);
    const json = await res.json();

    if (!res.ok || !json.ok) {
      throw new Error(json.message || 'No se pudieron cargar las evaluaciones.');
    }

    const data = json.data || [];

    tabla.innerHTML = '';

    if (!data.length) {
      tabla.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state">No hay evaluaciones.</td>
        </tr>
      `;
      return;
    }

    data.forEach((item) => {
      tabla.innerHTML += `
        <tr>
          <td>${escapeHtml(item.firstName)}</td>
          <td>${escapeHtml(item.lastName)}</td>
          <td>${escapeHtml(item.orderID)}</td>
          <td>${escapeHtml(item.productName || '-')}</td>
          <td>${escapeHtml(item.businessName)}</td>
          <td>${escapeHtml(renderStars(item.rating))}</td>
          <td>${escapeHtml(item.comment || '-')}</td>
        </tr>
      `;
    });
  } catch (error) {
    console.error('Error cargando evaluaciones:', error);
    tabla.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">Ocurrió un error cargando las evaluaciones.</td>
      </tr>
    `;
  }
}

btnBuscar.addEventListener('click', cargarEvaluaciones);
ratingSelect.addEventListener('change', cargarEvaluaciones);

searchInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    cargarEvaluaciones();
  }
});

(async function init() {
  await cargarEvaluaciones();
})();
