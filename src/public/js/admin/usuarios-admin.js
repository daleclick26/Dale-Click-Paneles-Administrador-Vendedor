const state = {
  usuarios: [],
  filteredUsuarios: [],
  editingUser: null
};

function readJsonScript(scriptId) {
  const script = document.getElementById(scriptId);

  if (!script) return [];

  try {
    return JSON.parse(script.textContent || '[]');
  } catch (error) {
    console.error(`No se pudo leer ${scriptId}:`, error);
    return [];
  }
}

const rolesCatalog = readJsonScript('usuarios-roles-data');
const universitiesCatalog = readJsonScript('usuarios-universities-data');

const elements = {
  searchInput: document.getElementById('searchInput'),
  roleFilter: document.getElementById('roleFilter'),
  tableBody: document.getElementById('usuariosTableBody'),
  feedbackMessage: document.getElementById('feedbackMessage'),

  createUserModal: document.getElementById('createUserModal'),
  editUserModal: document.getElementById('editUserModal'),
  createRoleModal: document.getElementById('createRoleModal'),
  createStudentModal: document.getElementById('createStudentModal'),

  openCreateUserModal: document.getElementById('openCreateUserModal'),
  openCreateRoleModal: document.getElementById('openCreateRoleModal'),
  openCreateStudentModal: document.getElementById('openCreateStudentModal'),

  createUserForm: document.getElementById('createUserForm'),
  editUserForm: document.getElementById('editUserForm'),
  createRoleForm: document.getElementById('createRoleForm'),
  createStudentForm: document.getElementById('createStudentForm'),

  studentUserID: document.getElementById('studentUserID'),

  editUserID: document.getElementById('editUserID'),
  editUsername: document.getElementById('editUsername'),
  editFirstName: document.getElementById('editFirstName'),
  editLastName: document.getElementById('editLastName'),
  editEmail: document.getElementById('editEmail'),
  editPhone: document.getElementById('editPhone'),
  editNationalID: document.getElementById('editNationalID'),
  editRoleID: document.getElementById('editRoleID'),
  editStatus: document.getElementById('editStatus')
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showFeedback(message, type = 'success') {
  elements.feedbackMessage.textContent = message;
  elements.feedbackMessage.className = `usuarios-feedback show ${type}`;

  clearTimeout(showFeedback.timeoutId);
  showFeedback.timeoutId = setTimeout(() => {
    elements.feedbackMessage.className = 'usuarios-feedback';
    elements.feedbackMessage.textContent = '';
  }, 3500);
}

function openModal(modal) {
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
  modal.classList.add('hidden');
  document.body.style.overflow = '';
}

function closeAllModals() {
  [elements.createUserModal, elements.editUserModal, elements.createRoleModal, elements.createStudentModal]
    .forEach((modal) => modal.classList.add('hidden'));

  document.body.style.overflow = '';
}

function getStatusBadge(status) {
  const normalized = String(status || '').toLowerCase();
  const isActive = normalized === 'activo' || normalized === 'active';

  return `
    <span class="status-badge ${isActive ? 'active' : 'inactive'}">
      <span class="badge-dot ${isActive ? 'green' : 'red'}"></span>
      ${escapeHtml(isActive ? 'Activo' : 'Inactivo')}
    </span>
  `;
}

function getVerificationBadge(value) {
  const verified = String(value || '').toLowerCase() === 'verificado';

  return `
    <span class="verify-badge ${verified ? 'verified' : 'pending'}">
      <span class="badge-dot ${verified ? 'blue' : 'yellow'}"></span>
      ${escapeHtml(verified ? 'Verificado' : 'Pendiente')}
    </span>
  `;
}

function getRoleBadge(role) {
  return `<span class="role-badge">${escapeHtml(role || 'Sin rol')}</span>`;
}

function renderTable() {
  const users = state.filteredUsuarios;

  if (!users.length) {
    elements.tableBody.innerHTML = `
      <tr>
        <td colspan="9" class="table-empty">No se encontraron usuarios con esos filtros.</td>
      </tr>
    `;
    return;
  }

  elements.tableBody.innerHTML = users.map((user) => `
    <tr>
      <td>${escapeHtml(user.firstName)}</td>
      <td>${escapeHtml(user.lastName)}</td>
      <td>${escapeHtml(user.email)}</td>
      <td>${escapeHtml(user.phone || '-')}</td>
      <td>${escapeHtml(user.nationalID)}</td>
      <td>${getStatusBadge(user.status)}</td>
      <td>${getRoleBadge(user.role)}</td>
      <td>${getVerificationBadge(user.verificationStatus)}</td>
      <td>
        <div class="actions-cell">
          <button class="action-btn edit" type="button" data-action="edit" data-id="${user.userID}" title="Editar">✎</button>
          <button class="action-btn delete" type="button" data-action="delete" data-id="${user.userID}" title="Borrar">🗑</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function applyFilters() {
  const search = elements.searchInput.value.trim().toLowerCase();
  const roleFilter = elements.roleFilter.value;

  state.filteredUsuarios = state.usuarios.filter((user) => {
    const matchesSearch =
      !search ||
      String(user.firstName || '').toLowerCase().includes(search) ||
      String(user.lastName || '').toLowerCase().includes(search) ||
      String(user.nationalID || '').toLowerCase().includes(search);

    const matchesRole =
      !roleFilter ||
      String(user.roleID) === String(roleFilter);

    return matchesSearch && matchesRole;
  });

  renderTable();
}

function populateStudentUserOptions() {
  const usersWithoutStudentProfile = state.usuarios.filter((user) =>
    user.role === 'Emprendedor' || user.role === 'Cliente' || user.role === 'Administrador'
  );

  elements.studentUserID.innerHTML = `
    <option value="">Selecciona un usuario</option>
    ${usersWithoutStudentProfile.map((user) => `
      <option value="${user.userID}">
        ${escapeHtml(`${user.firstName} ${user.lastName}`)} - ${escapeHtml(user.role)}
      </option>
    `).join('')}
  `;
}

async function fetchUsuarios() {
  try {
    elements.tableBody.innerHTML = `
      <tr>
        <td colspan="9" class="table-empty">Cargando usuarios...</td>
      </tr>
    `;

    const response = await fetch('/admin/usuarios/data');
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'No se pudieron cargar los usuarios.');
    }

    state.usuarios = Array.isArray(data) ? data : [];
    state.filteredUsuarios = [...state.usuarios];

    renderTable();
    populateStudentUserOptions();
  } catch (error) {
    console.error(error);
    elements.tableBody.innerHTML = `
      <tr>
        <td colspan="9" class="table-empty">Ocurrió un error al cargar los usuarios.</td>
      </tr>
    `;
    showFeedback(error.message || 'Error al cargar usuarios.', 'error');
  }
}

function fillEditForm(userID) {
  const user = state.usuarios.find((item) => Number(item.userID) === Number(userID));

  if (!user) return;

  state.editingUser = user;

  elements.editUserID.value = user.userID;
  elements.editUsername.value = user.username || '';
  elements.editFirstName.value = user.firstName || '';
  elements.editLastName.value = user.lastName || '';
  elements.editEmail.value = user.email || '';
  elements.editPhone.value = user.phone || '';
  elements.editNationalID.value = user.nationalID || '';
  elements.editRoleID.value = user.roleID || '';
  elements.editStatus.value = user.status || 'Activo';

  openModal(elements.editUserModal);
}

async function deleteUser(userID) {
  const user = state.usuarios.find((item) => Number(item.userID) === Number(userID));
  const fullName = user ? `${user.firstName} ${user.lastName}` : 'este usuario';

  const confirmed = window.confirm(`¿Deseas borrar a ${fullName}?`);
  if (!confirmed) return;

  try {
    const response = await fetch(`/admin/usuarios/${userID}`, {
      method: 'DELETE'
    });

    if (response.status !== 204) {
      const data = await response.json();
      throw new Error(data.message || 'No se pudo borrar el usuario.');
    }

    showFeedback('Usuario eliminado correctamente.');
    await fetchUsuarios();
    applyFilters();
  } catch (error) {
    console.error(error);
    showFeedback(error.message || 'Error al borrar usuario.', 'error');
  }
}

function getFormDataAsObject(form) {
  const formData = new FormData(form);
  return Object.fromEntries(formData.entries());
}

async function submitCreateUser(event) {
  event.preventDefault();

  try {
    const payload = getFormDataAsObject(elements.createUserForm);

    const response = await fetch('/admin/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'No se pudo crear el usuario.');
    }

    elements.createUserForm.reset();
    closeModal(elements.createUserModal);
    showFeedback('Usuario creado correctamente.');
    await fetchUsuarios();
    applyFilters();
  } catch (error) {
    console.error(error);
    showFeedback(error.message || 'Error al crear usuario.', 'error');
  }
}

async function submitEditUser(event) {
  event.preventDefault();

  try {
    const userID = elements.editUserID.value;
    const payload = getFormDataAsObject(elements.editUserForm);

    const response = await fetch(`/admin/usuarios/${userID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'No se pudo actualizar el usuario.');
    }

    closeModal(elements.editUserModal);
    showFeedback('Usuario actualizado correctamente.');
    await fetchUsuarios();
    applyFilters();
  } catch (error) {
    console.error(error);
    showFeedback(error.message || 'Error al actualizar usuario.', 'error');
  }
}

async function submitCreateRole(event) {
  event.preventDefault();

  try {
    const payload = getFormDataAsObject(elements.createRoleForm);

    const response = await fetch('/admin/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'No se pudo crear el rol.');
    }

    elements.createRoleForm.reset();
    closeModal(elements.createRoleModal);
    showFeedback('Rol creado correctamente. Recarga la página para verlo en los select.');
  } catch (error) {
    console.error(error);
    showFeedback(error.message || 'Error al crear rol.', 'error');
  }
}

async function submitCreateStudentProfile(event) {
  event.preventDefault();

  try {
    const payload = getFormDataAsObject(elements.createStudentForm);

    const response = await fetch('/admin/studentprofiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'No se pudo crear el perfil de estudiante.');
    }

    elements.createStudentForm.reset();
    closeModal(elements.createStudentModal);
    showFeedback('Perfil de estudiante creado correctamente.');
    await fetchUsuarios();
    applyFilters();
  } catch (error) {
    console.error(error);
    showFeedback(error.message || 'Error al crear perfil de estudiante.', 'error');
  }
}

function setupEvents() {
  elements.searchInput.addEventListener('input', applyFilters);
  elements.roleFilter.addEventListener('change', applyFilters);

  elements.openCreateUserModal.addEventListener('click', () => openModal(elements.createUserModal));
  elements.openCreateRoleModal.addEventListener('click', () => openModal(elements.createRoleModal));
  elements.openCreateStudentModal.addEventListener('click', () => openModal(elements.createStudentModal));

  document.querySelectorAll('[data-close-modal]').forEach((button) => {
    button.addEventListener('click', () => {
      const modalId = button.getAttribute('data-close-modal');
      closeModal(document.getElementById(modalId));
    });
  });

  [elements.createUserModal, elements.editUserModal, elements.createRoleModal, elements.createStudentModal].forEach((modal) => {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        closeModal(modal);
      }
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeAllModals();
  });

  elements.createUserForm.addEventListener('submit', submitCreateUser);
  elements.editUserForm.addEventListener('submit', submitEditUser);
  elements.createRoleForm.addEventListener('submit', submitCreateRole);
  elements.createStudentForm.addEventListener('submit', submitCreateStudentProfile);

  elements.tableBody.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const action = button.getAttribute('data-action');
    const userID = button.getAttribute('data-id');

    if (action === 'edit') {
      fillEditForm(userID);
    }

    if (action === 'delete') {
      deleteUser(userID);
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  setupEvents();
  await fetchUsuarios();
  applyFilters();
});
