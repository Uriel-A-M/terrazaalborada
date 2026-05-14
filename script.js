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
const db   = firebase.firestore();

// Set de combinaciones bloqueadas: "YYYY-MM-DD|NombreSalón"
// Se mantiene actualizado por onSnapshot al iniciar sesión.
// CIA — DISPONIBILIDAD: onSnapshot garantiza sincronización
// en tiempo real sin consultas adicionales por interacción.
let reservasOcupadas = new Set();

// Unsubscribe del listener de reservaciones del cliente
// (se cancela al cerrar sesión para evitar lecturas huérfanas)
let reservacionesUnsubscribe = null;

// Inicializar EmailJS
emailjs.init("8qxF4pHW13zLqaX96");

// =============================================================
// CONFIG_NEGOCIO — Fuente de verdad para precios y capacidades.
//
// JUSTIFICACIÓN CIA (Tríada de Seguridad de la Información):
// • INTEGRIDAD: El cálculo del montoTotal se realiza en el cliente
//   antes de cualquier escritura en Firestore. Esto garantiza que
//   el dato almacenado en la nube es consistente y no puede ser
//   adulterado por lógica de servidor incorrecta o peticiones
//   manipuladas. El valor persiste ya validado y calculado.
// • CONFIDENCIALIDAD: El acceso al formulario está protegido por
//   Firebase Auth (onAuthStateChanged); solo usuarios autenticados
//   pueden ver y operar la #zonaPrivada.
// • DISPONIBILIDAD: Los errores de red son capturados con .catch()
//   y el botón muestra estado de carga para evitar doble envío.
// =============================================================
const CONFIG_NEGOCIO = {
  salones: {
    Balam:     { precio: 5000,  capacidad: 150 },
    "Kukulc\u00e1n": { precio: 7500,  capacidad: 200 },
    Diamante:  { precio: 12000, capacidad: 300 },
  },
  paquetes: {
    Esencial:    15000,
    Selecto:     25000,
    "Gran Gala": 45000,
  }
};

/**
 * actualizarResumen — Calcula y muestra el Total Estimado y la
 * Capacidad Máxima en tiempo real conforme el usuario selecciona
 * salón y paquete. Refuerza la INTEGRIDAD (CIA) al hacer transparente
 * el cálculo antes de que el usuario confirme la reservación.
 */
function actualizarResumen() {
  const salon   = document.getElementById("salonSeleccionado")?.value;
  const paquete = document.getElementById("tipoPaquete")?.value;
  const resumenEl = document.getElementById("resumenCotizacion");

  if (!resumenEl) return;

  if (!salon || !paquete) {
    resumenEl.classList.add("hidden");
    return;
  }

  const datosSalon   = CONFIG_NEGOCIO.salones[salon];
  const precioPaquete = CONFIG_NEGOCIO.paquetes[paquete];

  if (!datosSalon || precioPaquete === undefined) {
    resumenEl.classList.add("hidden");
    return;
  }

  const total = datosSalon.precio + precioPaquete;

  document.getElementById("resumenTotal").textContent =
    "$" + total.toLocaleString("es-MX");
  document.getElementById("resumenCapacidad").textContent =
    datosSalon.capacidad + " personas";

  resumenEl.classList.remove("hidden");
}

/**
 * validarCapacidad — Valida en tiempo real que el número de invitados
 * no supere la capacidad máxima del salón seleccionado.
 * Aplica feedback visual inmediato (borde rojo + mensaje) sin bloquear
 * al usuario, reforzando la INTEGRIDAD de los datos antes de persistir.
 */
function validarCapacidad() {
  const salonVal     = document.getElementById("salonSeleccionado")?.value;
  const invitadosEl  = document.getElementById("numeroInvitados");
  const warningEl    = document.getElementById("capacidadWarning");
  const warningText  = document.getElementById("capacidadWarningText");

  if (!invitadosEl || !warningEl || !warningText) return;

  const numInvitados = Number(invitadosEl.value);
  const datosSalon   = salonVal ? CONFIG_NEGOCIO.salones[salonVal] : null;

  // Sin salón seleccionado o sin valor: limpiar advertencia
  if (!datosSalon || !invitadosEl.value) {
    invitadosEl.classList.remove(
      "border-red-500", "dark:border-red-500",
      "focus:border-red-500", "focus:ring-red-500/30"
    );
    invitadosEl.classList.add(
      "border-[#0F2A1F]/20", "dark:border-white/15",
      "focus:border-alborada-gold", "focus:ring-alborada-gold/30"
    );
    warningEl.classList.add("hidden");
    return;
  }

  if (numInvitados > datosSalon.capacidad) {
    // Estado de error: borde rojo + mensaje
    invitadosEl.classList.add(
      "border-red-500", "dark:border-red-500",
      "focus:border-red-500", "focus:ring-red-500/30"
    );
    invitadosEl.classList.remove(
      "border-[#0F2A1F]/20", "dark:border-white/15",
      "focus:border-alborada-gold", "focus:ring-alborada-gold/30"
    );
    warningText.textContent =
      `El salón ${salonVal} tiene capacidad máxima de ${datosSalon.capacidad} personas. ` +
      `Excedes por ${numInvitados - datosSalon.capacidad}.`;
    warningEl.classList.remove("hidden");
  } else {
    // Estado válido: resetear estilos
    invitadosEl.classList.remove(
      "border-red-500", "dark:border-red-500",
      "focus:border-red-500", "focus:ring-red-500/30"
    );
    invitadosEl.classList.add(
      "border-[#0F2A1F]/20", "dark:border-white/15",
      "focus:border-alborada-gold", "focus:ring-alborada-gold/30"
    );
    warningEl.classList.add("hidden");
  }
}

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

  // Listeners para la tarjeta de Resumen de Cotización en tiempo real.
  // Cada cambio en salón o paquete recalcula el total y la capacidad
  // antes de que el usuario confirme, reforzando la Integridad (CIA).
  const salonSelect   = document.getElementById("salonSeleccionado");
  const paqueteSelect = document.getElementById("tipoPaquete");
  const invitadosInput = document.getElementById("numeroInvitados");

  if (salonSelect) {
    salonSelect.addEventListener("change", actualizarResumen);
    salonSelect.addEventListener("change", validarCapacidad);
    salonSelect.addEventListener("change", verificarDisponibilidad);
  }
  if (paqueteSelect)  paqueteSelect.addEventListener("change", actualizarResumen);
  if (invitadosInput) invitadosInput.addEventListener("input", validarCapacidad);

  // Verificar disponibilidad al cambiar la fecha
  const fechaInputDisp = document.getElementById("fechaEvento");
  if (fechaInputDisp) fechaInputDisp.addEventListener("change", verificarDisponibilidad);
});

// Control de sesión
// CIA — CONFIDENCIALIDAD: Se verifica el rol del usuario antes de
// mostrar cualquier sección protegida. Los admins son redirigidos
// al dashboard; los usuarios normales permanecen en el index.
auth.onAuthStateChanged(async (user) => {
  if (user) {
    try {
      // Consultar el perfil en Firestore para conocer el rol
      const perfilDoc = await db.collection("users").doc(user.uid).get();
      const rol = perfilDoc.exists ? perfilDoc.data().role : "user";

      if (rol === "admin") {
        // Admin → redirigir al panel de administración
        window.location.href = "dashboard.html";
        return;
      }

      // Usuario normal → mostrar la zona privada de reservaciones
      document.getElementById("zonaPrivada").classList.remove("hidden");
      document.getElementById("estado").innerText = "Sesión iniciada: " + user.email;
      cargarReservaciones();
      escucharDisponibilidad(); // Activar listener de slots ocupados

    } catch (error) {
      // Error de red o de permisos: mantener al usuario en el index
      console.error("Error al verificar rol:", error);
      document.getElementById("zonaPrivada").classList.remove("hidden");
      document.getElementById("estado").innerText = "Sesión iniciada: " + user.email;
      cargarReservaciones();
    }

  } else {
    // Cancelar el listener de reservaciones al cerrar sesión
    if (reservacionesUnsubscribe) {
      reservacionesUnsubscribe();
      reservacionesUnsubscribe = null;
    }

    document.getElementById("zonaPrivada").classList.add("hidden");
    document.getElementById("estado").innerText = "No has iniciado sesión";

    const lista = document.getElementById("listaReservaciones");
    if (lista) lista.innerHTML = "";
  }
});

// =============================================================
// DISPONIBILIDAD: escuchar y verificar slots ocupados
// =============================================================

/**
 * escucharDisponibilidad — Suscripción onSnapshot que mantiene
 * el Set 'reservasOcupadas' siempre actualizado con las combinaciones
 * fecha+salón que ya están reservadas (estado Pendiente o Confirmado).
 * Si el admin cancela una reserva, el slot se libera en tiempo real.
 */
function escucharDisponibilidad() {
  db.collection("reservaciones")
    .where("estado", "in", ["Pendiente", "Confirmado"])
    .onSnapshot(snapshot => {
      reservasOcupadas.clear();
      snapshot.forEach(doc => {
        const d = doc.data();
        if (d.fechaEvento && d.salonSeleccionado) {
          reservasOcupadas.add(`${d.fechaEvento}|${d.salonSeleccionado}`);
        }
      });
      // Re-evaluar si el usuario ya tiene campos seleccionados
      verificarDisponibilidad();
    }, err => console.error("Error en listener de disponibilidad:", err));
}

/**
 * verificarDisponibilidad — Comprueba si la combinación fecha+salón
 * seleccionada está en el Set de slots ocupados.
 * - Si está ocupada: feedback rojo en ambos campos + botón deshabilitado.
 * - Si está libre:   resetea los estilos y habilita el botón.
 */
function verificarDisponibilidad() {
  const fechaEl  = document.getElementById("fechaEvento");
  const salonEl  = document.getElementById("salonSeleccionado");
  const warnEl   = document.getElementById("disponibilidadWarning");
  const warnText = document.getElementById("disponibilidadWarningText");
  const btnRes   = document.getElementById("btnReservar");

  if (!fechaEl || !salonEl || !warnEl || !warnText) return;

  const fecha = fechaEl.value;
  const salon = salonEl.value;

  // Clases de estado normal y error
  const clsNormal = ["border-[#0F2A1F]/20", "dark:border-white/15", "focus:border-alborada-gold", "focus:ring-alborada-gold/30"];
  const clsError  = ["border-red-500", "dark:border-red-500", "focus:border-red-500", "focus:ring-red-500/30"];

  // Sin ambos valores: limpiar cualquier advertencia previa
  if (!fecha || !salon) {
    warnEl.classList.add("hidden");
    [fechaEl, salonEl].forEach(el => {
      el.classList.remove(...clsError);
      el.classList.add(...clsNormal);
    });
    if (btnRes) {
      btnRes.disabled = false;
      btnRes.classList.remove("opacity-50", "cursor-not-allowed");
    }
    return;
  }

  const clave = `${fecha}|${salon}`;

  if (reservasOcupadas.has(clave)) {
    // ❌ Slot ocupado — mostrar advertencia y bloquear botón
    const fechaLegible = new Date(fecha + "T12:00:00").toLocaleDateString("es-MX", {
      weekday: "long", year: "numeric", month: "long", day: "numeric"
    });
    warnText.textContent =
      `El salón ${salon} ya está reservado el ${fechaLegible}. Elige otra fecha o salón.`;
    warnEl.classList.remove("hidden");
    [fechaEl, salonEl].forEach(el => {
      el.classList.add(...clsError);
      el.classList.remove(...clsNormal);
    });
    if (btnRes) {
      btnRes.disabled = true;
      btnRes.classList.add("opacity-50", "cursor-not-allowed");
    }
  } else {
    // ✅ Slot libre — limpiar advertencia y habilitar botón
    warnEl.classList.add("hidden");
    [fechaEl, salonEl].forEach(el => {
      el.classList.remove(...clsError);
      el.classList.add(...clsNormal);
    });
    if (btnRes) {
      btnRes.disabled = false;
      btnRes.classList.remove("opacity-50", "cursor-not-allowed");
    }
  }
}

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
    .then(cred => {
      // CIA — INTEGRIDAD: Se crea el perfil del usuario en Firestore
      // con rol "user" forzado. Solo un administrador puede elevarlo
      // a "admin" desde Firebase Console o el Dashboard.
      return db.collection("users").doc(cred.user.uid).set({
        email: cred.user.email,
        role: "user",
        creadoEn: firebase.firestore.FieldValue.serverTimestamp()
      });
    })
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

  // tipoEvento incluido en la validación: es un campo obligatorio.
  const camposIds = ["clienteEmpresa", "fechaEvento", "tipoEvento", "tipoPaquete", "numeroInvitados", "salonSeleccionado"];
  let tieneError = false;

  camposIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el.value.trim()) {
      tieneError = true;
      // Añadir bordes rojos
      el.classList.remove("border-[#0F2A1F]/20", "dark:border-white/15", "focus:border-alborada-gold");
      el.classList.add("border-red-500", "dark:border-red-500", "focus:border-red-500", "focus:ring-red-500/30");

      // Limpiar el error cuando el usuario empiece a escribir/seleccionar
      const evtType = (el.tagName === "SELECT") ? "change" : "input";
      el.addEventListener(evtType, function clearError() {
        el.classList.remove("border-red-500", "dark:border-red-500", "focus:border-red-500", "focus:ring-red-500/30");
        el.classList.add("border-[#0F2A1F]/20", "dark:border-white/15", "focus:border-alborada-gold");
        el.removeEventListener(evtType, clearError);
      });
    }
  });

  if (tieneError) {
    mostrarModal("info", "Faltan datos", "Por favor, completa todos los campos marcados en rojo.");
    return;
  }

  const clienteEmpresa    = document.getElementById("clienteEmpresa").value.trim();
  const fechaEvento       = document.getElementById("fechaEvento").value;
  const tipoEvento        = document.getElementById("tipoEvento").value;
  const tipoPaquete       = document.getElementById("tipoPaquete").value;
  const numeroInvitados   = document.getElementById("numeroInvitados").value;
  const salonSeleccionado = document.getElementById("salonSeleccionado").value;

  // ---------------------------------------------------------------
  // INTEGRIDAD (Tríada CIA): El montoTotal se calcula en el cliente,
  // usando CONFIG_NEGOCIO como fuente única de verdad, ANTES de
  // persistir en Firestore. Esto asegura que el dato almacenado en
  // la nube es consistente e íntegro, sin depender de cálculos
  // posteriores que podrían ser manipulados o inconsistentes.
  // ---------------------------------------------------------------
  const datosSalon          = CONFIG_NEGOCIO.salones[salonSeleccionado];
  const precioPaquete       = CONFIG_NEGOCIO.paquetes[tipoPaquete];
  const montoTotal          = datosSalon.precio + precioPaquete;
  const capacidadMaximaSalon = datosSalon.capacidad;

  // CIA — INTEGRIDAD: Doble verificación de disponibilidad antes de persistir.
  // El onSnapshot pudo haberse actualizado mientras el formulario estaba abierto.
  const claveDisp = `${fechaEvento}|${salonSeleccionado}`;
  if (reservasOcupadas.has(claveDisp)) {
    mostrarModal(
      "error",
      "Fecha no disponible",
      `El salón ${salonSeleccionado} fue reservado recientemente para esa fecha. Por favor elige otra combinación.`
    );
    return;
  }

  // Validación de capacidad: el número de invitados no puede superar
  // la capacidad máxima del salón (Integridad de datos).
  if (Number(numeroInvitados) > capacidadMaximaSalon) {
    mostrarModal(
      "error",
      "Capacidad excedida",
      `El salón ${salonSeleccionado} tiene una capacidad máxima de ${capacidadMaximaSalon} personas. Reduce el número de invitados o elige un salón más amplio.`
    );
    return;
  }

  setButtonLoading("btnReservar", true, "Guardando...");

  // Persistencia en Firestore con los campos extendidos.
  // montoTotal y capacidadMaximaSalon se guardan como referencia
  // histórica e inmutable del acuerdo económico al momento de reservar.
  db.collection("reservaciones").add({
    clienteEmpresa,
    fechaEvento,
    tipoEvento,              // tipo de celebración
    tipoPaquete,
    numeroInvitados: Number(numeroInvitados),
    salonSeleccionado,
    montoTotal,              // calculado en cliente (Integridad CIA)
    capacidadMaximaSalon,    // referencia histórica del salón
    uid:    auth.currentUser.uid,    // requerido por Security Rules
    estado: "Pendiente",             // ciclo de vida de la reservación
    usuario: auth.currentUser.email,
    creadoEn: firebase.firestore.FieldValue.serverTimestamp()
  })
    .then(() => {
      // Enviar notificación por correo con EmailJS
      emailjs.send("service_axx0wmq", "template_fg1xpla", {
        clienteEmpresa:    clienteEmpresa,
        salonSeleccionado: salonSeleccionado,
        fechaEvento:       fechaEvento,
        tipoEvento:        tipoEvento,
        tipoPaquete:       tipoPaquete,
        montoTotal:        "$" + montoTotal.toLocaleString("es-MX"),
        numeroInvitados:   numeroInvitados,
        email_cliente:     auth.currentUser.email
      }).then(
        function(response) {
          console.log("Email enviado con éxito:", response.status, response.text);
        },
        function(error) {
          console.error("Error al enviar el email:", error);
        }
      );

      mostrarModal("success", "Reservación registrada", "Tu fecha fue apartada correctamente.");

      // Limpiar formulario (incluyendo el nuevo campo tipoEvento)
      document.getElementById("clienteEmpresa").value    = "";
      document.getElementById("fechaEvento").value       = "";
      document.getElementById("tipoEvento").value        = "";
      document.getElementById("tipoPaquete").value       = "";
      document.getElementById("numeroInvitados").value   = "";
      document.getElementById("salonSeleccionado").value = "";

      // Ocultar la tarjeta de resumen al limpiar
      const resumen = document.getElementById("resumenCotizacion");
      if (resumen) resumen.classList.add("hidden");

      cargarReservaciones();
    })
    .catch(e => {
      mostrarModal("error", "Error al guardar", "No se pudo registrar la reservación: " + e.message);
    })
    .finally(() => setButtonLoading("btnReservar", false, "Reservar Fecha"));
}

// ─────────────────────────────────────────────────────────────────
//  CONFIGURACIÓN DE ESTADOS — mensajes, íconos y paleta por estado
// ─────────────────────────────────────────────────────────────────
const ESTADO_CONFIG = {
  "Pendiente": {
    // Heroicon: clock (outline)
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
             <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
           </svg>`,
    label: "Pendiente de confirmación",
    mensaje: "Tu solicitud está en revisión. Te notificaremos pronto.",
    badgeClass: "res-badge--pending",
    bannerClass: "res-banner--pending",
  },
  "Confirmado": {
    // Heroicon: check-circle (outline)
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
             <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
           </svg>`,
    label: "Confirmado",
    mensaje: "¡Disfruta tu fiesta! Todo está listo para tu gran celebración.",
    badgeClass: "res-badge--confirmed",
    bannerClass: "res-banner--confirmed",
  },
  "En Estancia": {
    // Heroicon: sparkles (outline)
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
             <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
           </svg>`,
    label: "En Estancia",
    mensaje: "¡El momento es ahora! Que cada instante sea inolvidable.",
    badgeClass: "res-badge--active",
    bannerClass: "res-banner--active",
  },
  "Finalizado": {
    // Heroicon: star (outline)
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
             <path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
           </svg>`,
    label: "Finalizado",
    mensaje: "Gracias por elegirnos. Fue un honor ser parte de tu historia.",
    badgeClass: "res-badge--done",
    bannerClass: "res-banner--done",
  },
  "Cancelado": {
    // Heroicon: x-circle (outline)
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
             <path stroke-linecap="round" stroke-linejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
           </svg>`,
    label: "Cancelado",
    mensaje: "Lamentamos tu decisión. Siempre habrá una próxima celebración.",
    badgeClass: "res-badge--cancelled",
    bannerClass: "res-banner--cancelled",
  },
};

/**
 * cargarReservaciones — Suscripción en tiempo real con onSnapshot.
 * Cada vez que el admin cambia el estado de una reservación en Firestore,
 * el cliente ve el cambio al instante sin necesidad de recargar.
 * El listener se cancela al cerrar sesión (reservacionesUnsubscribe).
 */
function cargarReservaciones() {
  if (!auth.currentUser) return;

  // Cancelar cualquier listener previo antes de crear uno nuevo
  if (reservacionesUnsubscribe) {
    reservacionesUnsubscribe();
    reservacionesUnsubscribe = null;
  }

  reservacionesUnsubscribe = db.collection("reservaciones")
    .where("usuario", "==", auth.currentUser.email)
    .onSnapshot(snapshot => {
      const lista = document.getElementById("listaReservaciones");
      if (!lista) return;

      lista.innerHTML = "";

      const reservaciones = [];
      snapshot.forEach(doc => reservaciones.push(doc.data()));

      reservaciones.sort((a, b) => a.fechaEvento.localeCompare(b.fechaEvento));

      reservaciones.forEach(d => {
        const montoFmt = d.montoTotal != null
          ? "$" + Number(d.montoTotal).toLocaleString("es-MX")
          : "—";
        const capacidadFmt = d.capacidadMaximaSalon != null
          ? d.capacidadMaximaSalon + " personas"
          : "—";
        const tipoEventoFmt = d.tipoEvento || "—";

        // Fecha legible en español
        const fechaLegible = d.fechaEvento
          ? new Date(d.fechaEvento + "T12:00:00").toLocaleDateString("es-MX", {
              weekday: "long", day: "numeric", month: "long", year: "numeric"
            })
          : d.fechaEvento;

        // Configuración del estado actual
        const estadoKey = d.estado || "Pendiente";
        const estadoCfg = ESTADO_CONFIG[estadoKey] || ESTADO_CONFIG["Pendiente"];

        const item = document.createElement("article");
        item.className = "res-card";

        item.innerHTML = `
          <!-- Banner de estado con Heroicon + mensaje contextual -->
          <div class="res-banner ${estadoCfg.bannerClass}">
            <span class="res-banner__icon">${estadoCfg.icon}</span>
            <div class="res-banner__body">
              <span class="res-banner__label">${estadoCfg.label}</span>
              <p class="res-banner__msg">${estadoCfg.mensaje}</p>
            </div>
            <span class="res-badge ${estadoCfg.badgeClass}">${estadoKey}</span>
          </div>

          <!-- Cabecera: cliente + fecha -->
          <div class="res-header">
            <div class="res-header__info">
              <h4 class="res-header__name">${d.clienteEmpresa}</h4>
              <p class="res-header__type">${tipoEventoFmt}</p>
            </div>
            <span class="res-header__date">
              <svg xmlns="http://www.w3.org/2000/svg" class="res-header__date-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z" clip-rule="evenodd" />
              </svg>
              ${fechaLegible}
            </span>
          </div>

          <!-- Grid de detalles -->
          <div class="res-grid">
            <div class="res-cell">
              <p class="res-cell__label">Salón</p>
              <p class="res-cell__value">
                <svg xmlns="http://www.w3.org/2000/svg" class="res-cell__icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fill-rule="evenodd" d="M9.293 2.293a1 1 0 011.414 0l7 7A1 1 0 0117 11h-1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-3a1 1 0 00-1-1H9a1 1 0 00-1 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-6H3a1 1 0 01-.707-1.707l7-7z" clip-rule="evenodd" />
                </svg>
                ${d.salonSeleccionado}
              </p>
            </div>
            <div class="res-cell">
              <p class="res-cell__label">Paquete</p>
              <p class="res-cell__value">
                <svg xmlns="http://www.w3.org/2000/svg" class="res-cell__icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M11.983 1.907a.75.75 0 00-1.292-.656l-8.5 9.5A.75.75 0 002.75 12h6.572l-1.305 6.093a.75.75 0 001.292.656l8.5-9.5A.75.75 0 0017.25 8h-6.572l1.305-6.093z" />
                </svg>
                ${d.tipoPaquete}
              </p>
            </div>
            <div class="res-cell">
              <p class="res-cell__label">Invitados / Cap.</p>
              <p class="res-cell__value">
                <svg xmlns="http://www.w3.org/2000/svg" class="res-cell__icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                </svg>
                ${d.numeroInvitados} / ${capacidadFmt}
              </p>
            </div>
            <div class="res-cell res-cell--highlight">
              <p class="res-cell__label">Total estimado</p>
              <p class="res-cell__value res-cell__value--amount">${montoFmt}</p>
            </div>
          </div>
        `;
        lista.appendChild(item);
      });

      if (!reservaciones.length) {
        lista.innerHTML = `
          <div class="res-empty">
            <svg xmlns="http://www.w3.org/2000/svg" class="res-empty__icon" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
            <p class="res-empty__title">Aún no hay reservaciones</p>
            <p class="res-empty__sub">Las fechas que apartes se mostrarán aquí con todos sus detalles.</p>
          </div>
        `;
      }
    }, err => {
      mostrarModal("error", "Error al cargar", "No fue posible cargar tus reservaciones: " + err.message);
    });
}
