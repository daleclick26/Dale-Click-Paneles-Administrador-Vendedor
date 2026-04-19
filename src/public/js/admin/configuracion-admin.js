// Guardar info
document.getElementById('configForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData.entries());

  await fetch('/admin/configuracion', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  alert('Actualizado');
});

// Foto
document.getElementById('btnFoto').addEventListener('click', async () => {
  const url = document.getElementById('fotoURL').value;

  await fetch('/admin/configuracion/foto', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profileImageURL: url })
  });

  location.reload();
});