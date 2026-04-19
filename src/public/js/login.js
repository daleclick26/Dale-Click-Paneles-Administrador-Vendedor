function selectRole(role) {
  const panels = document.querySelectorAll('.panel');
  const form = document.getElementById('loginForm');
  const btn = document.getElementById('btnLogin');
  const link = document.getElementById('forgotLink');
  const roleInput = document.getElementById('role');

  panels.forEach((panel) => {
    panel.classList.remove('active');
    panel.classList.add('inactive');
  });

  const selected = document.querySelector(`.${role}`);
  if (selected) {
    selected.classList.add('active');
    selected.classList.remove('inactive');
  }

  roleInput.value = role;

  if (role === 'admin') {
    btn.innerText = 'Ingresar como Administrador';
    link.innerText = 'Administrador: ¿Olvidaste tu contraseña?';
  } else {
    btn.innerText = 'Ingresar como Vendedor';
    link.innerText = 'Vendedor: ¿Olvidaste tu contraseña?';
  }

  if (form.classList.contains('hidden')) {
    form.classList.remove('hidden');
  } else {
    form.style.animation = 'none';
    void form.offsetWidth;
    form.style.animation = 'formEntrance 0.65s cubic-bezier(0.34, 1.56, 0.64, 1)';
  }

  const emailInput = form.querySelector('input[name="email"]');
  if (emailInput) {
    setTimeout(() => emailInput.focus(), 180);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const panels = document.querySelectorAll('.panel');

  panels.forEach((panel, index) => {
    panel.style.opacity = '0';
    panel.style.transform = 'translateY(24px) scale(0.96)';

    setTimeout(() => {
      panel.style.transition = 'transform 0.65s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.65s ease';
      panel.style.opacity = '1';
      panel.style.transform = 'translateY(0) scale(1)';
    }, 180 + index * 140);
  });
});