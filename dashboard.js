// =============================================================
// DASHBOARD.JS — Panel Administrativo BI · Terraza Alborada
//
// ARQUITECTURA CIA (Tríada de Seguridad de la Información):
// • CONFIDENCIALIDAD: onAuthStateChanged + verificación de rol admin
//   impide que usuarios no autorizados accedan al panel.
// • INTEGRIDAD: Los cambios de estado usan update() (no set()),
//   tocando SOLO el campo 'estado' sin riesgo de sobreescribir
//   montoTotal u otros datos críticos del documento.
// • DISPONIBILIDAD: onSnapshot mantiene los datos sincronizados
//   en tiempo real; errores de red se capturan con .catch().
// =============================================================

// --- Firebase Config (misma que index.html) ---
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

// =============================================================
// MÓDULO 0: Variables globales
// =============================================================
let reservacionesCache = [];
let calendarInstance   = null;
let chartDonaInstance  = null;
let chartBarrasInstance = null;
let unsubscribeSnapshot = null;

// Paleta de colores para gráficas
const CHART_COLORS = {
  gold:    '#C9A227',
  green:   '#1F5A3D',
  cream:   '#F8F5EA',
  blue:    '#3b82f6',
  pink:    '#ec4899',
  purple:  '#8b5cf6',
  orange:  '#f97316',
  teal:    '#14b8a6',
  red:     '#ef4444'
};
const PALETTE = [
  CHART_COLORS.gold, CHART_COLORS.green, CHART_COLORS.blue,
  CHART_COLORS.pink, CHART_COLORS.purple, CHART_COLORS.orange,
  CHART_COLORS.teal, CHART_COLORS.red
];

// Colores de estado para FullCalendar
const ESTADO_COLORES = {
  Confirmado:  '#1F5A3D',
  Pendiente:   '#C9A227',
  Finalizado:  '#6b7280',
  Cancelado:   '#ef4444'
};

// =============================================================
// MÓDULO 1: Auth Guard (CIA — Confidencialidad)
// Si el usuario no está logueado o su rol no es "admin",
// se redirige a index.html. El overlay impide ver el contenido
// hasta que se confirme la autorización.
// =============================================================
auth.onAuthStateChanged(async (user) => {
  const overlay = document.getElementById("authOverlay");
  const app     = document.getElementById("app");

  if (!user) {
    window.location.href = "index.html";
    return;
  }

  try {
    const perfil = await db.collection("users").doc(user.uid).get();

    if (!perfil.exists || perfil.data().role !== "admin") {
      // Usuario autenticado pero NO es admin → redirigir
      window.location.href = "index.html";
      return;
    }

    // ✅ Es admin — mostrar la app
    document.getElementById("adminEmail").textContent = user.email;
    overlay.classList.add("hidden");
    app.classList.remove("hidden");
    inicializarDashboard();

  } catch (error) {
    console.error("Error verificando rol:", error);
    window.location.href = "index.html";
  }
});

// =============================================================
// MÓDULO 2: onSnapshot — Sincronización en tiempo real
// Usa onSnapshot en lugar de .get() para que cualquier cambio
// en Firestore se refleje instantáneamente sin recargar.
// =============================================================
function inicializarDashboard() {
  inicializarCalendario();
  setupEventListeners();

  // Escuchar cambios en tiempo real de TODAS las reservaciones
  unsubscribeSnapshot = db.collection("reservaciones")
    .onSnapshot(snapshot => {
      reservacionesCache = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Aplicar filtros y re-renderizar todo
      const filtradas = aplicarFiltros(reservacionesCache);
      actualizarKPIs(filtradas);
      actualizarGraficas(filtradas);
      actualizarCalendario(filtradas);
      renderizarLista(filtradas);
    }, error => {
      console.error("Error en onSnapshot:", error);
    });
}

// =============================================================
// MÓDULO 3: KPIs de BI
// =============================================================
function actualizarKPIs(arr) {
  // KPI 1: Ingresos Totales
  const ingresos = arr.reduce((acc, r) => acc + (r.montoTotal ?? 0), 0);
  document.getElementById("kpiIngresos").textContent =
    "$" + ingresos.toLocaleString("es-MX");
  document.getElementById("kpiIngresosCount").textContent =
    arr.length + " reservaciones";

  // KPI 2: Tipo de Evento más popular
  const freqEventos = contarFrecuencias(arr, "tipoEvento");
  const topEvento   = obtenerTop(freqEventos);
  document.getElementById("kpiEvento").textContent = topEvento.nombre || "—";
  document.getElementById("kpiEventoCount").textContent =
    topEvento.count ? topEvento.count + " reservaciones" : "";

  // KPI 3: Salón con más reservas
  const freqSalones = contarFrecuencias(arr, "salonSeleccionado");
  const topSalon    = obtenerTop(freqSalones);
  document.getElementById("kpiSalon").textContent = topSalon.nombre || "—";
  document.getElementById("kpiSalonCount").textContent =
    topSalon.count ? topSalon.count + " reservaciones" : "";
}

function contarFrecuencias(arr, campo) {
  const freq = {};
  arr.forEach(r => {
    const valor = r[campo];
    if (valor) freq[valor] = (freq[valor] || 0) + 1;
  });
  return freq;
}

function obtenerTop(freq) {
  const entries = Object.entries(freq);
  if (!entries.length) return { nombre: null, count: 0 };
  entries.sort((a, b) => b[1] - a[1]);
  return { nombre: entries[0][0], count: entries[0][1] };
}

// =============================================================
// MÓDULO 4: Chart.js — Gráficas analíticas
// =============================================================
function actualizarGraficas(arr) {
  actualizarChartDona(arr);
  actualizarChartBarras(arr);
}

function actualizarChartDona(arr) {
  const freq = contarFrecuencias(arr, "tipoEvento");
  const labels = Object.keys(freq);
  const data   = Object.values(freq);

  // Destruir instancia previa para evitar memory leaks
  if (chartDonaInstance) chartDonaInstance.destroy();

  const ctx = document.getElementById("chartTipoEvento").getContext("2d");
  const isDark = document.documentElement.classList.contains("dark");

  chartDonaInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: PALETTE.slice(0, labels.length),
        borderWidth: 0,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: isDark ? "#fff" : "#0F2A1F",
            font: { family: "'Source Sans 3', sans-serif", size: 12, weight: 600 },
            padding: 16,
            usePointStyle: true,
            pointStyleWidth: 12
          }
        }
      },
      cutout: "60%"
    }
  });
}

function actualizarChartBarras(arr) {
  // Agrupar ingresos por salón
  const ingresosPorSalon = {};
  arr.forEach(r => {
    const salon = r.salonSeleccionado;
    if (salon) {
      ingresosPorSalon[salon] = (ingresosPorSalon[salon] || 0) + (r.montoTotal ?? 0);
    }
  });

  const labels = Object.keys(ingresosPorSalon);
  const data   = Object.values(ingresosPorSalon);

  if (chartBarrasInstance) chartBarrasInstance.destroy();

  const ctx = document.getElementById("chartIngresosSalon").getContext("2d");
  const isDark = document.documentElement.classList.contains("dark");

  chartBarrasInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Ingresos ($)",
        data,
        backgroundColor: [CHART_COLORS.gold, CHART_COLORS.green, CHART_COLORS.blue],
        borderRadius: 8,
        barThickness: 48
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          ticks: {
            color: isDark ? "rgba(255,255,255,0.6)" : "#4A4636",
            font: { family: "'Source Sans 3', sans-serif", weight: 600 }
          },
          grid: { display: false }
        },
        y: {
          ticks: {
            color: isDark ? "rgba(255,255,255,0.4)" : "#4A4636",
            callback: v => "$" + v.toLocaleString("es-MX")
          },
          grid: { color: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }
        }
      }
    }
  });
}

// =============================================================
// MÓDULO 5: FullCalendar v6
// =============================================================
function inicializarCalendario() {
  const calEl = document.getElementById("calendarioFC");
  if (!calEl) return;

  calendarInstance = new FullCalendar.Calendar(calEl, {
    initialView: "dayGridMonth",
    locale: "es",
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,listWeek"
    },
    height: "auto",
    eventDisplay: "block",
    dayMaxEvents: 3,
    events: [] // se llenan con actualizarCalendario()
  });
  calendarInstance.render();
}

function actualizarCalendario(arr) {
  if (!calendarInstance) return;

  // Remover todos los eventos previos
  calendarInstance.removeAllEvents();

  // Añadir los eventos filtrados
  const eventos = arr.map(r => ({
    title: `${r.clienteEmpresa || "Sin nombre"} · ${r.salonSeleccionado || ""}`,
    start: r.fechaEvento,
    color: ESTADO_COLORES[r.estado] || ESTADO_COLORES.Pendiente,
    extendedProps: { id: r.id, estado: r.estado }
  }));

  calendarInstance.addEventSource(eventos);
}

// =============================================================
// MÓDULO 6: Filtros de BI
// =============================================================
function aplicarFiltros(arr) {
  const salon  = document.getElementById("filtroSalon")?.value || "";
  const tipo   = document.getElementById("filtroTipoEvento")?.value || "";
  const estado = document.getElementById("filtroEstado")?.value || "";
  const desde  = document.getElementById("filtroFechaDesde")?.value || "";
  const hasta  = document.getElementById("filtroFechaHasta")?.value || "";

  return arr.filter(r => {
    if (salon  && r.salonSeleccionado !== salon)  return false;
    if (tipo   && r.tipoEvento !== tipo)          return false;
    if (estado && r.estado !== estado)             return false;
    if (desde  && r.fechaEvento < desde)           return false;
    if (hasta  && r.fechaEvento > hasta)            return false;
    return true;
  });
}

function refrescarVista() {
  const filtradas = aplicarFiltros(reservacionesCache);
  actualizarKPIs(filtradas);
  actualizarGraficas(filtradas);
  actualizarCalendario(filtradas);
  renderizarLista(filtradas);
}

// =============================================================
// MÓDULO 7: Renderizar lista de reservaciones (Admin)
// =============================================================
function renderizarLista(arr) {
  const lista = document.getElementById("listaAdmin");
  if (!lista) return;

  if (!arr.length) {
    lista.innerHTML = `
      <div class="empty-state">
        <p class="font-display text-xl font-medium text-[#0F2A1F] dark:text-white">Sin resultados</p>
        <p class="mt-2 text-sm text-[#4A4636] dark:text-gray-400">No hay reservaciones que coincidan con los filtros.</p>
      </div>
    `;
    return;
  }

  // Ordenar por fecha descendente
  const sorted = [...arr].sort((a, b) => (b.fechaEvento || "").localeCompare(a.fechaEvento || ""));

  lista.innerHTML = sorted.map(r => {
    const montoFmt = r.montoTotal != null
      ? "$" + Number(r.montoTotal).toLocaleString("es-MX")
      : "—";
    const estadoActual = r.estado || "Pendiente";
    const tipoEventoFmt = r.tipoEvento || "—";
    const invitados = r.numeroInvitados ?? "—";
    const capacidad = r.capacidadMaximaSalon != null
      ? r.capacidadMaximaSalon
      : "—";

    return `
      <article class="reserva-admin-card">
        <div>
          <div class="flex flex-wrap items-center gap-2 mb-1">
            <span class="client-name">${r.clienteEmpresa || "Sin nombre"}</span>
            <span class="badge-estado badge-${estadoActual}">${estadoActual}</span>
          </div>
          <div class="detail-row">
            <span class="detail-item"><span class="detail-label">Fecha</span> ${r.fechaEvento || "—"}</span>
            <span class="detail-item"><span class="detail-label">Salón</span> ${r.salonSeleccionado || "—"}</span>
            <span class="detail-item"><span class="detail-label">Paquete</span> ${r.tipoPaquete || "—"}</span>
            <span class="detail-item"><span class="detail-label">Evento</span> ${tipoEventoFmt}</span>
            <span class="detail-item"><span class="detail-label">Invitados</span> ${invitados} / ${capacidad}</span>
          </div>
        </div>
        <div class="flex flex-col items-end gap-2">
          <span class="reserva-monto">${montoFmt}</span>
          <select class="estado-select" data-id="${r.id}" onchange="cambiarEstado('${r.id}', this.value)">
            <option value="Pendiente"   ${estadoActual === "Pendiente"   ? "selected" : ""}>⏳ Pendiente</option>
            <option value="Confirmado"  ${estadoActual === "Confirmado"  ? "selected" : ""}>✅ Confirmado</option>
            <option value="Finalizado"  ${estadoActual === "Finalizado"  ? "selected" : ""}>📋 Finalizado</option>
            <option value="Cancelado"   ${estadoActual === "Cancelado"   ? "selected" : ""}>❌ Cancelado</option>
          </select>
        </div>
      </article>
    `;
  }).join("");
}

// =============================================================
// MÓDULO 8: Cambiar Estado (CIA — Integridad)
// Se usa update() en lugar de set() para tocar ÚNICAMENTE el
// campo 'estado', sin riesgo de sobreescribir montoTotal u otros
// datos críticos del documento. Esto garantiza la INTEGRIDAD
// de la información almacenada en la nube.
// =============================================================
async function cambiarEstado(reservaId, nuevoEstado) {
  try {
    await db.collection("reservaciones").doc(reservaId).update({
      estado: nuevoEstado,
      actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
    });
    // onSnapshot detectará el cambio y re-renderizará automáticamente
  } catch (error) {
    console.error("Error al cambiar estado:", error);
    alert("No se pudo actualizar el estado: " + error.message);
    // Revertir visualmente: re-renderizar con datos del cache
    refrescarVista();
  }
}

// =============================================================
// Event Listeners
// =============================================================
function setupEventListeners() {
  // Logout
  document.getElementById("btnLogout")?.addEventListener("click", () => {
    if (unsubscribeSnapshot) unsubscribeSnapshot();
    auth.signOut().then(() => {
      window.location.href = "index.html";
    });
  });

  // Filtros: cada cambio refresca la vista
  ["filtroSalon", "filtroTipoEvento", "filtroEstado", "filtroFechaDesde", "filtroFechaHasta"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", refrescarVista);
  });

  // Botón limpiar filtros
  document.getElementById("btnLimpiarFiltros")?.addEventListener("click", () => {
    ["filtroSalon", "filtroTipoEvento", "filtroEstado", "filtroFechaDesde", "filtroFechaHasta"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    refrescarVista();
  });

  // Sidebar móvil
  const mobileBtn = document.getElementById("mobileMenuBtn");
  const sidebar   = document.getElementById("sidebar");
  const overlay   = document.getElementById("sidebarOverlay");

  if (mobileBtn && sidebar && overlay) {
    mobileBtn.addEventListener("click", () => {
      sidebar.classList.toggle("open");
      overlay.classList.toggle("hidden");
    });
    overlay.addEventListener("click", () => {
      sidebar.classList.remove("open");
      overlay.classList.add("hidden");
    });
  }

  // Sidebar links: active state
  document.querySelectorAll(".sidebar-link[href^='#']").forEach(link => {
    link.addEventListener("click", (e) => {
      document.querySelectorAll(".sidebar-link").forEach(l => l.classList.remove("active"));
      link.classList.add("active");
      // Cerrar sidebar en móvil
      if (window.innerWidth < 769) {
        sidebar?.classList.remove("open");
        overlay?.classList.add("hidden");
      }
    });
  });
}
