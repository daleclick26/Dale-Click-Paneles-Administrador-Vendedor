document.addEventListener("DOMContentLoaded", () => {
  const botonesEditar = document.querySelectorAll(".boton-editar-config[data-target]");
  const inputs = document.querySelectorAll("#formConfiguracionUsuario .campo-contenido input");
  const botonGuardar = document.getElementById("guardarConfiguracion");
  const botonCancelar = document.getElementById("cancelarConfiguracion");
  const inputFotoPerfil = document.getElementById("inputFotoPerfil");
  const previewFotoPerfil = document.getElementById("previewFotoPerfil");

  const modalSolicitarPlan = document.getElementById("modalSolicitarPlanOverlay");
  const formSolicitarPlan = document.getElementById("formSolicitarPlan");
  const solicitudPlanID = document.getElementById("solicitudPlanID");
  const solicitudPlanNombre = document.getElementById("solicitudPlanNombre");
  const solicitudMensaje = document.getElementById("solicitudMensaje");

  const valoresIniciales = {};

  inputs.forEach((input) => {
    valoresIniciales[input.id] = input.value;
  });

  function activarGuardar() {
    if (!botonGuardar) return;
    botonGuardar.disabled = false;
    botonGuardar.classList.add("activo");
  }

  function desactivarGuardar() {
    if (!botonGuardar) return;
    botonGuardar.disabled = true;
    botonGuardar.classList.remove("activo");
  }

  function abrirModal(modal) {
    if (!modal) return;
    modal.classList.remove("hidden");
  }

  function cerrarModal(modal) {
    if (!modal) return;
    modal.classList.add("hidden");
  }

  async function actualizarUsuario(data) {
    const response = await fetch("/configuracion/usuario", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    return response.json();
  }

  async function subirFotoPerfil(file) {
    const formData = new FormData();
    formData.append("profileImage", file);

    const response = await fetch("/configuracion/foto-perfil", {
      method: "POST",
      body: formData
    });

    return response.json();
  }

  async function solicitarPlan(data) {
    const response = await fetch("/configuracion/solicitar-plan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    return response.json();
  }

  botonesEditar.forEach((boton) => {
    boton.addEventListener("click", () => {
      const targetId = boton.dataset.target;
      const input = document.getElementById(targetId);

      if (!input) return;

      input.disabled = false;
      input.classList.add("editando");
      input.focus();

      const largo = input.value.length;
      input.setSelectionRange(largo, largo);

      activarGuardar();
    });
  });

  if (botonCancelar) {
    botonCancelar.addEventListener("click", () => {
      inputs.forEach((input) => {
        input.value = valoresIniciales[input.id] ?? "";
        input.disabled = true;
        input.classList.remove("editando");
      });

      desactivarGuardar();
    });
  }

  if (botonGuardar) {
    botonGuardar.addEventListener("click", async () => {
      const data = {
        firstName: document.getElementById("firstName")?.value.trim() || "",
        lastName: document.getElementById("lastName")?.value.trim() || "",
        email: document.getElementById("email")?.value.trim() || "",
        phone: document.getElementById("phone")?.value.trim() || "",
        password: document.getElementById("password")?.value.trim() || "",
        instagram: document.getElementById("instagram")?.value.trim() || "",
        facebook: document.getElementById("facebook")?.value.trim() || "",
        tiktok: document.getElementById("tiktok")?.value.trim() || ""
      };

      try {
        const resultado = await actualizarUsuario(data);

        if (resultado.error) {
          alert(resultado.error);
          return;
        }

        inputs.forEach((input) => {
          valoresIniciales[input.id] = input.value;
          input.disabled = true;
          input.classList.remove("editando");
        });

        desactivarGuardar();
        alert("Cambios guardados correctamente.");
      } catch (error) {
        console.error("Error al actualizar usuario:", error);
        alert("No se pudieron guardar los cambios.");
      }
    });
  }

  if (inputFotoPerfil) {
    inputFotoPerfil.addEventListener("change", async (event) => {
      const archivo = event.target.files[0];
      if (!archivo) return;

      const lector = new FileReader();
      lector.onload = (e) => {
        if (previewFotoPerfil) {
          previewFotoPerfil.src = e.target.result;
        }
      };
      lector.readAsDataURL(archivo);

      try {
        const resultado = await subirFotoPerfil(archivo);

        if (resultado.error) {
          alert(resultado.error);
          return;
        }

        if (previewFotoPerfil) {
          previewFotoPerfil.src = resultado.profileImageURL;
        }

        const avatarTopbar = document.querySelector(".avatar-usuario");
        if (avatarTopbar) {
          avatarTopbar.src = resultado.profileImageURL;
        }

        alert("Foto de perfil actualizada correctamente.");
      } catch (error) {
        console.error("Error al subir foto:", error);
        alert("No se pudo actualizar la foto de perfil.");
      }
    });
  }

  document.querySelectorAll(".boton-solicitar").forEach((boton) => {
    boton.addEventListener("click", () => {
      if (solicitudPlanID) {
        solicitudPlanID.value = boton.dataset.planId || "";
      }

      if (solicitudPlanNombre) {
        solicitudPlanNombre.value = boton.dataset.planName || "";
      }

      if (solicitudMensaje) {
        solicitudMensaje.value = `Hola, deseo solicitar el plan ${boton.dataset.planName}.`;
      }

      abrirModal(modalSolicitarPlan);
    });
  });

  document.querySelectorAll("[data-close-modal]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const modalID = btn.getAttribute("data-close-modal");
      const modal = document.getElementById(modalID);
      cerrarModal(modal);
    });
  });

  if (modalSolicitarPlan) {
    modalSolicitarPlan.addEventListener("click", (e) => {
      if (e.target === modalSolicitarPlan) {
        cerrarModal(modalSolicitarPlan);
      }
    });
  }

  if (formSolicitarPlan) {
    formSolicitarPlan.addEventListener("submit", async (e) => {
      e.preventDefault();

      const data = {
        planID: solicitudPlanID?.value || "",
        planName: solicitudPlanNombre?.value || "",
        message: solicitudMensaje?.value.trim() || ""
      };

      if (!data.planID || !data.planName || !data.message) {
        alert("Completa la información de la solicitud.");
        return;
      }

      try {
        const resultado = await solicitarPlan(data);

        if (resultado.error) {
          alert(resultado.error);
          return;
        }

        alert(resultado.message || "Solicitud enviada correctamente.");
        cerrarModal(modalSolicitarPlan);
        formSolicitarPlan.reset();
      } catch (error) {
        console.error("Error al solicitar plan:", error);
        alert("No se pudo enviar la solicitud del plan.");
      }
    });
  }
});