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

// Control de sesión
auth.onAuthStateChanged(user => {
  if (user) {
    document.getElementById("zonaPrivada").classList.remove("oculto");
    document.getElementById("estado").innerText = "Sesión iniciada: " + user.email;
  } else {
    document.getElementById("zonaPrivada").classList.add("oculto");
    document.getElementById("estado").innerText = "No has iniciado sesión";
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

// Guardar cita
function guardarCita() {
  let nombre = document.getElementById("nombre").value;
  let servicio = document.getElementById("servicio").value;
  let fecha = document.getElementById("fecha").value;

  db.collection("citas").add({
    nombre,
    servicio,
    fecha,
    usuario: auth.currentUser.email
  });

  alert("Cita registrada");
  cargarCitas();
}

// Mostrar citas
function cargarCitas() {
  db.collection("citas").get().then(snapshot => {
    let lista = document.getElementById("listaCitas");
    lista.innerHTML = "";

    snapshot.forEach(doc => {
      let d = doc.data();
      lista.innerHTML += `<p>${d.nombre} - ${d.servicio} - ${d.fecha}</p>`;
    });
  });
}

cargarCitas();
