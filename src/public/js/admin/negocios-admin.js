const tabla = document.getElementById('tablaNegocios');

const btnBuscar = document.getElementById('btnBuscar');
const btnOpenCrearNegocio = document.getElementById('btnOpenCrearNegocio');
const btnOpenCrearUniversidad = document.getElementById('btnOpenCrearUniversidad');

const modalNegocioOverlay = document.getElementById('modalNegocioOverlay');
const modalUniversidadOverlay = document.getElementById('modalUniversidadOverlay');

const btnCloseCrearNegocio = document.getElementById('btnCloseCrearNegocio');
const btnCancelCrearNegocio = document.getElementById('btnCancelCrearNegocio');

const btnCloseCrearUniversidad = document.getElementById('btnCloseCrearUniversidad');
const btnCancelCrearUniversidad = document.getElementById('btnCancelCrearUniversidad');

const formCrearNegocio = document.getElementById('formCrearNegocio');
const formCrearUniversidad = document.getElementById('formCrearUniversidad');

const selectUserID = document.getElementById('negocioUserID');
const selectCategoryID = document.getElementById('negocioCategoryID');

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

function renderTipoBadge(label, isUniversidad) {
  const tipo = String(label || 'Negocio Local').trim();
  let clase = 'tipo-badge tipo-badge--local';

  if (isUniversidad) {
    clase = 'tipo-badge tipo-badge--universidad';
  }

  return `<span class="${clase}">${escapeHtml(tipo)}</span>`;
}

async function cargarNegocios() {
  try {
    const search = document.getElementById('search').value.trim();
    const tipo = document.getElementById('tipo').value;
    const departamento = document.getElementById('departamento').value.trim();
    const ciudad = document.getElementById('ciudad').value.trim();

    const params = new URLSearchParams({
      search,
      tipo,
      departamento,
      ciudad
    });

    const res = await fetch(`/admin/negocios/data?${params.toString()}`);
    const data = await res.json();

    tabla.innerHTML = '';

    if (!Array.isArray(data) || data.length === 0) {
      tabla.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state">
            No se encontraron negocios con esos filtros.
          </td>
        </tr>
      `;
      return;
    }

    data.forEach((n) => {
      tabla.innerHTML += `
        <tr>
          <td>
            <img
              src="${n.logoURL || '/images/perfil-usuario.png'}"
              class="logo"
              alt="Logo negocio"
              onerror="this.src='/images/perfil-usuario.png'"
            >
          </td>
          <td>${n.businessName || ''}</td>
          <td>${n.department || ''}</td>
          <td>${n.city || ''}</td>
          <td>${n.contactPhone || ''}</td>
          <td>${n.contactEmail || ''}</td>
          <td>${renderTipoBadge(n.universidad || 'Negocio Local', Boolean(n.studentProfileID))}</td>
        </tr>
      `;
    });
  } catch (error) {
    console.error('Error cargando negocios:', error);
    tabla.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">
          Ocurrió un error cargando los negocios.
        </td>
      </tr>
    `;
  }
}

async function cargarDatosFormularioNegocio() {
  try {
    const res = await fetch('/admin/negocios/form-data');
    const data = await res.json();

    if (!data.ok) {
      alert(data.message || 'No se pudieron cargar los datos del formulario.');
      return;
    }

    selectUserID.innerHTML = '<option value="">Selecciona un usuario</option>';
    selectCategoryID.innerHTML = '<option value="">Selecciona una categoría</option>';

    data.usuarios.forEach((usuario) => {
      const option = document.createElement('option');
      option.value = usuario.userID;
      option.textContent = usuario.nombre;
      selectUserID.appendChild(option);
    });

    data.categorias.forEach((categoria) => {
      const option = document.createElement('option');
      option.value = categoria.categoryID;
      option.textContent = categoria.categoryName;
      selectCategoryID.appendChild(option);
    });
  } catch (error) {
    console.error('Error cargando datos formulario negocio:', error);
    alert('No se pudieron cargar usuarios y categorías.');
  }
}

btnBuscar.addEventListener('click', cargarNegocios);

document.getElementById('search').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') cargarNegocios();
});

btnOpenCrearNegocio.addEventListener('click', async () => {
  await cargarDatosFormularioNegocio();
  abrirModal(modalNegocioOverlay);
});

btnOpenCrearUniversidad.addEventListener('click', () => {
  abrirModal(modalUniversidadOverlay);
});

btnCloseCrearNegocio.addEventListener('click', () => cerrarModal(modalNegocioOverlay));
btnCancelCrearNegocio.addEventListener('click', () => cerrarModal(modalNegocioOverlay));

btnCloseCrearUniversidad.addEventListener('click', () => cerrarModal(modalUniversidadOverlay));
btnCancelCrearUniversidad.addEventListener('click', () => cerrarModal(modalUniversidadOverlay));

modalNegocioOverlay.addEventListener('click', (e) => {
  if (e.target === modalNegocioOverlay) cerrarModal(modalNegocioOverlay);
});

modalUniversidadOverlay.addEventListener('click', (e) => {
  if (e.target === modalUniversidadOverlay) cerrarModal(modalUniversidadOverlay);
});

formCrearNegocio.addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(formCrearNegocio);
  const payload = Object.fromEntries(formData.entries());

  try {
    const res = await fetch('/admin/negocios', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      alert(data.message || 'No se pudo crear el negocio.');
      return;
    }

    alert(data.message || 'Negocio creado correctamente.');
    formCrearNegocio.reset();
    cerrarModal(modalNegocioOverlay);
    await cargarNegocios();
  } catch (error) {
    console.error('Error creando negocio:', error);
    alert('Ocurrió un error creando el negocio.');
  }
});

formCrearUniversidad.addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(formCrearUniversidad);
  const payload = Object.fromEntries(formData.entries());

  try {
    const res = await fetch('/admin/universidades', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      alert(data.message || 'No se pudo guardar la universidad.');
      return;
    }

    alert(data.message || 'Universidad agregada correctamente.');
    formCrearUniversidad.reset();
    cerrarModal(modalUniversidadOverlay);
  } catch (error) {
    console.error('Error creando universidad:', error);
    alert('Ocurrió un error guardando la universidad.');
  }
});

cargarNegocios();
