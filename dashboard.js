// dashboard.js — Panel Administrativo BI · Terraza Alborada
// CIA: Confidencialidad (auth guard) · Integridad (update) · Disponibilidad (onSnapshot)

const firebaseConfig = {
  apiKey: "AIzaSyCBePYk9UbTtAvzHOtgzeaU6D1xLJK15yE",
  authDomain: "terrazaalborada-dd06c.firebaseapp.com",
  projectId: "terrazaalborada-dd06c",
  storageBucket: "terrazaalborada-dd06c.firebasestorage.app",
  messagingSenderId: "419306719780",
  appId: "1:419306719780:web:10a936d4c1b7cd8fe626b1"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.firestore();

// ── Estado global ──────────────────────────────────────────────
let reservacionesCache = [];
let calendarInstance   = null;
let chartDonaInstance  = null;
let chartBarrasInstance = null;
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
}

// ── Módulo 4: Gráficas Chart.js ───────────────────────────────
function actualizarGraficas(arr) {
  // Dona — tipo evento
  const freqEvento = {};
  arr.forEach(r => { if (r.tipoEvento) freqEvento[r.tipoEvento] = (freqEvento[r.tipoEvento]||0)+1; });
  if (chartDonaInstance) chartDonaInstance.destroy();
  const ctxD = document.getElementById('chartTipoEvento')?.getContext('2d');
  if (ctxD && Object.keys(freqEvento).length) {
    chartDonaInstance = new Chart(ctxD, {
      type: 'doughnut',
      data: { labels: Object.keys(freqEvento), datasets: [{ data: Object.values(freqEvento), backgroundColor: PALETTE, borderWidth: 0, hoverOffset: 8 }] },
      options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { color: 'rgba(255,255,255,.7)', font: { family: "'Source Sans 3'", weight: 600 }, padding: 16, usePointStyle: true } } }, cutout: '60%' }
    });
  }
  // Barras — ingresos por salón
  const ingSalon = {};
  arr.forEach(r => { if (r.salonSeleccionado) ingSalon[r.salonSeleccionado] = (ingSalon[r.salonSeleccionado]||0) + (r.montoTotal||0); });
  if (chartBarrasInstance) chartBarrasInstance.destroy();
  const ctxB = document.getElementById('chartIngresosSalon')?.getContext('2d');
  if (ctxB && Object.keys(ingSalon).length) {
    chartBarrasInstance = new Chart(ctxB, {
      type: 'bar',
      data: { labels: Object.keys(ingSalon), datasets: [{ label: 'Ingresos', data: Object.values(ingSalon), backgroundColor: ['#C9A227','#1F5A3D','#3b82f6'], borderRadius: 8, barThickness: 48 }] },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: {
        x: { ticks: { color: 'rgba(255,255,255,.5)', font: { weight: 600 } }, grid: { display: false } },
        y: { ticks: { color: 'rgba(255,255,255,.35)', callback: v => '$'+v.toLocaleString('es-MX') }, grid: { color: 'rgba(255,255,255,.06)' } }
      }}
    });
  }
}

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
        background: '#0e2236',
        color: '#fff',
        width: '480px',
        showCloseButton: true,
        showConfirmButton: false,
        html: `
          <div style="text-align:left;padding:.5rem .25rem">
            <p style="font-family:'Playfair Display',serif;font-size:1.4rem;font-weight:700;color:#fff;margin-bottom:.25rem">${r.clienteEmpresa || 'Sin nombre'}</p>
            <p style="font-size:.8rem;color:rgba(255,255,255,.45);margin-bottom:1.25rem">${r.usuario || ''}</p>
            <span style="display:inline-block;padding:.2rem .75rem;border-radius:9999px;font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;background:${estadoColor}22;color:${estadoColor};border:1px solid ${estadoColor}55;margin-bottom:1.25rem">${r.estado || 'Pendiente'}</span>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:.85rem 1.5rem">
              <div>
                <p style="font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#C9A227">Salón</p>
                <p style="font-size:.9rem;font-weight:600;color:#fff">${r.salonSeleccionado || '—'}</p>
              </div>
              <div>
                <p style="font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#C9A227">Fecha del Evento</p>
                <p style="font-size:.9rem;font-weight:600;color:#fff">${r.fechaEvento || '—'}</p>
              </div>
              <div>
                <p style="font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#C9A227">Tipo de Evento</p>
                <p style="font-size:.9rem;font-weight:600;color:#fff">${r.tipoEvento || '—'}</p>
              </div>
              <div>
                <p style="font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#C9A227">Paquete</p>
                <p style="font-size:.9rem;font-weight:600;color:#fff">${r.tipoPaquete || '—'}</p>
              </div>
              <div>
                <p style="font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#C9A227">Invitados</p>
                <p style="font-size:.9rem;font-weight:600;color:#fff">${inv} <span style="color:rgba(255,255,255,.4)">/ ${cap}</span></p>
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
    title: `${r.clienteEmpresa || 'Sin nombre'} · ${r.salonSeleccionado || ''}`,
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
  // Solo redibuja las gráficas si la sección analítica es visible.
  // Chart.js lanza una excepción con canvas de display:none (dimensiones 0)
  // que cortaría la ejecución antes de llegar a renderizarLista.
  const analyticsVisible = !document.getElementById('sec-analytics')?.classList.contains('hidden');
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
        <p style="font-family:'Playfair Display',serif;font-size:1.2rem;font-weight:700;color:#fff">No se encontraron reservaciones</p>
        <p style="font-size:.875rem;color:rgba(255,255,255,.45)">Prueba cambiando las fechas o el término de búsqueda.</p>
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
            <span style="font-family:'Playfair Display',serif;font-size:1.15rem;font-weight:700;color:#fff">${r.clienteEmpresa || 'Sin nombre'}</span>
            <span class="badge badge-${estado}">${estado}</span>
          </div>
          <p style="font-size:.8rem;color:rgba(255,255,255,.45);margin-bottom:.75rem">
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
          <span style="font-size:.7rem;color:rgba(255,255,255,.3)">Creado: ${creadoEn}</span>
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
    background: '#102742',
    color: '#fff',
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
    Swal.fire({ title: 'Error', text: e.message, icon: 'error', background: '#102742', color: '#fff' });
    refrescar();
  }
}

// ── Módulo 9: Navegación entre secciones ──────────────────────
function showSection(id) {
  ['sec-reservaciones','sec-analytics'].forEach(s => {
    document.getElementById(s)?.classList.toggle('hidden', s !== id);
  });
  document.querySelectorAll('.nav-link[id^="nav-"]').forEach(l => l.classList.remove('active'));
  const navId = 'nav-' + id.replace('sec-','');
  document.getElementById(navId)?.classList.add('active');
  // Forzar resize de charts al mostrar analytics
  if (id === 'sec-analytics') {
    setTimeout(() => { chartDonaInstance?.resize(); chartBarrasInstance?.resize(); }, 100);
  }
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

  // Sidebar móvil
  const mobileBtn = document.getElementById('mobileBtn');
  const sidebar   = document.getElementById('sidebar');
  const overlay   = document.getElementById('sidebarOverlay');
  mobileBtn?.addEventListener('click', () => {
    sidebar?.classList.toggle('open');
    overlay?.classList.toggle('hidden');
  });
  overlay?.addEventListener('click', () => {
    sidebar?.classList.remove('open');
    overlay?.classList.add('hidden');
  });
}
