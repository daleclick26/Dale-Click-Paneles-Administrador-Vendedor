const tabla = document.getElementById('tablaMembresias');

const btnBuscar = document.getElementById('btnBuscar');
const btnOpenCrearPlan = document.getElementById('btnOpenCrearPlan');
const btnOpenCrearDescuento = document.getElementById('btnOpenCrearDescuento');
const btnOpenCrearSuscripcion = document.getElementById('btnOpenCrearSuscripcion');

const modalPlanOverlay = document.getElementById('modalPlanOverlay');
const modalDescuentoOverlay = document.getElementById('modalDescuentoOverlay');
const modalSuscripcionOverlay = document.getElementById('modalSuscripcionOverlay');
const modalEditarSuscripcionOverlay = document.getElementById('modalEditarSuscripcionOverlay');

const formCrearPlan = document.getElementById('formCrearPlan');
const formCrearDescuento = document.getElementById('formCrearDescuento');
const formCrearSuscripcion = document.getElementById('formCrearSuscripcion');
const formEditarSuscripcion = document.getElementById('formEditarSuscripcion');

const subscriptionBusinessID = document.getElementById('subscriptionBusinessID');
const subscriptionPlanID = document.getElementById('subscriptionPlanID');
const discountProductID = document.getElementById('discountProductID');

const editBusinessID = document.getElementById('editBusinessID');
const editPlanID = document.getElementById('editPlanID');
const editSubscriptionID = document.getElementById('editSubscriptionID');
const editStartDate = document.getElementById('editStartDate');
const editEndDate = document.getElementById('editEndDate');
const editStatus = document.getElementById('editStatus');

let cacheFormData = {
  negocios: [],
  planes: [],
  productos: []
};

let cacheMembresias = [];

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

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
}

function formatMoney(value) {
  const num = Number(value || 0);
  return `C$${num.toFixed(2)}`;
}

async function cargarMembresias() {
  try {
    const search = document.getElementById('search').value.trim();
    const params = new URLSearchParams({ search });

    const res = await fetch(`/admin/membresias/data?${params.toString()}`);
    const json = await res.json();

    if (!res.ok || !json.ok) {
      throw new Error(json.message || 'No se pudieron cargar las membresías.');
    }

    cacheMembresias = json.data || [];
    tabla.innerHTML = '';

    if (!cacheMembresias.length) {
      tabla.innerHTML = `
        <tr>
          <td colspan="9" class="empty-state">No se encontraron suscripciones.</td>
        </tr>
      `;
      return;
    }

    cacheMembresias.forEach((item) => {
      tabla.innerHTML += `
        <tr>
          <td>${escapeHtml(item.businessName)}</td>
          <td>${escapeHtml(item.firstName)}</td>
          <td>${escapeHtml(item.lastName)}</td>
          <td>${escapeHtml(item.subscriptionID)}</td>
          <td>${escapeHtml(item.planName)}</td>
          <td>${escapeHtml(formatMoney(item.price))}</td>
          <td>${escapeHtml(formatDate(item.startDate))}</td>
          <td>${escapeHtml(formatDate(item.endDate))}</td>
          <td>
            <div class="acciones-celda">
              <button class="table-action table-action--edit" type="button" onclick="abrirEditarSuscripcion(${Number(item.subscriptionID)})">
              <img src="/images/editar.png" alt="Editar" class="table-action-icon">
              </button>
              <button class="table-action table-action--delete" type="button" onclick="eliminarSuscripcion(${Number(item.subscriptionID)})">
              <img src="/images/borrar.png" alt="Eliminar" class="table-action-icon">
              </button>
            </div>
          </td>
        </tr>
      `;
    });
  } catch (error) {
    console.error('Error cargando membresías:', error);
    tabla.innerHTML = `
      <tr>
        <td colspan="9" class="empty-state">Ocurrió un error cargando las membresías.</td>
      </tr>
    `;
  }
}

function llenarSelect(select, items, valueKey, textBuilder) {
  const firstOption = select.querySelector('option')?.outerHTML || '<option value="">Selecciona una opción</option>';
  select.innerHTML = firstOption;

  items.forEach((item) => {
    const option = document.createElement('option');
    option.value = item[valueKey];
    option.textContent = textBuilder(item);
    select.appendChild(option);
  });
}

async function cargarFormData() {
  const res = await fetch('/admin/membresias/form-data');
  const json = await res.json();

  if (!res.ok || !json.ok) {
    throw new Error(json.message || 'No se pudieron cargar los datos del formulario.');
  }

  cacheFormData = {
    negocios: json.negocios || [],
    planes: json.planes || [],
    productos: json.productos || []
  };

  llenarSelect(
    subscriptionBusinessID,
    cacheFormData.negocios,
    'businessID',
    (item) => `${item.businessName} — ${item.ownerName}`
  );

  llenarSelect(
    editBusinessID,
    cacheFormData.negocios,
    'businessID',
    (item) => `${item.businessName} — ${item.ownerName}`
  );

  llenarSelect(
    subscriptionPlanID,
    cacheFormData.planes,
    'planID',
    (item) => `${item.planName} — C$${Number(item.price).toFixed(2)}`
  );

  llenarSelect(
    editPlanID,
    cacheFormData.planes,
    'planID',
    (item) => `${item.planName} — C$${Number(item.price).toFixed(2)}`
  );

  llenarSelect(
    discountProductID,
    cacheFormData.productos,
    'productID',
    (item) => `${item.businessName} — ${item.productName}`
  );
}

btnBuscar.addEventListener('click', cargarMembresias);

document.getElementById('search').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') cargarMembresias();
});

btnOpenCrearPlan.addEventListener('click', () => abrirModal(modalPlanOverlay));

btnOpenCrearDescuento.addEventListener('click', async () => {
  try {
    await cargarFormData();
    abrirModal(modalDescuentoOverlay);
  } catch (error) {
    alert(error.message);
  }
});

btnOpenCrearSuscripcion.addEventListener('click', async () => {
  try {
    await cargarFormData();
    abrirModal(modalSuscripcionOverlay);
  } catch (error) {
    alert(error.message);
  }
});

document.getElementById('btnCloseCrearPlan').addEventListener('click', () => cerrarModal(modalPlanOverlay));
document.getElementById('btnCancelCrearPlan').addEventListener('click', () => cerrarModal(modalPlanOverlay));

document.getElementById('btnCloseCrearDescuento').addEventListener('click', () => cerrarModal(modalDescuentoOverlay));
document.getElementById('btnCancelCrearDescuento').addEventListener('click', () => cerrarModal(modalDescuentoOverlay));

document.getElementById('btnCloseCrearSuscripcion').addEventListener('click', () => cerrarModal(modalSuscripcionOverlay));
document.getElementById('btnCancelCrearSuscripcion').addEventListener('click', () => cerrarModal(modalSuscripcionOverlay));

document.getElementById('btnCloseEditarSuscripcion').addEventListener('click', () => cerrarModal(modalEditarSuscripcionOverlay));
document.getElementById('btnCancelEditarSuscripcion').addEventListener('click', () => cerrarModal(modalEditarSuscripcionOverlay));

[
  modalPlanOverlay,
  modalDescuentoOverlay,
  modalSuscripcionOverlay,
  modalEditarSuscripcionOverlay
].forEach((modal) => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) cerrarModal(modal);
  });
});

formCrearPlan.addEventListener('submit', async (e) => {
  e.preventDefault();

  const payload = Object.fromEntries(new FormData(formCrearPlan).entries());

  try {
    const res = await fetch('/admin/planes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const json = await res.json();

    if (!res.ok || !json.ok) {
      throw new Error(json.message || 'No se pudo crear el plan.');
    }

    alert(json.message);
    formCrearPlan.reset();
    cerrarModal(modalPlanOverlay);
    await cargarFormData();
    await cargarMembresias();
  } catch (error) {
    alert(error.message);
  }
});

formCrearDescuento.addEventListener('submit', async (e) => {
  e.preventDefault();

  const payload = Object.fromEntries(new FormData(formCrearDescuento).entries());

  try {
    const res = await fetch('/admin/descuentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const json = await res.json();

    if (!res.ok || !json.ok) {
      throw new Error(json.message || 'No se pudo crear el descuento.');
    }

    alert(json.message);
    formCrearDescuento.reset();
    cerrarModal(modalDescuentoOverlay);
  } catch (error) {
    alert(error.message);
  }
});

formCrearSuscripcion.addEventListener('submit', async (e) => {
  e.preventDefault();

  const payload = Object.fromEntries(new FormData(formCrearSuscripcion).entries());

  try {
    const res = await fetch('/admin/suscripciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const json = await res.json();

    if (!res.ok || !json.ok) {
      throw new Error(json.message || 'No se pudo crear la suscripción.');
    }

    alert(json.message);
    formCrearSuscripcion.reset();
    cerrarModal(modalSuscripcionOverlay);
    await cargarMembresias();
  } catch (error) {
    alert(error.message);
  }
});

window.abrirEditarSuscripcion = async function (subscriptionID) {
  try {
    if (!cacheFormData.negocios.length || !cacheFormData.planes.length) {
      await cargarFormData();
    }

    const item = cacheMembresias.find((row) => Number(row.subscriptionID) === Number(subscriptionID));

    if (!item) {
      alert('No se encontró la suscripción seleccionada.');
      return;
    }

    editSubscriptionID.value = item.subscriptionID;
    editBusinessID.value = item.businessID;
    editPlanID.value = item.planID;
    editStartDate.value = formatDate(item.startDate);
    editEndDate.value = formatDate(item.endDate);
    editStatus.value = item.status || '';

    abrirModal(modalEditarSuscripcionOverlay);
  } catch (error) {
    alert(error.message);
  }
};

formEditarSuscripcion.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = editSubscriptionID.value;
  const payload = {
    businessID: editBusinessID.value,
    planID: editPlanID.value,
    startDate: editStartDate.value,
    endDate: editEndDate.value,
    status: editStatus.value
  };

  try {
    const res = await fetch(`/admin/suscripciones/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const json = await res.json();

    if (!res.ok || !json.ok) {
      throw new Error(json.message || 'No se pudo actualizar la suscripción.');
    }

    alert(json.message);
    cerrarModal(modalEditarSuscripcionOverlay);
    await cargarMembresias();
  } catch (error) {
    alert(error.message);
  }
});

window.eliminarSuscripcion = async function (subscriptionID) {
  const confirmado = window.confirm('¿Deseas borrar esta suscripción?');

  if (!confirmado) return;

  try {
    const res = await fetch(`/admin/suscripciones/${subscriptionID}`, {
      method: 'DELETE'
    });

    const json = await res.json();

    if (!res.ok || !json.ok) {
      throw new Error(json.message || 'No se pudo eliminar la suscripción.');
    }

    alert(json.message);
    await cargarMembresias();
  } catch (error) {
    alert(error.message);
  }
};

(async function init() {
  await cargarMembresias();
})();