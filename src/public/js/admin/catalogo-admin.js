const tabla = document.getElementById('tablaCatalogo');

const btnBuscar = document.getElementById('btnBuscar');
const btnOpenCrearCategoria = document.getElementById('btnOpenCrearCategoria');
const btnOpenCrearProducto = document.getElementById('btnOpenCrearProducto');

const modalCategoriaOverlay = document.getElementById('modalCategoriaOverlay');
const modalProductoOverlay = document.getElementById('modalProductoOverlay');

const formCrearCategoria = document.getElementById('formCrearCategoria');
const formCrearProducto = document.getElementById('formCrearProducto');

const negocioFiltro = document.getElementById('negocioFiltro');
const productBusinessID = document.getElementById('productBusinessID');
const productCategoryID = document.getElementById('productCategoryID');

let cacheFormData = {
  negocios: [],
  categorias: []
};

function abrirModal(modal) {
  modal.classList.remove('hidden');
  document.body.classList.add('modal-open');
}

function cerrarModal(modal) {
  modal.classList.add('hidden');
  document.body.classList.remove('modal-open');
}

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

  if (limpio.includes('disp')) clase += ' estado-badge--ok';
  else if (limpio.includes('agot')) clase += ' estado-badge--warn';
  else clase += ' estado-badge--off';

  return `<span class="${clase}">${escapeHtml(estado || 'Sin estado')}</span>`;
}

function llenarSelect(select, items, valueKey, textKey) {
  const firstOption = select.querySelector('option')?.outerHTML || '<option value="">Selecciona una opción</option>';
  select.innerHTML = firstOption;

  items.forEach((item) => {
    const option = document.createElement('option');
    option.value = item[valueKey];
    option.textContent = item[textKey];
    select.appendChild(option);
  });
}

async function cargarCatalogo() {
  try {
    const params = new URLSearchParams({
      search: document.getElementById('search').value.trim(),
      negocio: negocioFiltro.value,
      precio: document.getElementById('precio').value.trim(),
      stock: document.getElementById('stock').value.trim()
    });

    const res = await fetch(`/admin/catalogo/data?${params.toString()}`);
    const json = await res.json();

    if (!res.ok || !json.ok) {
      throw new Error(json.message || 'No se pudo cargar el catálogo.');
    }

    const data = json.data || [];
    tabla.innerHTML = '';

    if (!data.length) {
      tabla.innerHTML = `
        <tr>
          <td colspan="6" class="empty-state">No se encontraron productos con esos filtros.</td>
        </tr>
      `;
      return;
    }

    data.forEach((item) => {
      tabla.innerHTML += `
        <tr>
          <td>${escapeHtml(item.businessName)}</td>
          <td>${escapeHtml(item.categoryName)}</td>
          <td>${escapeHtml(item.productName)}</td>
          <td>${escapeHtml(formatMoney(item.price))}</td>
          <td>${escapeHtml(item.stock)}</td>
          <td>${renderEstadoBadge(item.availabilityStatus)}</td>
        </tr>
      `;
    });
  } catch (error) {
    console.error('Error cargarCatalogo:', error);
    tabla.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">Ocurrió un error cargando el catálogo.</td>
      </tr>
    `;
  }
}

async function cargarFormData() {
  const res = await fetch('/admin/catalogo/form-data');
  const json = await res.json();

  if (!res.ok || !json.ok) {
    throw new Error(json.message || 'No se pudieron cargar los datos del formulario.');
  }

  cacheFormData = {
    negocios: json.negocios || [],
    categorias: json.categorias || []
  };

  llenarSelect(negocioFiltro, cacheFormData.negocios, 'businessID', 'businessName');
  llenarSelect(productBusinessID, cacheFormData.negocios, 'businessID', 'businessName');
  llenarSelect(productCategoryID, cacheFormData.categorias, 'categoryID', 'categoryName');
}

btnBuscar.addEventListener('click', cargarCatalogo);

document.getElementById('search').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') cargarCatalogo();
});

btnOpenCrearCategoria.addEventListener('click', () => abrirModal(modalCategoriaOverlay));

btnOpenCrearProducto.addEventListener('click', async () => {
  try {
    if (!cacheFormData.negocios.length || !cacheFormData.categorias.length) {
      await cargarFormData();
    }
    abrirModal(modalProductoOverlay);
  } catch (error) {
    alert(error.message);
  }
});

document.getElementById('btnCloseCrearCategoria').addEventListener('click', () => cerrarModal(modalCategoriaOverlay));
document.getElementById('btnCancelCrearCategoria').addEventListener('click', () => cerrarModal(modalCategoriaOverlay));

document.getElementById('btnCloseCrearProducto').addEventListener('click', () => cerrarModal(modalProductoOverlay));
document.getElementById('btnCancelCrearProducto').addEventListener('click', () => cerrarModal(modalProductoOverlay));

[modalCategoriaOverlay, modalProductoOverlay].forEach((modal) => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) cerrarModal(modal);
  });
});

formCrearCategoria.addEventListener('submit', async (e) => {
  e.preventDefault();

  const payload = Object.fromEntries(new FormData(formCrearCategoria).entries());

  try {
    const res = await fetch('/admin/categorias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const json = await res.json();

    if (!res.ok || !json.ok) {
      throw new Error(json.message || 'No se pudo crear la categoría.');
    }

    alert(json.message);
    formCrearCategoria.reset();
    cerrarModal(modalCategoriaOverlay);
    await cargarFormData();
    await cargarCatalogo();
  } catch (error) {
    alert(error.message);
  }
});

formCrearProducto.addEventListener('submit', async (e) => {
  e.preventDefault();

  const payload = Object.fromEntries(new FormData(formCrearProducto).entries());

  try {
    const res = await fetch('/admin/productos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const json = await res.json();

    if (!res.ok || !json.ok) {
      throw new Error(json.message || 'No se pudo crear el producto.');
    }

    alert(json.message);
    formCrearProducto.reset();
    cerrarModal(modalProductoOverlay);
    await cargarCatalogo();
  } catch (error) {
    alert(error.message);
  }
});

(async function init() {
  try {
    await cargarFormData();
    await cargarCatalogo();
  } catch (error) {
    console.error(error);
  }
})();
