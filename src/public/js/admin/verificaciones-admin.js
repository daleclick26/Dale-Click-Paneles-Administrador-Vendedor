const tabla = document.getElementById('tablaVerificaciones');

const btnBuscar = document.getElementById('btnBuscar');
const btnOpenCrearVerificacion = document.getElementById('btnOpenCrearVerificacion');

const modalVerificacionOverlay = document.getElementById('modalVerificacionOverlay');
const formCrearVerificacion = document.getElementById('formCrearVerificacion');
const verificationUserID = document.getElementById('verificationUserID');

let cacheUsuarios = [];

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

function renderEstadoBadge(estado) {
  const limpio = String(estado || '').toLowerCase();
  let clase = 'estado-badge';

  if (limpio.includes('verif')) {
    clase += ' estado-badge--ok';
  } else {
    clase += ' estado-badge--warn';
  }

  return `<span class="${clase}">${escapeHtml(estado || 'Pendiente')}</span>`;
}

async function cargarVerificaciones() {
  try {
    const params = new URLSearchParams({
      search: document.getElementById('search').value.trim(),
      tipoUsuario: document.getElementById('tipoUsuario').value
    });

    const res = await fetch(`/admin/verificaciones/data?${params.toString()}`);
    const json = await res.json();

    if (!res.ok || !json.ok) {
      throw new Error(json.message || 'No se pudieron cargar las verificaciones.');
    }

    const data = json.data || [];
    tabla.innerHTML = '';

    if (!data.length) {
      tabla.innerHTML = `
        <tr>
          <td colspan="6" class="empty-state">No se encontraron verificaciones.</td>
        </tr>
      `;
      return;
    }

    data.forEach((item) => {
      tabla.innerHTML += `
        <tr>
          <td>${escapeHtml(item.firstName)}</td>
          <td>${escapeHtml(item.lastName)}</td>
          <td>${escapeHtml(item.documentType)}</td>
          <td>${escapeHtml(item.documentNumber || item.nationalID || '')}</td>
          <td>${escapeHtml(item.tipoUsuario)}</td>
          <td>${renderEstadoBadge(item.verificationStatus)}</td>
        </tr>
      `;
    });
  } catch (error) {
    console.error('Error cargarVerificaciones:', error);
    tabla.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">Ocurrió un error cargando las verificaciones.</td>
      </tr>
    `;
  }
}

async function cargarUsuariosFormulario() {
  const res = await fetch('/admin/verificaciones/form-data');
  const json = await res.json();

  if (!res.ok || !json.ok) {
    throw new Error(json.message || 'No se pudieron cargar los usuarios.');
  }

  cacheUsuarios = json.usuarios || [];
  verificationUserID.innerHTML = '<option value="">Selecciona un usuario</option>';

  cacheUsuarios.forEach((usuario) => {
    const option = document.createElement('option');
    option.value = usuario.userID;
    option.textContent = `${usuario.firstName} ${usuario.lastName} - ${usuario.tipoUsuario}`;
    verificationUserID.appendChild(option);
  });
}

btnBuscar.addEventListener('click', cargarVerificaciones);

document.getElementById('search').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') cargarVerificaciones();
});

btnOpenCrearVerificacion.addEventListener('click', async () => {
  try {
    await cargarUsuariosFormulario();
    abrirModal(modalVerificacionOverlay);
  } catch (error) {
    alert(error.message);
  }
});

document.getElementById('btnCloseCrearVerificacion').addEventListener('click', () => {
  cerrarModal(modalVerificacionOverlay);
});

document.getElementById('btnCancelCrearVerificacion').addEventListener('click', () => {
  cerrarModal(modalVerificacionOverlay);
});

modalVerificacionOverlay.addEventListener('click', (e) => {
  if (e.target === modalVerificacionOverlay) {
    cerrarModal(modalVerificacionOverlay);
  }
});

formCrearVerificacion.addEventListener('submit', async (e) => {
  e.preventDefault();

  const payload = Object.fromEntries(new FormData(formCrearVerificacion).entries());

  try {
    const res = await fetch('/admin/verificaciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const json = await res.json();

    if (!res.ok || !json.ok) {
      throw new Error(json.message || 'No se pudo guardar la verificación.');
    }

    alert(json.message);
    formCrearVerificacion.reset();
    cerrarModal(modalVerificacionOverlay);
    await cargarVerificaciones();
  } catch (error) {
    alert(error.message);
  }
});

(async function init() {
  await cargarVerificaciones();
})();