// PEGAR AQUI LA CONFIGURACION DE FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyCBePYk9UbTtAvzHOtgzeaU6D1xLJK15yE",
  authDomain: "terrazaalborada-dd06c.firebaseapp.com",
  projectId: "terrazaalborada-dd06c",
  storageBucket: "terrazaalborada-dd06c.firebasestorage.app",
  messagingSenderId: "419306719780",
  appId: "1:419306719780:web:10a936d4c1b7cd8fe626b1",
  measurementId: "G-7MZD40TJCH"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

// Inicializar EmailJS
emailjs.init("8qxF4pHW13zLqaX96");

// Theme Toggle Logic
const htmlEl = document.documentElement;

function setTheme(theme) {
  if (theme === 'light') {
    htmlEl.classList.remove('dark');
    localStorage.setItem('theme', 'light');
    updateToggles('light');
  } else {
    htmlEl.classList.add('dark');
    localStorage.setItem('theme', 'dark');
    updateToggles('dark');
  }
}

function updateToggles(theme) {
  const navToggle = document.getElementById('themeToggleNav');
  const mobToggle = document.getElementById('themeToggleMobile');
  
  if (navToggle) {
    navToggle.querySelector('.theme-icon').textContent = theme === 'light' ? '☀' : '☾';
    navToggle.querySelector('.theme-text').textContent = theme === 'light' ? 'Claro' : 'Oscuro';
  }
  if (mobToggle) {
    mobToggle.querySelector('.theme-icon').textContent = theme === 'light' ? '☀' : '☾';
    mobToggle.querySelector('.theme-text').textContent = theme === 'light' ? 'Modo Claro' : 'Modo Oscuro';
  }
}

function toggleTheme() {
  if (htmlEl.classList.contains('dark')) {
    setTheme('light');
  } else {
    setTheme('dark');
  }
}

// Initialize Theme
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
  setTheme(savedTheme);
} else {
  // Default to dark as it was the original design
  setTheme('dark');
}

const modalBackdrop = document.getElementById("siteModal");
const modalPanel = modalBackdrop ? modalBackdrop.querySelector(".modal-panel") : null;
const modalIcon = document.getElementById("modalIcon");
const modalTitle = document.getElementById("modalTitle");
const modalMessage = document.getElementById("modalMessage");
const modalClose = document.getElementById("modalClose");
const modalAccept = document.getElementById("modalAccept");
let modalTimer = null;

function mostrarModal(tipo, titulo, mensaje) {
  if (!modalBackdrop || !modalPanel || !modalIcon || !modalTitle || !modalMessage) return;

  modalPanel.classList.remove("success", "error", "info");
  modalPanel.classList.add(tipo);

  if (tipo === "success") {
    modalIcon.textContent = "✓";
  } else if (tipo === "error") {
    modalIcon.textContent = "!";
  } else {
    modalIcon.textContent = "i";
  }

  modalTitle.textContent = titulo;
  modalMessage.textContent = mensaje;
  modalBackdrop.classList.remove("hidden");
  modalBackdrop.classList.add("show");

  if (modalTimer) {
    clearTimeout(modalTimer);
    modalTimer = null;
  }

  if (tipo === "success") {
    modalTimer = setTimeout(() => {
      cerrarModal();
    }, 2200);
  }
}

function cerrarModal() {
  if (!modalBackdrop) return;

  if (modalTimer) {
    clearTimeout(modalTimer);
    modalTimer = null;
  }

  modalBackdrop.classList.remove("show");
  modalBackdrop.classList.add("hidden");
}

function setButtonLoading(buttonId, loading, loadingText) {
  const button = document.getElementById(buttonId);
  if (!button) return;

  if (!button.dataset.defaultText) {
    button.dataset.defaultText = button.textContent;
  }

  button.classList.toggle("loading", loading);
  button.disabled = loading;
  button.textContent = loading ? loadingText : button.dataset.defaultText;
}

function abrirMenuMovil() {
  const menu = document.getElementById("menuLateral");
  const overlay = document.getElementById("menuOverlay");
  const toggle = document.getElementById("menuToggle");
  if (!menu || !overlay || !toggle) return;

  menu.classList.remove("-translate-x-full");
  menu.classList.add("translate-x-0");
  menu.setAttribute("aria-hidden", "false");
  overlay.classList.remove("hidden");
  toggle.setAttribute("aria-expanded", "true");
  document.body.classList.add("overflow-hidden");
}

function cerrarMenuMovil() {
  const menu = document.getElementById("menuLateral");
  const overlay = document.getElementById("menuOverlay");
  const toggle = document.getElementById("menuToggle");
  if (!menu || !overlay || !toggle) return;

  menu.classList.remove("translate-x-0");
  menu.classList.add("-translate-x-full");
  menu.setAttribute("aria-hidden", "true");
  overlay.classList.add("hidden");
  toggle.setAttribute("aria-expanded", "false");
  document.body.classList.remove("overflow-hidden");
}

document.addEventListener("DOMContentLoaded", () => {
  const menuToggle = document.getElementById("menuToggle");
  const menuClose = document.getElementById("menuClose");
  const menuOverlay = document.getElementById("menuOverlay");
  const menuLateral = document.getElementById("menuLateral");

  if (modalClose && modalAccept && modalBackdrop) {
    modalClose.addEventListener("click", cerrarModal);
    modalAccept.addEventListener("click", cerrarModal);

    modalBackdrop.addEventListener("click", e => {
      if (e.target === modalBackdrop) {
        cerrarModal();
      }
    });
  }

  if (menuToggle && menuClose && menuOverlay && menuLateral) {
    menuToggle.addEventListener("click", () => {
      const expanded = menuToggle.getAttribute("aria-expanded") === "true";
      if (expanded) {
        cerrarMenuMovil();
      } else {
        abrirMenuMovil();
      }
    });

    menuClose.addEventListener("click", cerrarMenuMovil);
    menuOverlay.addEventListener("click", cerrarMenuMovil);

    document.querySelectorAll(".nav-link-mobile").forEach(link => {
      link.addEventListener("click", () => {
        cerrarMenuMovil();
      });
    });

    document.addEventListener("keydown", e => {
      if (e.key === "Escape") {
        cerrarMenuMovil();
        cerrarModal();
      }
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth >= 768) {
        cerrarMenuMovil();
      }
    });
  }

  const fechaInput = document.getElementById("fechaEvento");
  if (fechaInput) {
    const tzOffset = new Date().getTimezoneOffset() * 60000;
    const localISOTime = (new Date(Date.now() - tzOffset)).toISOString().split('T')[0];
    fechaInput.setAttribute("min", localISOTime);
  }

  const themeToggleNav = document.getElementById('themeToggleNav');
  if (themeToggleNav) themeToggleNav.addEventListener('click', toggleTheme);
  
  const themeToggleMobile = document.getElementById('themeToggleMobile');
  if (themeToggleMobile) themeToggleMobile.addEventListener('click', toggleTheme);
});

// Control de sesión
auth.onAuthStateChanged(user => {
  if (user) {
    document.getElementById("zonaPrivada").classList.remove("hidden");
    document.getElementById("estado").innerText = "Sesión iniciada: " + user.email;
    cargarReservaciones();
  } else {
    document.getElementById("zonaPrivada").classList.add("hidden");
    document.getElementById("estado").innerText = "No has iniciado sesión";

    const lista = document.getElementById("listaReservaciones");
    if (lista) {
      lista.innerHTML = "";
    }
  }
});

// Registro
function registrar() {
  let email = document.getElementById("email").value.trim();
  let password = document.getElementById("password").value;

  if (!email || !password) {
    mostrarModal("info", "Datos requeridos", "Ingresa correo y contraseña para registrarte.");
    return;
  }

  setButtonLoading("btnRegister", true, "Registrando...");

  auth.createUserWithEmailAndPassword(email, password)
    .then(() => mostrarModal("success", "Registro exitoso", "Tu cuenta fue creada correctamente. Ya puedes iniciar sesión."))
    .catch(e => mostrarModal("error", "No se pudo registrar", e.message))
    .finally(() => setButtonLoading("btnRegister", false, "Registrarse"));
}

// Login
function login() {
  let email = document.getElementById("email").value.trim();
  let password = document.getElementById("password").value;

  if (!email || !password) {
    mostrarModal("info", "Datos requeridos", "Ingresa correo y contraseña para iniciar sesión.");
    return;
  }

  setButtonLoading("btnLogin", true, "Ingresando...");

  auth.signInWithEmailAndPassword(email, password)
    .then(() => mostrarModal("success", "Bienvenido", "Inicio de sesión correcto. Ahora puedes registrar tu reservación."))
    .catch(e => {
      mostrarModal("error", "Error de acceso", "Correo o contraseña incorrectos. Verifica tus datos e intenta nuevamente.");
    })
    .finally(() => setButtonLoading("btnLogin", false, "Iniciar sesión"));
}

// Logout
function logout() {
  auth.signOut();
}

// Guardar reservación
function guardarReservacion() {
  if (!auth.currentUser) {
    mostrarModal("info", "Acceso requerido", "Debes iniciar sesión para reservar.");
    return;
  }

  const camposIds = ["clienteEmpresa", "fechaEvento", "tipoPaquete", "numeroInvitados", "salonSeleccionado"];
  let tieneError = false;

  camposIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el.value.trim()) {
      tieneError = true;
      // Añadir bordes rojos
      el.classList.remove("border-[#0F2A1F]/20", "dark:border-white/15", "focus:border-alborada-gold");
      el.classList.add("border-red-500", "dark:border-red-500", "focus:border-red-500", "focus:ring-red-500/30");
      
      // Limpiar el error cuando el usuario empiece a escribir
      el.addEventListener("input", function clearError() {
        el.classList.remove("border-red-500", "dark:border-red-500", "focus:border-red-500", "focus:ring-red-500/30");
        el.classList.add("border-[#0F2A1F]/20", "dark:border-white/15", "focus:border-alborada-gold");
        el.removeEventListener("input", clearError);
      });
    }
  });

  if (tieneError) {
    mostrarModal("info", "Faltan datos", "Por favor, completa todos los campos marcados en rojo.");
    return;
  }

  const clienteEmpresa = document.getElementById("clienteEmpresa").value.trim();
  const fechaEvento = document.getElementById("fechaEvento").value;
  const tipoPaquete = document.getElementById("tipoPaquete").value;
  const numeroInvitados = document.getElementById("numeroInvitados").value;
  const salonSeleccionado = document.getElementById("salonSeleccionado").value;

  setButtonLoading("btnReservar", true, "Guardando...");

  db.collection("reservaciones").add({
    clienteEmpresa,
    fechaEvento,
    tipoPaquete,
    numeroInvitados: Number(numeroInvitados),
    salonSeleccionado,
    usuario: auth.currentUser.email,
    creadoEn: firebase.firestore.FieldValue.serverTimestamp()
  })
    .then(() => {
      // Enviar notificación por correo con EmailJS
      emailjs.send("service_axx0wmq", "template_fg1xpla", {
        clienteEmpresa: clienteEmpresa,
        salonSeleccionado: salonSeleccionado,
        fechaEvento: fechaEvento,
        tipoPaquete: tipoPaquete,
        numeroInvitados: numeroInvitados,
        email_cliente: auth.currentUser.email
      }).then(
        function(response) {
          console.log("Email enviado con éxito:", response.status, response.text);
        },
        function(error) {
          console.error("Error al enviar el email:", error);
        }
      );

      mostrarModal("success", "Reservación registrada", "Tu fecha fue apartada correctamente.");

      document.getElementById("clienteEmpresa").value = "";
      document.getElementById("fechaEvento").value = "";
      document.getElementById("tipoPaquete").value = "";
      document.getElementById("numeroInvitados").value = "";
      document.getElementById("salonSeleccionado").value = "";

      cargarReservaciones();
    })
    .catch(e => {
      mostrarModal("error", "Error al guardar", "No se pudo registrar la reservación: " + e.message);
    })
    .finally(() => setButtonLoading("btnReservar", false, "Reservar Fecha"));
}

// Mostrar reservaciones del usuario logueado
function cargarReservaciones() {
  if (!auth.currentUser) return;

  db.collection("reservaciones")
    .where("usuario", "==", auth.currentUser.email)
    .get()
    .then(snapshot => {
      const lista = document.getElementById("listaReservaciones");
      if (!lista) return;

      lista.innerHTML = "";

      const reservaciones = [];
      snapshot.forEach(doc => reservaciones.push(doc.data()));

      reservaciones.sort((a, b) => a.fechaEvento.localeCompare(b.fechaEvento));

      reservaciones.forEach(d => {
        const item = document.createElement("article");
        item.className = "group flex flex-col gap-4 rounded-2xl border border-[#0F2A1F]/10 bg-alborada-cream/80 p-4 shadow-md backdrop-blur-md transition-all duration-[400ms] ease-out hover:-translate-y-1.5 hover:border-alborada-gold/60 hover:shadow-xl hover:shadow-alborada-gold/10 dark:border-white/10 dark:bg-[#102742]/50 sm:flex-row sm:items-center sm:justify-between md:p-5";
        
        item.innerHTML = `
          <div class="flex flex-col gap-2">
            <!-- Nombres de clientes resalten más -->
            <h4 class="font-display text-2xl font-bold tracking-tight text-alborada-dark transition-colors duration-[400ms] group-hover:text-alborada-gold dark:text-alborada-cream">
              ${d.clienteEmpresa}
            </h4>
            <div class="flex flex-wrap items-center gap-3 text-sm text-[#4A4636] dark:text-gray-300">
              <span class="inline-flex items-center gap-1.5 font-semibold text-alborada-gold">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M9.293 2.293a1 1 0 011.414 0l7 7A1 1 0 0117 11h-1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-3a1 1 0 00-1-1H9a1 1 0 00-1 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-6H3a1 1 0 01-.707-1.707l7-7z" clip-rule="evenodd" />
                </svg>
                ${d.salonSeleccionado}
              </span>
              <span class="hidden opacity-40 sm:inline">•</span>
              <span class="inline-flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 opacity-70" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M11.983 1.907a.75.75 0 00-1.292-.656l-8.5 9.5A.75.75 0 002.75 12h6.572l-1.305 6.093a.75.75 0 001.292.656l8.5-9.5A.75.75 0 0017.25 8h-6.572l1.305-6.093z" />
                </svg>
                Paquete ${d.tipoPaquete}
              </span>
              <span class="hidden opacity-40 sm:inline">•</span>
              <span class="inline-flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 opacity-70" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                </svg>
                ${d.numeroInvitados} invitados
              </span>
            </div>
          </div>
          <div class="mt-3 shrink-0 sm:mt-0">
            <span class="inline-flex items-center gap-1.5 rounded-xl bg-alborada-gold/10 px-4 py-2 text-sm font-bold text-alborada-dark transition-colors duration-[400ms] group-hover:bg-alborada-gold group-hover:text-alborada-dark dark:text-alborada-cream dark:group-hover:text-alborada-dark">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z" clip-rule="evenodd" />
              </svg>
              ${d.fechaEvento}
            </span>
          </div>
        `;
        lista.appendChild(item);
      });

      if (!reservaciones.length) {
        lista.innerHTML = `
          <div class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#0F2A1F]/20 dark:border-white/20 bg-white/30 dark:bg-white/5 py-12 text-center backdrop-blur-sm transition-colors duration-[400ms]">
            <svg xmlns="http://www.w3.org/2000/svg" class="mb-4 h-16 w-16 text-[#0F2A1F]/30 dark:text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p class="font-display text-xl font-medium text-[#0F2A1F] dark:text-white">Aún no hay reservaciones</p>
            <p class="mt-2 text-sm text-[#4A4636] dark:text-gray-400">Las fechas que reserves aparecerán aquí.</p>
          </div>
        `;
      }
    })
    .catch(e => {
      mostrarModal("error", "Error al cargar", "No fue posible cargar tus reservaciones: " + e.message);
    });
}
