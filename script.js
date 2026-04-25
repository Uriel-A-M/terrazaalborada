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
      }
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth >= 768) {
        cerrarMenuMovil();
      }
    });
  }
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
  let email = document.getElementById("email").value;
  let password = document.getElementById("password").value;

  auth.createUserWithEmailAndPassword(email, password)
    .then(() => alert("Usuario registrado"))
    .catch(e => alert(e.message));
}

// Login
function login() {
  let email = document.getElementById("email").value;
  let password = document.getElementById("password").value;

  auth.signInWithEmailAndPassword(email, password)
    .then(() => alert("Bienvenido"))
    .catch(() => alert("Error en login"));
}

// Logout
function logout() {
  auth.signOut();
}

// Guardar reservación
function guardarReservacion() {
  if (!auth.currentUser) {
    alert("Debes iniciar sesión para reservar.");
    return;
  }

  const clienteEmpresa = document.getElementById("clienteEmpresa").value.trim();
  const fechaEvento = document.getElementById("fechaEvento").value;
  const tipoPaquete = document.getElementById("tipoPaquete").value;
  const numeroInvitados = document.getElementById("numeroInvitados").value;
  const salonSeleccionado = document.getElementById("salonSeleccionado").value;

  if (!clienteEmpresa || !fechaEvento || !tipoPaquete || !numeroInvitados || !salonSeleccionado) {
    alert("Completa todos los campos de la reservación.");
    return;
  }

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
      alert("Reservación registrada");

      document.getElementById("clienteEmpresa").value = "";
      document.getElementById("fechaEvento").value = "";
      document.getElementById("tipoPaquete").value = "";
      document.getElementById("numeroInvitados").value = "";
      document.getElementById("salonSeleccionado").value = "";

      cargarReservaciones();
    })
    .catch(e => {
      alert("Error al guardar la reservación: " + e.message);
    });
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
        item.className = "rounded-lg border border-alborada-green/20 bg-white px-4 py-3 shadow-sm";
        item.textContent = `${d.clienteEmpresa} | ${d.salonSeleccionado} | ${d.fechaEvento} | ${d.tipoPaquete} | Invitados: ${d.numeroInvitados}`;
        lista.appendChild(item);
      });

      if (!reservaciones.length) {
        lista.innerHTML = "<p class='text-sm text-alborada-dark/70'>No hay reservaciones registradas para este usuario.</p>";
      }
    })
    .catch(e => {
      alert("Error al cargar reservaciones: " + e.message);
    });
}
