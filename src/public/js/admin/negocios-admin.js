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
const selectExistingUniversity = document.getElementById('selectExistingUniversity');
const btnActualizarUniversidad = document.getElementById('btnActualizarUniversidad');
const inputUniversityID = document.getElementById('universityID');
const inputUniversityLogoURL = document.getElementById('universityLogoURL');

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

btnOpenCrearUniversidad.addEventListener('click', async () => {
  // preparar modal: resetear y cargar lista de universidades para edición
  try {
    formCrearUniversidad.reset();
    if (inputUniversityID) inputUniversityID.value = '';
    if (btnActualizarUniversidad) btnActualizarUniversidad.classList.add('hidden');

    const res = await fetch('/admin/universidades');
    const list = await res.json();

    if (selectExistingUniversity) {
      selectExistingUniversity.innerHTML = '<option value="">Selecciona una universidad</option>';
      if (Array.isArray(list)) {
        list.forEach((u) => {
          const option = document.createElement('option');
          option.value = u.universityID;
          option.textContent = u.universityName;
          selectExistingUniversity.appendChild(option);
        });
      }
    }
  } catch (error) {
    console.error('Error cargando universidades:', error);
  }

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

// Manejar selección de universidad para editar
if (selectExistingUniversity) {
  selectExistingUniversity.addEventListener('change', async () => {
    const id = selectExistingUniversity.value;
    if (!id) {
      formCrearUniversidad.reset();
      if (inputUniversityID) inputUniversityID.value = '';
      if (btnActualizarUniversidad) btnActualizarUniversidad.classList.add('hidden');
      return;
    }

    try {
      const res = await fetch(`/admin/universidades/${id}`);
      const data = await res.json();

      if (!res.ok || !data.ok) {
        alert(data.message || 'No se pudo cargar la universidad.');
        return;
      }

      const uni = data.university || {};
      document.getElementById('universityName').value = uni.universityName || '';
      document.getElementById('universityDepartment').value = uni.department || '';
      document.getElementById('universityCity').value = uni.city || '';
      document.getElementById('universityAddressLine').value = uni.addressLine || '';
      document.getElementById('universityReferenceNote').value = uni.referenceNote || '';
      if (inputUniversityLogoURL) inputUniversityLogoURL.value = uni.logoURL || '';
      if (inputUniversityID) inputUniversityID.value = uni.universityID || '';
      if (btnActualizarUniversidad) btnActualizarUniversidad.classList.remove('hidden');
    } catch (error) {
      console.error('Error cargando universidad:', error);
      alert('No se pudo cargar la universidad seleccionada.');
    }
  });
}

// Actualizar universidad seleccionada
if (btnActualizarUniversidad) {
  btnActualizarUniversidad.addEventListener('click', async () => {
    const id = inputUniversityID?.value;
    if (!id) {
      alert('Selecciona una universidad para actualizar.');
      return;
    }

    const formData = new FormData(formCrearUniversidad);
    const payload = Object.fromEntries(formData.entries());

    try {
      const res = await fetch(`/admin/universidades/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        alert(data.message || 'No se pudo actualizar la universidad.');
        return;
      }

      alert(data.message || 'Universidad actualizada correctamente.');
      formCrearUniversidad.reset();
      if (inputUniversityID) inputUniversityID.value = '';
      if (btnActualizarUniversidad) btnActualizarUniversidad.classList.add('hidden');
      cerrarModal(modalUniversidadOverlay);
    } catch (error) {
      console.error('Error actualizando universidad:', error);
      alert('Ocurrió un error actualizando la universidad.');
    }
  });
}

cargarNegocios();
