// dashboard.js — Panel Administrativo BI · Terraza Alborada
// CIA: Confidencialidad (auth guard) · Integridad (update) · Disponibilidad (onSnapshot)

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.firestore();

// ── Estado global ──────────────────────────────────────────────
let reservacionesCache = [];
let calendarInstance    = null;
let chartLineIngresosInstance = null;
let chartIngresosSalonInstance = null;
let chartRadarDensidadInstance = null;
let chartPieDiasInstance = null;
let chartDonaEstadosInstance = null;
let chartTipoEventoInstance = null;
let chartBarTicketPromedioInstance = null;
let chartScatterCorrelacionInstance = null;
let unsubscribeSnapshot = null;

const ESTADO_COLOR = {
  Pendiente:  '#C9A227',
  Confirmado: '#1F5A3D',
  Finalizado: '#6b7280',
  Cancelado:  '#ef4444'
};
const PALETTE = ['#C9A227','#1F5A3D','#3b82f6','#ec4899','#8b5cf6','#f97316'];

// ── Módulo 1: Auth Guard ───────────────────────────────────────
auth.onAuthStateChanged(async (user) => {
  if (!user) { window.location.href = 'index.html'; return; }
  try {
    const doc = await db.collection('users').doc(user.uid).get();
    if (!doc.exists || doc.data().role !== 'admin') {
      window.location.href = 'index.html'; return;
    }
    document.getElementById('adminEmail').textContent = user.email;
    document.getElementById('authOverlay').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    inicializarDashboard();
  } catch (e) {
    console.error('Error verificando rol:', e);
    window.location.href = 'index.html';
  }
});

// ── Módulo 2: onSnapshot (tiempo real) ────────────────────────
function inicializarDashboard() {
  inicializarCalendario();
  setupListeners();
  mostrarSkeletons();   // Estado de carga antes del primer onSnapshot
  unsubscribeSnapshot = db.collection('reservaciones').onSnapshot(snapshot => {
    reservacionesCache = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    const filtradas = aplicarFiltros(reservacionesCache);
    actualizarKPIs(reservacionesCache);     // KPIs de gestión: siempre globales
    actualizarKPIsBI(filtradas);            // KPIs de BI: responden a filtros
    actualizarGraficas(filtradas);
    actualizarCalendario(filtradas);
    renderizarLista(filtradas);
  }, err => console.error('onSnapshot error:', err));
}

// ── Módulo 3: KPIs ────────────────────────────────────────────
function actualizarKPIs(arr) {
  const total       = arr.length;
  const pendientes  = arr.filter(r => r.estado === 'Pendiente').length;
  const confirmadas = arr.filter(r => r.estado === 'Confirmado').length;
  setKPI('kpiTotal',       total,       null);
  setKPI('kpiPendientes',  pendientes,  null);
  setKPI('kpiConfirmadas', confirmadas, null);
}
function setKPI(id, val, _) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ── Módulo 3B: KPIs de BI (Analítica) ─────────────────────────
// Calculados sobre el array filtrado para que respondan a los filtros.
function actualizarKPIsBI(arr) {
  // Ingresos Totales
  const ingresos = arr.reduce((acc, r) => acc + (r.montoTotal ?? 0), 0);
  const elIng = document.getElementById('kpiBiIngresos');
  const elIngC = document.getElementById('kpiBiIngresosCount');
  if (elIng) elIng.textContent = '$' + ingresos.toLocaleString('es-MX');
  if (elIngC) elIngC.textContent = arr.length + ' reservaciones';

  // Evento más Popular
  const freqEvento = {};
  arr.forEach(r => { if (r.tipoEvento) freqEvento[r.tipoEvento] = (freqEvento[r.tipoEvento] || 0) + 1; });
  const topEvento = Object.entries(freqEvento).sort((a, b) => b[1] - a[1])[0];
  const elEv = document.getElementById('kpiBiEvento');
  const elEvC = document.getElementById('kpiBiEventoCount');
  if (elEv) elEv.textContent = topEvento ? topEvento[0] : '—';
  if (elEvC) elEvC.textContent = topEvento ? topEvento[1] + ' reservaciones' : '';

  // Salón con más Reservas
  const freqSalon = {};
  arr.forEach(r => { if (r.salonSeleccionado) freqSalon[r.salonSeleccionado] = (freqSalon[r.salonSeleccionado] || 0) + 1; });
  const topSalon = Object.entries(freqSalon).sort((a, b) => b[1] - a[1])[0];
  const elSa = document.getElementById('kpiBiSalon');
  const elSaC = document.getElementById('kpiBiSalonCount');
  if (elSa) elSa.textContent = topSalon ? topSalon[0] : '—';
  if (elSaC) elSaC.textContent = topSalon ? topSalon[1] + ' reservaciones' : '';

  // Paquete Estrella — más solicitado + ingresos que genera
  const freqPaq = {};
  const ingPaq  = {};
  arr.forEach(r => {
    if (r.tipoPaquete) {
      freqPaq[r.tipoPaquete] = (freqPaq[r.tipoPaquete] || 0) + 1;
      ingPaq[r.tipoPaquete]  = (ingPaq[r.tipoPaquete]  || 0) + (r.montoTotal || 0);
    }
  });
  const topPaq  = Object.entries(freqPaq).sort((a, b) => b[1] - a[1])[0];
  const elPaq   = document.getElementById('kpiBiPaquete');
  const elPaqC  = document.getElementById('kpiBiPaqueteCount');
  const elPaqI  = document.getElementById('kpiBiPaqueteIngresos');
  if (elPaq)  elPaq.textContent  = topPaq ? topPaq[0] : '—';
  if (elPaqC) elPaqC.textContent = topPaq ? topPaq[1] + ' reservaciones' : '';
  if (elPaqI) {
    const ing = topPaq ? ingPaq[topPaq[0]] : 0;
    elPaqI.textContent = ing
      ? '$' + Number(ing).toLocaleString('es-MX') + ' generados'
      : '';
  }
}


function getThemeColors() {
  const isDark = document.documentElement.classList.contains('dark');
  return {
    textMain: isDark ? 'rgba(255,255,255,.85)' : '#0F2A1F',
    textMuted: isDark ? 'rgba(255,255,255,.5)' : 'rgba(15,42,31,.6)',
    gridLine: isDark ? 'rgba(255,255,255,.05)' : 'rgba(15,42,31,.08)',
    bgModal: isDark ? '#102742' : '#FDFCF7',
    textModal: isDark ? '#fff' : '#0F2A1F',
    tooltipBg: isDark ? 'rgba(11,25,41,.95)' : 'rgba(253,252,247,.95)'
  };
}

// ── Módulo 4: Gráficas Chart.js ───────────────────────────────
function actualizarGraficas(arr) {
  const theme = getThemeColors();

  const isVentasVis = !document.getElementById('panel-ventas')?.classList.contains('hidden');
  const isLogisticaVis = !document.getElementById('panel-logistica')?.classList.contains('hidden');
  const isClientesVis = !document.getElementById('panel-clientes')?.classList.contains('hidden');

  if (isVentasVis) {
    // 1. Line: Histórico Mensual de Ingresos (panel-ventas)
    const lineData = {};
    arr.forEach(r => {
      if (r.fechaEvento && r.montoTotal) {
        const date = new Date(r.fechaEvento + "T00:00:00");
        const month = date.toLocaleString('es-MX', { month: 'short', year: 'numeric' });
        lineData[month] = (lineData[month] || 0) + r.montoTotal;
      }
    });
  if (chartLineIngresosInstance) chartLineIngresosInstance.destroy();
  const ctxLine = document.getElementById('chartLineIngresos')?.getContext('2d');
  if (ctxLine && Object.keys(lineData).length) {
    chartLineIngresosInstance = new Chart(ctxLine, {
      type: 'line',
      data: {
        labels: Object.keys(lineData),
        datasets: [{
          label: 'Ingresos',
          data: Object.values(lineData),
          borderColor: '#C9A227',
          backgroundColor: 'rgba(201,162,39,0.2)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#1F5A3D',
          pointBorderColor: '#fff',
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: theme.textMuted }, grid: { display: false } },
          y: { ticks: { color: theme.textMuted, callback: v => '$'+v.toLocaleString('es-MX') }, grid: { color: theme.gridLine } }
        }
      }
    });
  }

  // 2. Bar: Ingresos por Salón (panel-ventas)
  const ingSalon = {};
  arr.forEach(r => { if (r.salonSeleccionado) ingSalon[r.salonSeleccionado] = (ingSalon[r.salonSeleccionado]||0) + (r.montoTotal||0); });
  if (chartIngresosSalonInstance) chartIngresosSalonInstance.destroy();
  const ctxB = document.getElementById('chartIngresosSalon')?.getContext('2d');
  if (ctxB && Object.keys(ingSalon).length) {
    chartIngresosSalonInstance = new Chart(ctxB, {
      type: 'bar',
      data: { labels: Object.keys(ingSalon), datasets: [{ label: 'Ingresos', data: Object.values(ingSalon), backgroundColor: ['#C9A227','#1F5A3D','#3b82f6'], borderRadius: 8, barThickness: 48 }] },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: {
        x: { ticks: { color: theme.textMuted, font: { weight: 600 } }, grid: { display: false } },
        y: { ticks: { color: theme.textMuted, callback: v => '$'+v.toLocaleString('es-MX') }, grid: { color: theme.gridLine } }
      }}
    });
  }
  } // Fin panel-ventas

  if (isLogisticaVis) {
  // 4. Radar: Densidad Invitados (panel-logistica)
  const guestsSalon = { 'Balam': { total: 0, count: 0 }, 'Kukulcán': { total: 0, count: 0 }, 'Diamante': { total: 0, count: 0 } };
  arr.forEach(r => {
    if (r.salonSeleccionado && guestsSalon[r.salonSeleccionado] !== undefined && r.numeroInvitados) {
      guestsSalon[r.salonSeleccionado].total += parseInt(r.numeroInvitados);
      guestsSalon[r.salonSeleccionado].count += 1;
    }
  });
  const radarLabels = Object.keys(guestsSalon);
  const radarData = radarLabels.map(s => guestsSalon[s].count ? Math.round(guestsSalon[s].total / guestsSalon[s].count) : 0);
  if (chartRadarDensidadInstance) chartRadarDensidadInstance.destroy();
  const ctxRadar = document.getElementById('chartRadarDensidad')?.getContext('2d');
  if (ctxRadar && radarData.some(v => v > 0)) {
    chartRadarDensidadInstance = new Chart(ctxRadar, {
      type: 'radar',
      data: {
        labels: radarLabels,
        datasets: [{
          label: 'Promedio Invitados',
          data: radarData,
          backgroundColor: 'rgba(31, 90, 61, 0.4)',
          borderColor: '#1F5A3D',
          pointBackgroundColor: '#C9A227',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#C9A227'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          r: {
            angleLines: { color: theme.gridLine },
            grid: { color: theme.gridLine },
            pointLabels: { color: theme.textMain, font: { family: "'Source Sans 3'", weight: 600, size: 13 } },
            ticks: { display: false, backdropColor: 'transparent' }
          }
        }
      }
    });
  }

  // 5. Pie: Días de la semana (panel-logistica)
  const freqDias = { 'Dom':0, 'Lun':0, 'Mar':0, 'Mié':0, 'Jue':0, 'Vie':0, 'Sáb':0 };
  const diasArr = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  arr.forEach(r => {
    if (r.fechaEvento) {
      const [y, m, d] = r.fechaEvento.split('-');
      const date = new Date(y, m - 1, d);
      freqDias[diasArr[date.getDay()]] += 1;
    }
  });
  if (chartPieDiasInstance) chartPieDiasInstance.destroy();
  const ctxPie = document.getElementById('chartPieDias')?.getContext('2d');
  const validDias = Object.keys(freqDias).filter(k => freqDias[k] > 0);
  if (ctxPie && validDias.length) {
    chartPieDiasInstance = new Chart(ctxPie, {
      type: 'pie',
      data: {
        labels: validDias,
        datasets: [{
          data: validDias.map(d => freqDias[d]),
          backgroundColor: PALETTE,
          borderWidth: 1,
          borderColor: theme.bgModal
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'right', labels: { color: theme.textMuted, usePointStyle: true, boxWidth: 8 } } }
      }
    });
  }

  // 6. Dona: Estados de solicitudes (panel-logistica)
  const freqEstados = {};
  arr.forEach(r => { if (r.estado) freqEstados[r.estado] = (freqEstados[r.estado]||0)+1; });
  if (chartDonaEstadosInstance) chartDonaEstadosInstance.destroy();
  const ctxEstados = document.getElementById('chartDonaEstados')?.getContext('2d');
  if (ctxEstados && Object.keys(freqEstados).length) {
    const estadoColors = Object.keys(freqEstados).map(e => ESTADO_COLOR[e] || '#C9A227');
    chartDonaEstadosInstance = new Chart(ctxEstados, {
      type: 'doughnut',
      data: {
        labels: Object.keys(freqEstados),
        datasets: [{ data: Object.values(freqEstados), backgroundColor: estadoColors, borderWidth: 1, borderColor: theme.bgModal }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: theme.textMuted, usePointStyle: true, boxWidth: 8 } } }, cutout: '65%' }
    });
  }
  } // Fin panel-logistica

  if (isClientesVis) {
  // 7. Dona: Tipo de Evento (panel-clientes)
  const freqEvento = {};
  arr.forEach(r => { if (r.tipoEvento) freqEvento[r.tipoEvento] = (freqEvento[r.tipoEvento]||0)+1; });
  if (chartTipoEventoInstance) chartTipoEventoInstance.destroy();
  const ctxD = document.getElementById('chartTipoEvento')?.getContext('2d');
  if (ctxD && Object.keys(freqEvento).length) {
    chartTipoEventoInstance = new Chart(ctxD, {
      type: 'doughnut',
      data: { labels: Object.keys(freqEvento), datasets: [{ data: Object.values(freqEvento), backgroundColor: PALETTE, borderWidth: 0, hoverOffset: 8 }] },
      options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { color: theme.textMuted, font: { family: "'Source Sans 3'", weight: 600 }, padding: 16, usePointStyle: true } } }, cutout: '60%' }
    });
  }

  // 8. Horizontal Bar: Ticket Promedio por Evento (panel-clientes)
  const ticketEvento = {};
  arr.forEach(r => {
    if (r.tipoEvento && r.montoTotal) {
      if (!ticketEvento[r.tipoEvento]) ticketEvento[r.tipoEvento] = { total: 0, count: 0 };
      ticketEvento[r.tipoEvento].total += r.montoTotal;
      ticketEvento[r.tipoEvento].count += 1;
    }
  });
  if (chartBarTicketPromedioInstance) chartBarTicketPromedioInstance.destroy();
  const ctxTicket = document.getElementById('chartBarTicketPromedio')?.getContext('2d');
  const ticketLabels = Object.keys(ticketEvento);
  if (ctxTicket && ticketLabels.length) {
    const avgData = ticketLabels.map(t => Math.round(ticketEvento[t].total / ticketEvento[t].count));
    chartBarTicketPromedioInstance = new Chart(ctxTicket, {
      type: 'bar',
      data: {
        labels: ticketLabels,
        datasets: [{
          label: 'Ticket Promedio',
          data: avgData,
          backgroundColor: '#C9A227',
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: theme.textMuted, callback: v => '$'+v.toLocaleString('es-MX') }, grid: { color: theme.gridLine } },
          y: { ticks: { color: theme.textMuted, font: { weight: 600 } }, grid: { display: false } }
        }
      }
    });
  }

  // 9. Scatter: Correlación Invitados vs Inversión (panel-clientes)
  const scatterData = [];
  arr.forEach(r => {
    if (r.numeroInvitados && r.montoTotal) {
      scatterData.push({ x: parseInt(r.numeroInvitados), y: r.montoTotal, label: r.tipoEvento || 'Otro' });
    }
  });
  if (chartScatterCorrelacionInstance) chartScatterCorrelacionInstance.destroy();
  const ctxScatter = document.getElementById('chartScatterCorrelacion')?.getContext('2d');
  if (ctxScatter && scatterData.length) {
    chartScatterCorrelacionInstance = new Chart(ctxScatter, {
      type: 'scatter',
      data: {
        datasets: [{
          label: 'Reservaciones',
          data: scatterData,
          backgroundColor: 'rgba(31, 90, 61, 0.6)',
          borderColor: '#1F5A3D',
          pointRadius: 6,
          pointHoverRadius: 8
        }]
      },
      options: {
        responsive: true,
        plugins: { 
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => {
                const d = ctx.raw;
                return `${d.label}: ${d.x} px, $${d.y.toLocaleString('es-MX')}`;
              }
            }
          }
        },
        scales: {
          x: { title: { display: true, text: 'Número de Invitados', color: theme.textMain }, ticks: { color: theme.textMuted }, grid: { color: theme.gridLine } },
          y: { title: { display: true, text: 'Monto Total', color: theme.textMain }, ticks: { color: theme.textMuted, callback: v => '$'+v.toLocaleString('es-MX') }, grid: { color: theme.gridLine } }
        }
      }
    });
  }
  } // Fin panel-clientes

} // fin actualizarGraficas

// ── Módulo 5: FullCalendar ────────────────────────────────────
function inicializarCalendario() {
  const el = document.getElementById('calendarioFC');
  if (!el) return;
  calendarInstance = new FullCalendar.Calendar(el, {
    initialView: 'dayGridMonth', locale: 'es',
    headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,listWeek' },
    height: 'auto',
    events: [],
    eventClick(info) {
      const r = info.event.extendedProps;
      const monto = r.montoTotal != null
        ? '$' + Number(r.montoTotal).toLocaleString('es-MX')
        : '—';
      const inv = r.numeroInvitados ?? '—';
      const cap = r.capacidadMaximaSalon ?? '—';
      const estadoColor = { Pendiente:'#C9A227', Confirmado:'#34d399', Finalizado:'#9ca3af', Cancelado:'#f87171' }[r.estado] || '#C9A227';
      Swal.fire({
        background: getThemeColors().bgModal,
        color: getThemeColors().textModal,
        width: '480px',
        showCloseButton: true,
        showConfirmButton: false,
        html: `
          <div style="text-align:left;padding:.5rem .25rem">
            <p style="font-family:'Playfair Display',serif;font-size:1.4rem;font-weight:700;color:${getThemeColors().textModal};margin-bottom:.25rem">${r.clienteEmpresa || 'Sin nombre'}</p>
            <p style="font-size:.8rem;color:${getThemeColors().textMuted};margin-bottom:1.25rem">${r.usuario || ''}</p>
            <span style="display:inline-block;padding:.2rem .75rem;border-radius:9999px;font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;background:${estadoColor}22;color:${estadoColor};border:1px solid ${estadoColor}55;margin-bottom:1.25rem">${r.estado || 'Pendiente'}</span>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:.85rem 1.5rem">
              <div>
                <p style="font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#C9A227">Salón</p>
                <p style="font-size:.9rem;font-weight:600;color:${getThemeColors().textModal}">${r.salonSeleccionado || '—'}</p>
              </div>
              <div>
                <p style="font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#C9A227">Fecha del Evento</p>
                <p style="font-size:.9rem;font-weight:600;color:${getThemeColors().textModal}">${r.fechaEvento || '—'}</p>
              </div>
              <div>
                <p style="font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#C9A227">Tipo de Evento</p>
                <p style="font-size:.9rem;font-weight:600;color:${getThemeColors().textModal}">${r.tipoEvento || '—'}</p>
              </div>
              <div>
                <p style="font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#C9A227">Paquete</p>
                <p style="font-size:.9rem;font-weight:600;color:${getThemeColors().textModal}">${r.tipoPaquete || '—'}</p>
              </div>
              <div>
                <p style="font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#C9A227">Invitados</p>
                <p style="font-size:.9rem;font-weight:600;color:${getThemeColors().textModal}">${inv} <span style="color:${getThemeColors().textMuted}">/ ${cap}</span></p>
              </div>
              <div>
                <p style="font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#C9A227">Monto Total</p>
                <p style="font-size:.9rem;font-weight:700;color:#C9A227">${monto}</p>
              </div>
            </div>
          </div>
        `
      });
    }
  });
  calendarInstance.render();
}
function actualizarCalendario(arr) {
  if (!calendarInstance) return;
  calendarInstance.removeAllEvents();
  calendarInstance.addEventSource(arr.map(r => ({
    title: `${r.clienteEmpresa || 'Sin nombre'} · ${r.salonSeleccionado || ''}`.toUpperCase(),
    start: r.fechaEvento,
    color: ESTADO_COLOR[r.estado] || ESTADO_COLOR.Pendiente,
    extendedProps: { ...r }   // Todos los datos para el eventClick
  })));
}

// ── Módulo 6: Filtros ─────────────────────────────────────────
function aplicarFiltros(arr) {
  const q      = (document.getElementById('searchInput')?.value || '').toLowerCase();
  const estado = document.getElementById('filtroEstado')?.value || '';
  const desde  = document.getElementById('filtroFechaDesde')?.value || '';
  const hasta  = document.getElementById('filtroFechaHasta')?.value || '';
  return arr.filter(r => {
    if (q && !((r.clienteEmpresa||'').toLowerCase().includes(q) || (r.usuario||'').toLowerCase().includes(q))) return false;
    if (estado && r.estado !== estado) return false;
    if (desde && r.fechaEvento < desde) return false;
    if (hasta && r.fechaEvento > hasta) return false;
    return true;
  });
}
function refrescar() {
  const f = aplicarFiltros(reservacionesCache);
  actualizarKPIsBI(f);
  // Redibuja las gráficas si cualquier panel analítico es visible
  const analyticsVisible = ['panel-ventas', 'panel-logistica', 'panel-clientes'].some(id => !document.getElementById(id)?.classList.contains('hidden'));
  if (analyticsVisible) {
    try { actualizarGraficas(f); } catch (e) { console.warn('Charts skip:', e); }
  }
  actualizarCalendario(f);
  renderizarLista(f);
}

// ── Módulo 7: Skeleton loader ────────────────────────────────
function mostrarSkeletons(n = 4) {
  const lista = document.getElementById('listaAdmin');
  if (!lista) return;
  lista.innerHTML = Array.from({ length: n }).map((_, i) => `
    <div class="skeleton-card" style="animation-delay:${i * 80}ms">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem">
        <div style="flex:1">
          <div class="skel-line" style="height:18px;width:55%;margin-bottom:.6rem"></div>
          <div class="skel-line" style="height:12px;width:35%;margin-bottom:1rem"></div>
          <div style="display:flex;gap:1.5rem;flex-wrap:wrap">
            ${Array.from({length:5}).map(() =>
              `<div>
                <div class="skel-line" style="height:9px;width:48px;margin-bottom:.35rem"></div>
                <div class="skel-line" style="height:13px;width:72px"></div>
              </div>`
            ).join('')}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:.5rem;flex-shrink:0">
          <div class="skel-line" style="height:32px;width:110px;border-radius:.5rem"></div>
          <div class="skel-line" style="height:10px;width:70px"></div>
        </div>
      </div>
    </div>
  `).join('');
}

// ── Módulo 8: Renderizar lista ────────────────────────────────
function renderizarLista(arr) {
  const lista = document.getElementById('listaAdmin');
  if (!lista) return;
  if (!arr.length) {
    lista.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <i class="fa-solid fa-magnifying-glass" style="font-size:1.6rem;color:#34d399"></i>
        </div>
        <p style="font-family:'Playfair Display',serif;font-size:1.2rem;font-weight:700;color:${getThemeColors().textMain}">No se encontraron reservaciones</p>
        <p style="font-size:.875rem;color:${getThemeColors().textMuted}">Prueba cambiando las fechas o el término de búsqueda.</p>
        <button class="empty-btn" onclick="limpiarFiltros()">
          <i class="fa-solid fa-rotate-left"></i> Limpiar filtros
        </button>
      </div>
    `;
    return;
  }
  const sorted = [...arr].sort((a,b) => (b.fechaEvento||'').localeCompare(a.fechaEvento||''));
  lista.innerHTML = sorted.map(r => {
    const estado   = r.estado || 'Pendiente';
    const monto    = r.montoTotal != null ? '$'+Number(r.montoTotal).toLocaleString('es-MX') : '—';
    const inv      = r.numeroInvitados ?? '—';
    const cap      = r.capacidadMaximaSalon ?? '—';
    const email    = r.usuario || '—';
    const creadoEn = r.creadoEn?.toDate
      ? r.creadoEn.toDate().toLocaleDateString('es-MX')
      : '—';
    return `
    <article class="reserva-card estado-${estado}">
      <div style="display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:1rem">
        <!-- Info principal -->
        <div style="flex:1;min-width:200px">
          <div style="display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;margin-bottom:.2rem">
            <span style="font-family:'Playfair Display',serif;font-size:1.15rem;font-weight:700;color:${getThemeColors().textMain}">${r.clienteEmpresa || 'Sin nombre'}</span>
            <span class="badge badge-${estado}">${estado}</span>
          </div>
          <p style="font-size:.8rem;color:${getThemeColors().textMuted};margin-bottom:.75rem">
            <i class="fa-regular fa-envelope" style="margin-right:.35rem"></i>${email}
          </p>
          <!-- Chips de detalles -->
          <div style="display:flex;flex-wrap:wrap;gap:1.25rem">
            <div class="detail-chip"><span class="chip-label"><i class="fa-solid fa-building mr-1"></i>Salón</span><span class="chip-value">${r.salonSeleccionado||'—'}</span></div>
            <div class="detail-chip"><span class="chip-label"><i class="fa-regular fa-calendar mr-1"></i>Fecha</span><span class="chip-value">${r.fechaEvento||'—'}</span></div>
            <div class="detail-chip"><span class="chip-label"><i class="fa-solid fa-star-half-stroke mr-1"></i>Tipo</span><span class="chip-value">${r.tipoEvento||'—'}</span></div>
            <div class="detail-chip"><span class="chip-label"><i class="fa-solid fa-bolt mr-1"></i>Paquete</span><span class="chip-value">${r.tipoPaquete||'—'}</span></div>
            <div class="detail-chip"><span class="chip-label"><i class="fa-solid fa-users mr-1"></i>Invitados</span><span class="chip-value">${inv} / ${cap}</span></div>
            <div class="detail-chip"><span class="chip-label"><i class="fa-solid fa-peso-sign mr-1"></i>Monto</span><span class="chip-value" style="color:#C9A227">${monto}</span></div>
          </div>
        </div>
        <!-- Selector de estado -->
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:.5rem;flex-shrink:0">
          <select class="estado-select" onchange="cambiarEstado('${r.id}', this.value)">
            <option value="Pendiente"  ${estado==='Pendiente'  ?'selected':''}>Pendiente</option>
            <option value="Confirmado" ${estado==='Confirmado' ?'selected':''}>Confirmado</option>
            <option value="Finalizado" ${estado==='Finalizado' ?'selected':''}>Finalizado</option>
            <option value="Cancelado"  ${estado==='Cancelado'  ?'selected':''}>Cancelado</option>
          </select>
          <span style="font-size:.7rem;color:${getThemeColors().textMuted}">Creado: ${creadoEn}</span>
        </div>
      </div>
    </article>`;
  }).join('');
}

// ── Módulo 8: Cambiar Estado con SweetAlert2 ──────────────────
async function cambiarEstado(id, nuevoEstado) {
  const result = await Swal.fire({
    title: '¿Cambiar estado?',
    text: `La reservación pasará a: ${nuevoEstado}`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Confirmar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#C9A227',
    cancelButtonColor: 'rgba(255,255,255,.1)',
    background: getThemeColors().bgModal,
    color: getThemeColors().textModal,
    iconColor: '#C9A227'
  });
  if (!result.isConfirmed) {
    // Revertir visualmente el select
    refrescar();
    return;
  }
  try {
    await db.collection('reservaciones').doc(id).update({
      estado: nuevoEstado,
      actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
    });
    // onSnapshot actualizará automáticamente
  } catch (e) {
    Swal.fire({ title: 'Error', text: e.message, icon: 'error', background: getThemeColors().bgModal, color: getThemeColors().textModal });
    refrescar();
  }
}

// ── Módulo 9: Navegación entre secciones ──────────────────────
function showSection(id) {
  ['sec-reservaciones', 'panel-ventas', 'panel-logistica', 'panel-clientes'].forEach(s => {
    document.getElementById(s)?.classList.toggle('hidden', s !== id);
  });
  document.querySelectorAll('.nav-link[id^="nav-"]').forEach(l => l.classList.remove('active'));
  const navId = 'nav-' + id.replace('sec-', '');
  document.getElementById(navId)?.classList.add('active');
}

function showAnalyticsSection(panelId) {
  ['sec-reservaciones', 'panel-ventas', 'panel-logistica', 'panel-clientes'].forEach(s => {
    document.getElementById(s)?.classList.toggle('hidden', s !== panelId);
  });
  document.querySelectorAll('.nav-link[id^="nav-"]').forEach(l => l.classList.remove('active'));
  const navId = 'nav-analytics-' + panelId.replace('panel-', '');
  document.getElementById(navId)?.classList.add('active');
  
  // Al cambiar de panel, forzamos actualizar las gráficas
  refrescar();
  
  // Forzar redibujado de charts en el panel activo
  setTimeout(() => {
    if (panelId === 'panel-ventas') {
      chartLineIngresosInstance?.resize();
      chartIngresosSalonInstance?.resize();
    } else if (panelId === 'panel-logistica') {
      chartRadarDensidadInstance?.resize();
      chartPieDiasInstance?.resize();
      chartDonaEstadosInstance?.resize();
    } else if (panelId === 'panel-clientes') {
      chartTipoEventoInstance?.resize();
      chartBarTicketPromedioInstance?.resize();
      chartScatterCorrelacionInstance?.resize();
    }
  }, 100);
}

// limpiarFiltros — función global: usada por la barra de filtros
// Y por el botón del empty state (onclick inline en HTML generado).
function limpiarFiltros() {
  ['searchInput','filtroEstado','filtroFechaDesde','filtroFechaHasta'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  refrescar();
}

// ══════════════════════════════════════════════════════════════════
// MÓDULO EXPORTACIÓN — CIA: solo admin autenticado puede exportar
// ══════════════════════════════════════════════════════════════════

/**
 * formatFecha — convierte 'YYYY-MM-DD' → 'DD/MM/YYYY'.
 */
function formatFecha(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * prepararFilas — Construye el array de objetos con los datos ya
 * formateados a partir del array filtrado actual.
 * Aplica los mismos filtros que la vista, garantizando que el
 * exportado coincida exactamente con lo que el admin ve en pantalla.
 */
function prepararFilas() {
  // CIA — CONFIDENCIALIDAD: verificar sesión admin antes de preparar datos.
  if (!auth.currentUser) {
    Swal.fire({ title: 'Acceso denegado', text: 'Debes estar autenticado para exportar.', icon: 'error', background: getThemeColors().bgModal, color: getThemeColors().textModal });
    return null;
  }

  const datos = aplicarFiltros(reservacionesCache);

  if (!datos.length) {
    Swal.fire({ title: 'Sin datos', text: 'No hay reservaciones que exportar con los filtros actuales.', icon: 'info', background: '#102742', color: '#fff', iconColor: '#C9A227' });
    return null;
  }

  return datos.map(r => ({
    'Cliente':           r.clienteEmpresa   || '—',
    'Correo':            r.usuario          || '—',
    'Salón':             r.salonSeleccionado || '—',
    'Fecha del Evento':  formatFecha(r.fechaEvento),
    'Tipo de Evento':    r.tipoEvento       || '—',
    'Paquete':           r.tipoPaquete      || '—',
    'Invitados':         r.numeroInvitados  ?? '—',
    'Capacidad Máx.':    r.capacidadMaximaSalon ?? '—',
    'Monto Total (MXN)': r.montoTotal != null
      ? Number(r.montoTotal).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
      : '—',
    'Estado':            r.estado           || '—',
  }));
}

/**
 * exportarExcel — Genera un archivo .xlsx con SheetJS.
 * Nombre automático: Reporte_Alborada_YYYY-MM-DD.xlsx
 */
function exportarExcel() {
  const filas = prepararFilas();
  if (!filas) return;

  const ws = XLSX.utils.json_to_sheet(filas);

  // Ancho de columnas proporcional al contenido
  ws['!cols'] = [
    { wch: 28 }, { wch: 30 }, { wch: 14 }, { wch: 18 },
    { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 16 },
    { wch: 22 }, { wch: 14 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Reservaciones');

  const fecha = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `Reporte_Alborada_${fecha}.xlsx`);

  cerrarExportMenu();
}

/**
 * exportarCSV — Genera un archivo .csv con SheetJS (tipo 'csv').
 * Nombre automático: Reporte_Alborada_YYYY-MM-DD.csv
 */
function exportarCSV() {
  const filas = prepararFilas();
  if (!filas) return;

  const ws  = XLSX.utils.json_to_sheet(filas);
  const csv = XLSX.utils.sheet_to_csv(ws);

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM para Excel en Windows
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const fecha = new Date().toISOString().split('T')[0];
  a.href     = url;
  a.download = `Reporte_Alborada_${fecha}.csv`;
  a.click();
  URL.revokeObjectURL(url);

  cerrarExportMenu();
}

function cerrarExportMenu() {
  const wrap = document.getElementById('exportWrap');
  if (wrap) {
    wrap.classList.remove('open');
    wrap.querySelector('#btnExportar')?.setAttribute('aria-expanded', 'false');
  }
}

// ── Event Listeners ───────────────────────────────────────────
function setupListeners() {
  // Logout
  document.getElementById('btnLogout')?.addEventListener('click', () => {
    if (unsubscribeSnapshot) unsubscribeSnapshot();
    auth.signOut().then(() => window.location.href = 'index.html');
  });

  // Filtros
  ['searchInput','filtroEstado','filtroFechaDesde','filtroFechaHasta'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', refrescar);
    document.getElementById(id)?.addEventListener('change', refrescar);
  });
  document.getElementById('btnLimpiarFiltros')?.addEventListener('click', limpiarFiltros);

  // Exportar: toggle dropdown
  const btnExportar = document.getElementById('btnExportar');
  const exportWrap  = document.getElementById('exportWrap');
  btnExportar?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = exportWrap.classList.toggle('open');
    btnExportar.setAttribute('aria-expanded', isOpen);
  });
  // Cerrar dropdown al hacer click fuera
  document.addEventListener('click', (e) => {
    if (exportWrap && !exportWrap.contains(e.target)) {
      cerrarExportMenu();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cerrarExportMenu();
  });

  // Modal Calendario
  document.getElementById('btnAbrirCalendario')?.addEventListener('click', () => {
    document.getElementById('calModal').classList.add('open');
    setTimeout(() => calendarInstance?.updateSize(), 50);
  });
  document.getElementById('btnCerrarCalendario')?.addEventListener('click', () => {
    document.getElementById('calModal').classList.remove('open');
  });
  // Cerrar con Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') document.getElementById('calModal')?.classList.remove('open');
  });

  
  // Theme Toggle
  const btnToggleTheme = document.getElementById('btnToggleTheme');
  const themeToggleText = document.getElementById('themeToggleText');
  
  function updateThemeIcon() {
    const isDark = document.documentElement.classList.contains('dark');
    if (btnToggleTheme) {
      btnToggleTheme.innerHTML = isDark 
        ? '<i class="fa-solid fa-sun"></i> <span id="themeToggleText">Modo Claro</span>'
        : '<i class="fa-solid fa-moon"></i> <span id="themeToggleText">Modo Oscuro</span>';
    }
  }
  
  // Set initial text
  updateThemeIcon();

  btnToggleTheme?.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    localStorage.setItem('dashboardTheme', isDark ? 'dark' : 'light');
    updateThemeIcon();
    refrescar(); // repintar gráficas y calendario con los colores nuevos
  });

  // Sidebar móvil
  const mobileBtn = document.getElementById('mobileBtn');
  const sidebar   = document.getElementById('sidebar');
  const overlay   = document.getElementById('sidebarOverlay');
  mobileBtn?.addEventListener('click', () => {
    sidebar?.classList.toggle('open');
    overlay?.classList.toggle('hidden');
    mobileBtn?.classList.add('hidden');
  });
  overlay?.addEventListener('click', () => {
    sidebar?.classList.remove('open');
    overlay?.classList.add('hidden');
    mobileBtn?.classList.remove('hidden');
  });
}

// =============================================================
// EXPORTAR FUNCIONES GLOBALES PARA HTML (onclick)
// =============================================================
window.cambiarEstado = cambiarEstado;
window.limpiarFiltros = limpiarFiltros;
window.exportarExcel = exportarExcel;
window.exportarCSV = exportarCSV;
window.showSection = showSection;
window.showAnalyticsSection = showAnalyticsSection;
window.refrescar = refrescar;
window.cerrarExportMenu = cerrarExportMenu;
