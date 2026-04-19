document.addEventListener("DOMContentLoaded", () => {
  const botonesEditar = document.querySelectorAll(".boton-editar-campo");
  const botonGuardar = document.getElementById("guardarCambios");
  const botonCancelar = document.getElementById("cancelarCambios");
  const formPerfil = document.getElementById("formPerfilComercial");
  const estadoEdicion = document.getElementById("estadoEdicion");

  const inputs = document.querySelectorAll(".campo-card input");
  const logoInput = document.getElementById("logoURL");
  const logoPreviewHero = document.getElementById("logoPreviewHero");
  const heroBusinessName = document.querySelector(".hero-logo-info h2");
  const heroBusinessLocation = document.querySelector(".hero-logo-info p");

  const businessNameInput = document.getElementById("businessName");
  const cityInput = document.getElementById("city");
  const departmentInput = document.getElementById("department");

  const btnAbrirModalHorarios = document.getElementById("btnAbrirModalHorarios");
  const modalHorarios = document.getElementById("modalHorariosOverlay");
  const formHorarios = document.getElementById("formHorarios");

  const valoresIniciales = {};
  let hayCambios = false;

  inputs.forEach((input) => {
    valoresIniciales[input.id] = input.value;
  });

  function activarBotonGuardar() {
    if (!botonGuardar) return;
    botonGuardar.disabled = false;
    botonGuardar.classList.add("activo");
  }

  function desactivarBotonGuardar() {
    if (!botonGuardar) return;
    botonGuardar.disabled = true;
    botonGuardar.classList.remove("activo");
  }

  function actualizarEstadoEdicion() {
    if (!estadoEdicion) return;

    const hayInputEditando = Array.from(inputs).some(
      (input) => !input.disabled || input.classList.contains("editando")
    );

    if (hayInputEditando || hayCambios) {
      estadoEdicion.textContent = "Modo edición";
    } else {
      estadoEdicion.textContent = "Modo vista";
    }
  }

  function abrirModal(modal) {
    if (!modal) return;
    modal.classList.remove("hidden");
  }

  function cerrarModal(modal) {
    if (!modal) return;
    modal.classList.add("hidden");
  }

  function actualizarPreviewLogo() {
    if (!logoPreviewHero) return;

    const url = logoInput?.value?.trim();

    if (!url) {
      logoPreviewHero.src = "/images/logo_daleclick.png";
      return;
    }

    logoPreviewHero.src = url;
  }

  function actualizarHeroInfo() {
    if (heroBusinessName && businessNameInput) {
      const nombre = businessNameInput.value.trim();
      heroBusinessName.textContent = nombre || "Tu negocio";
    }

    if (heroBusinessLocation && cityInput && departmentInput) {
      const ciudad = cityInput.value.trim() || "Ciudad no registrada";
      const departamento = departmentInput.value.trim() || "Departamento no registrado";
      heroBusinessLocation.textContent = `${ciudad}, ${departamento}`;
    }
  }

  function revisarCambios() {
    hayCambios = Array.from(inputs).some(
      (input) => input.value !== valoresIniciales[input.id]
    );

    if (hayCambios) {
      activarBotonGuardar();
    } else {
      desactivarBotonGuardar();
    }

    actualizarEstadoEdicion();
  }

  async function actualizarPerfil(data) {
    const response = await fetch("/perfil-comercial/info", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    return response.json();
  }

  async function actualizarHorarios(hours) {
    const response = await fetch("/perfil-comercial/horarios", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ hours })
    });

    return response.json();
  }

  botonesEditar.forEach((boton) => {
    boton.addEventListener("click", () => {
      const inputId = boton.dataset.target;
      const input = document.getElementById(inputId);

      if (!input) return;

      input.disabled = false;
      input.classList.add("editando");
      input.focus();

      const largo = input.value.length;
      input.setSelectionRange(largo, largo);

      actualizarEstadoEdicion();
      revisarCambios();
    });
  });

  inputs.forEach((input) => {
    input.addEventListener("input", () => {
      actualizarPreviewLogo();
      actualizarHeroInfo();
      revisarCambios();
    });

    input.addEventListener("blur", () => {
      if (input.value !== valoresIniciales[input.id]) {
        input.classList.add("editando");
      }
      revisarCambios();
    });
  });

  if (botonCancelar) {
    botonCancelar.addEventListener("click", () => {
      inputs.forEach((input) => {
        input.value = valoresIniciales[input.id];
        input.disabled = true;
        input.classList.remove("editando");
      });

      hayCambios = false;
      actualizarPreviewLogo();
      actualizarHeroInfo();
      desactivarBotonGuardar();
      actualizarEstadoEdicion();
    });
  }

  if (formPerfil) {
    formPerfil.addEventListener("submit", async (e) => {
      e.preventDefault();

      const data = {};
      inputs.forEach((input) => {
        data[input.name] = input.value.trim();
      });

      try {
        const resultado = await actualizarPerfil(data);

        if (resultado.error) {
          alert(resultado.error);
          return;
        }

        inputs.forEach((input) => {
          valoresIniciales[input.id] = input.value;
          input.disabled = true;
          input.classList.remove("editando");
        });

        hayCambios = false;
        actualizarPreviewLogo();
        actualizarHeroInfo();
        desactivarBotonGuardar();
        actualizarEstadoEdicion();

        alert("Perfil comercial actualizado correctamente.");
      } catch (error) {
        console.error("Error al actualizar perfil comercial:", error);
        alert("No se pudo actualizar el perfil comercial.");
      }
    });
  }

  if (btnAbrirModalHorarios) {
    btnAbrirModalHorarios.addEventListener("click", () => {
      abrirModal(modalHorarios);
    });
  }

  document.querySelectorAll("[data-close-modal]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const modalID = btn.getAttribute("data-close-modal");
      const modal = document.getElementById(modalID);
      cerrarModal(modal);
    });
  });

  if (modalHorarios) {
    modalHorarios.addEventListener("click", (e) => {
      if (e.target === modalHorarios) {
        cerrarModal(modalHorarios);
      }
    });
  }

  document.querySelectorAll(".fila-horario").forEach((fila) => {
    const checkCerrado = fila.querySelector(".input-cerrado");
    const inputApertura = fila.querySelector(".input-hora-apertura");
    const inputCierre = fila.querySelector(".input-hora-cierre");

    if (!checkCerrado || !inputApertura || !inputCierre) return;

    checkCerrado.addEventListener("change", () => {
      const cerrado = checkCerrado.checked;

      inputApertura.disabled = cerrado;
      inputCierre.disabled = cerrado;

      if (cerrado) {
        inputApertura.value = "";
        inputCierre.value = "";
      }
    });
  });

  if (formHorarios) {
    formHorarios.addEventListener("submit", async (e) => {
      e.preventDefault();

      const hours = Array.from(document.querySelectorAll(".fila-horario")).map((fila) => {
        const dayOfWeek = fila.dataset.day;
        const isClosed = fila.querySelector(".input-cerrado")?.checked || false;
        const openTime = fila.querySelector(".input-hora-apertura")?.value || null;
        const closeTime = fila.querySelector(".input-hora-cierre")?.value || null;

        return {
          dayOfWeek,
          isClosed,
          openTime,
          closeTime
        };
      });

      const horariosInvalidos = hours.some((item) => {
        if (item.isClosed) return false;
        return !item.openTime || !item.closeTime;
      });

      if (horariosInvalidos) {
        alert("Completa las horas de apertura y cierre en todos los días abiertos.");
        return;
      }

      try {
        const resultado = await actualizarHorarios(hours);

        if (resultado.error) {
          alert(resultado.error);
          return;
        }

        cerrarModal(modalHorarios);
        window.location.reload();
      } catch (error) {
        console.error("Error al actualizar horarios:", error);
        alert("No se pudieron actualizar los horarios.");
      }
    });
  }

  actualizarPreviewLogo();
  actualizarHeroInfo();
  desactivarBotonGuardar();
  actualizarEstadoEdicion();
});