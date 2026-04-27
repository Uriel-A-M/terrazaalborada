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

  const clienteEmpresa = document.getElementById("clienteEmpresa").value.trim();
  const fechaEvento = document.getElementById("fechaEvento").value;
  const tipoPaquete = document.getElementById("tipoPaquete").value;
  const numeroInvitados = document.getElementById("numeroInvitados").value;
  const salonSeleccionado = document.getElementById("salonSeleccionado").value;

  if (!clienteEmpresa || !fechaEvento || !tipoPaquete || !numeroInvitados || !salonSeleccionado) {
    mostrarModal("info", "Faltan datos", "Completa todos los campos de la reservación.");
    return;
  }

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
        item.className = "rounded-xl border border-white/10 bg-[#102742]/35 px-4 py-3 text-gray-100 shadow-md";
        item.textContent = `${d.clienteEmpresa} | ${d.salonSeleccionado} | ${d.fechaEvento} | ${d.tipoPaquete} | Invitados: ${d.numeroInvitados}`;
        lista.appendChild(item);
      });

      if (!reservaciones.length) {
        lista.innerHTML = "<p class='text-sm text-gray-300'>No hay reservaciones registradas para este usuario.</p>";
      }
    })
    .catch(e => {
      mostrarModal("error", "Error al cargar", "No fue posible cargar tus reservaciones: " + e.message);
    });
}
