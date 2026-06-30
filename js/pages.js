/**
 * PÁGINAS / VISTAS DEL SISTEMA
 * Cada función retorna HTML y puede llamar APIs
 */

import * as API from '../services/api.js';
// API expone: getPedidos, createPedido, updateEstadoPedido, getMesas,
// cambiarEstadoMesa, getTurnosActivos, tomarTurno, finalizarTurno, getSyncData, ...
import { Toast, Loader, Modal, badgeEstadoPedido, badgeStock, crearTabla, kpiCard, fmt, emptyState } from '../components/ui.js';
import AuthService from '../services/auth.js';
import { ejecutarAccionPedido, ejecutarAccionMesa, getMesasConEstadoPedido, getPedidosListosParaMesero } from '../services/api.js';
import { PEDIDO_ESTADOS, MESA_ESTADOS, labelEstado } from '../js/businessLogic.js';
import { NotifService } from '../js/notificationService.js';

function badgeEstadoPedidoV2(estado) {
  const config = {
    pendiente:          { color: "warning",   icon: "bi-clock-fill",        texto: "Pendiente"           },
    en_preparacion:     { color: "info",      icon: "bi-fire",              texto: "En Preparación"      },
    listo:              { color: "success",   icon: "bi-check-circle-fill", texto: "Listo ↑ Retirar"     },
    retirado:           { color: "primary",   icon: "bi-bag-fill",          texto: "Retirado"            },
    entregado:          { color: "secondary", icon: "bi-bag-check-fill",    texto: "Entregado"           },
    cuenta_solicitada:  { color: "dark",      icon: "bi-credit-card-fill",  texto: "Cuenta Solicitada"   },
    pagado:             { color: "success",   icon: "bi-cash-coin",         texto: "Pagado ✓"            },
    cancelado:          { color: "danger",    icon: "bi-x-circle-fill",     texto: "Cancelado"           },
  };
  const c = config[estado] || { color: "light", icon: "bi-question", texto: estado };
  return `<span class="badge bg-${c.color} d-inline-flex align-items-center gap-1 px-2 py-1">
    <i class="bi ${c.icon}"></i>${c.texto}
  </span>`;
}

function badgeEstadoMesa(estado) {
  const config = {
    disponible:     { color: "success", icon: "bi-check-circle",      texto: "Disponible"      },
    reservada:      { color: "warning", icon: "bi-bookmark-fill",     texto: "Reservada"       },
    ocupada:        { color: "danger",  icon: "bi-people-fill",       texto: "Ocupada"         },
    con_pedido:     { color: "info",    icon: "bi-receipt-cutoff",    texto: "Con Pedido"      },
    pendiente_pago: { color: "dark",    icon: "bi-credit-card",       texto: "Pendiente Pago"  },
    liberable:      { color: "primary", icon: "bi-unlock-fill",       texto: "Lista p/ Liberar"},
  };
  const c = config[estado] || { color: "secondary", icon: "bi-question", texto: estado };
  return `<span class="badge bg-${c.color} d-inline-flex align-items-center gap-1 px-2 py-1">
    <i class="bi ${c.icon}"></i>${c.texto}
  </span>`;
}

// ══════════════════════════════════════════════════════
//  ROUTER DE PÁGINAS
// ══════════════════════════════════════════════════════
export async function renderPage(pageId, contenedor) {
  const usuario = AuthService.getUsuario();
  Loader.show(contenedor);
  try {
    switch (pageId) {
      case "dashboard": await renderDashboard(contenedor, usuario); break;
      case "pedidos": await renderPedidos(contenedor, usuario); break;
      case "nuevo_pedido": await renderNuevoPedido(contenedor, usuario); break;
      case "platillos": await renderPlatillos(contenedor, usuario); break;
      case "platillos_ranking": await renderPlatillosRanking(contenedor); break;
      case "stock": await renderStock(contenedor, usuario); break;
      case "ingredientes": await renderIngredientes(contenedor); break;
      case "horarios": case "horarios_meseros": case "horarios_cocineros": case "horarios_porteros":
        await renderHorarios(contenedor, pageId, usuario); break;
      case "turno": await renderTurno(contenedor, usuario); break;
      case "horario": await renderMiHorario(contenedor, usuario); break;
      case "mesas": await renderMesas(contenedor, usuario); break;
      case "reservaciones": await renderReservaciones(contenedor); break;
      case "reservaciones_platillos": await renderReservacionesPlatillos(contenedor); break;
      case "finanzas": await renderFinanzas(contenedor); break;
      case "empleados": await renderEmpleados(contenedor); break;
      case "usuarios": await renderUsuarios(contenedor); break;
      case "solicitudes": case "solicitudes_personal": await renderSolicitudesPersonal(contenedor, usuario); break;
      case "solicitudes_ing": await renderSolicitudesIngredientes(contenedor, usuario); break;
      case "ingredientes_sol": await renderIngredientesSolicitudes(contenedor); break;
      case "equipos_cocina": await renderEquiposCocina(contenedor); break;
      default: contenedor ? document.getElementById(contenedor).innerHTML = emptyState("Página no encontrada", "bi-question-circle") : null;
    }
  } catch (err) {
    console.error(err);
    const el = document.getElementById(contenedor);
    if (el) el.innerHTML = `<div class="alert alert-danger m-4"><i class="bi bi-exclamation-triangle-fill me-2"></i>Error al cargar: ${err.message}</div>`;
  }
}

// ══════════════════════════════════════════════════════
//  DASHBOARD - Por rol
// ══════════════════════════════════════════════════════
async function renderDashboard(cid, usuario) {
  const el = document.getElementById(cid);
  const [pedidosRes, stockRes, metricasRes] = await Promise.all([
    API.getPedidos(), API.getStock({ bajo_minimo: true }), API.getMetricas()
  ]);
  const pedidos = pedidosRes.data;
  const stockBajo = stockRes.data;
  const metricas = metricasRes.data;

  const pendientes = pedidos.filter(p => p.estado === "pendiente").length;
  const enPrep = pedidos.filter(p => p.estado === "en_preparacion").length;
  const listos = pedidos.filter(p => p.estado === "listo").length;

  // KPI cards según rol
  let kpis = "";
  if (["administrador", "dueno"].includes(usuario.rol)) {
    const finRes = await API.getFinanzas("dia");
    const fin = finRes.data;
    const total_empleados = Object.values(metricas.empleados_por_rol).reduce((a, b) => a + b, 0);
    kpis = `
      <div class="col-6 col-lg-3">${kpiCard({ titulo: "Ingresos Hoy", valor: fmt.moneda(fin.total_ganancias), icono: "bi-cash-coin", color: "success", subtitulo: `Gasto: ${fmt.moneda(fin.total_gastos)}` })}</div>
      <div class="col-6 col-lg-3">${kpiCard({ titulo: "Pedidos Activos", valor: pendientes + enPrep, icono: "bi-receipt-cutoff", color: "warning", subtitulo: `${listos} listos para entregar` })}</div>
      <div class="col-6 col-lg-3">${kpiCard({ titulo: "Empleados", valor: total_empleados, icono: "bi-people-fill", color: "primary", subtitulo: "Activos en sistema" })}</div>
      <div class="col-6 col-lg-3">${kpiCard({ titulo: "Stock Bajo", valor: stockBajo.length, icono: "bi-exclamation-triangle-fill", color: stockBajo.length > 0 ? "danger" : "success", subtitulo: stockBajo.length > 0 ? "Requiere atención" : "Todo en orden" })}</div>`;
  } else if (usuario.rol === "mesero") {
    const misPedidos = pedidos.filter(p => p.mesero_id === usuario.id);
    kpis = `
      <div class="col-6 col-md-3">${kpiCard({ titulo: "Mis Pedidos Hoy", valor: misPedidos.length, icono: "bi-receipt-cutoff", color: "primary" })}</div>
      <div class="col-6 col-md-3">${kpiCard({ titulo: "Pendientes", valor: misPedidos.filter(p=>p.estado==="pendiente").length, icono: "bi-clock-fill", color: "warning" })}</div>
      <div class="col-6 col-md-3">${kpiCard({ titulo: "En Preparación", valor: misPedidos.filter(p=>p.estado==="en_preparacion").length, icono: "bi-fire", color: "info" })}</div>
      <div class="col-6 col-md-3">${kpiCard({ titulo: "Listos p/ Entregar", valor: misPedidos.filter(p=>p.estado==="listo").length, icono: "bi-check-circle-fill", color: "success" })}</div>`;
  } else if (usuario.rol === "cocinero") {
    kpis = `
      <div class="col-6 col-md-3">${kpiCard({ titulo: "Pedidos Pendientes", valor: pendientes, icono: "bi-clock-fill", color: "warning" })}</div>
      <div class="col-6 col-md-3">${kpiCard({ titulo: "En Preparación", valor: enPrep, icono: "bi-fire", color: "info" })}</div>
      <div class="col-6 col-md-3">${kpiCard({ titulo: "Completados Hoy", valor: listos, icono: "bi-check-circle-fill", color: "success" })}</div>
      <div class="col-6 col-md-3">${kpiCard({ titulo: "Ingredientes Bajos", valor: stockBajo.length, icono: "bi-exclamation-triangle", color: stockBajo.length > 0 ? "danger" : "success" })}</div>`;
  } else {
    kpis = `
      <div class="col-6 col-md-4">${kpiCard({ titulo: "Pedidos Activos", valor: pendientes + enPrep, icono: "bi-receipt-cutoff", color: "warning" })}</div>
      <div class="col-6 col-md-4">${kpiCard({ titulo: "Listos", valor: listos, icono: "bi-check-circle-fill", color: "success" })}</div>
      <div class="col-6 col-md-4">${kpiCard({ titulo: "Alerta Stock", valor: stockBajo.length, icono: "bi-exclamation-triangle", color: "danger" })}</div>`;
  }

  // Cola de pedidos reciente
  const pedidosRecientes = pedidos.filter(p => ["pendiente", "en_preparacion", "listo"].includes(p.estado)).slice(0, 5);
  const colaPedidos = pedidosRecientes.length > 0 ? pedidosRecientes.map(p => `
    <div class="d-flex align-items-center gap-3 py-2 border-bottom">
      <div class="fw-bold text-primary" style="min-width:60px;">#${p.id}</div>
      <div class="flex-grow-1">
        <div class="fw-semibold">Mesa ${p.mesa}</div>
        <div class="text-muted small">${p.items.length} platillo(s) · ${fmt.moneda(p.total)}</div>
      </div>
      ${badgeEstadoPedido(p.estado)}
    </div>`).join("") : emptyState("No hay pedidos activos");

  // Stock bajo
  const stockAlerta = stockBajo.length > 0 ? stockBajo.slice(0, 5).map(i => `
    <div class="d-flex align-items-center gap-3 py-2 border-bottom">
      <div class="flex-grow-1">
        <div class="fw-semibold">${i.nombre}</div>
        <div class="text-muted small">${i.categoria}</div>
      </div>
      ${badgeStock(i.stock, i.stock_minimo)}
    </div>`).join("") : `<div class="text-center py-3 text-success"><i class="bi bi-check-circle-fill fs-2 d-block mb-2"></i>Todo el stock en orden</div>`;

  el.innerHTML = `
    <div class="p-4">
      <div class="mb-4">
        <h4 class="fw-bold mb-1">¡Bienvenido, ${usuario.nombre.split(" ")[0]}! 👋</h4>
        <p class="text-muted mb-0">${new Date().toLocaleDateString("es-MX", { weekday:"long", year:"numeric", month:"long", day:"numeric" })}</p>
      </div>
      <div class="row g-3 mb-4">${kpis}</div>
      <div class="row g-4">
        <div class="col-12 col-lg-6">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-transparent border-0 d-flex align-items-center justify-content-between pt-3">
              <h6 class="fw-bold mb-0"><i class="bi bi-receipt-cutoff me-2 text-primary"></i>Cola de Pedidos</h6>
              <button class="btn btn-sm btn-outline-primary" onclick="App.navigate('pedidos')">Ver todos</button>
            </div>
            <div class="card-body">${colaPedidos}</div>
          </div>
        </div>
        <div class="col-12 col-lg-6">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-transparent border-0 d-flex align-items-center justify-content-between pt-3">
              <h6 class="fw-bold mb-0"><i class="bi bi-exclamation-triangle me-2 text-warning"></i>Alertas de Stock</h6>
              <button class="btn btn-sm btn-outline-warning" onclick="App.navigate('stock')">Ver stock</button>
            </div>
            <div class="card-body">${stockAlerta}</div>
          </div>
        </div>
      </div>
    </div>`;
}

// ══════════════════════════════════════════════════════
//  PEDIDOS
// ══════════════════════════════════════════════════════
async function renderPedidos(cid, usuario) {
  const el = document.getElementById(cid);
  const filtros = usuario.rol === "mesero" ? { mesero_id: usuario.id } : {};
  const res = await API.getPedidos(filtros);
  const pedidos = res.data;

  const esCocinero    = ["cocinero", "jefe_cocina"].includes(usuario.rol);
  const esMesero      = usuario.rol === "mesero";
  const esAdmin       = ["administrador", "jefe_meseros"].includes(usuario.rol);

  const tablaHTML = crearTabla({
    columnas: [
      { campo: "id",     titulo: "#",        render: v => `<span class="fw-bold text-primary">#${v}</span>` },
      { campo: "mesa",   titulo: "Mesa",      render: v => `<span class="badge bg-secondary">Mesa ${v}</span>` },
      { campo: "items",  titulo: "Platillos", render: v => `<small>${v.map(i => `${i.cantidad}× ${i.platillo_emoji} ${i.platillo_nombre}`).join(", ")}</small>` },
      { campo: "total",  titulo: "Total",     render: v => fmt.moneda(v) },
      { campo: "estado", titulo: "Estado",    render: v => badgeEstadoPedidoV2(v) },
      { campo: "fecha",  titulo: "Hora",      render: v => fmt.hora(v) },
    ],
    datos: pedidos,
    acciones: (p) => {
      let btns = `<button class="btn btn-xs btn-outline-info me-1" onclick="Pages.verDetallePedido(${p.id})" title="Ver detalle">
        <i class="bi bi-eye"></i>
      </button>`;

      // ── COCINERO: Pendiente → En Preparación ──
      if (esCocinero && p.estado === PEDIDO_ESTADOS.PENDIENTE)
        btns += `<button class="btn btn-xs btn-outline-warning me-1" onclick="Pages.cambiarEstadoPedido(${p.id},'tomar_pedido')">
          <i class="bi bi-fire"></i> Preparar
        </button>`;

      // ── COCINERO: En Preparación → Listo ──
      if (esCocinero && p.estado === PEDIDO_ESTADOS.EN_PREPARACION)
        btns += `<button class="btn btn-xs btn-success me-1" onclick="Pages.cambiarEstadoPedido(${p.id},'marcar_listo')">
          <i class="bi bi-check-circle"></i> Listo
        </button>`;

      // ── MESERO: Listo → Retirado ──
      if (esMesero && p.estado === PEDIDO_ESTADOS.LISTO)
        btns += `<button class="btn btn-xs btn-warning me-1" onclick="Pages.cambiarEstadoPedido(${p.id},'retirar_pedido')">
          <i class="bi bi-bag"></i> Retirar
        </button>`;

      // ── MESERO: Retirado → Entregado ──
      if (esMesero && p.estado === PEDIDO_ESTADOS.RETIRADO)
        btns += `<button class="btn btn-xs btn-outline-secondary me-1" onclick="Pages.cambiarEstadoPedido(${p.id},'entregar_pedido')">
          <i class="bi bi-bag-check"></i> Entregar
        </button>`;

      // ── MESERO: Entregado → Cuenta Solicitada ──
      if (esMesero && p.estado === PEDIDO_ESTADOS.ENTREGADO)
        btns += `<button class="btn btn-xs btn-dark me-1" onclick="Pages.cambiarEstadoPedido(${p.id},'solicitar_cuenta')">
          <i class="bi bi-credit-card"></i> Pedir Cuenta
        </button>`;

      // ── MESERO / ADMIN: Cuenta Solicitada → Pagado ──
      if ((esMesero || esAdmin) && p.estado === PEDIDO_ESTADOS.CUENTA_SOLICITADA)
        btns += `<button class="btn btn-xs btn-success me-1" onclick="Pages.cambiarEstadoPedido(${p.id},'marcar_pagado')">
          <i class="bi bi-cash-coin"></i> Marcar Pagado
        </button>`;

      // ── CANCELAR — disponible en varios estados para mesero/admin ──
      const cancelables = [
        PEDIDO_ESTADOS.PENDIENTE,
        PEDIDO_ESTADOS.EN_PREPARACION,
        PEDIDO_ESTADOS.LISTO,
        PEDIDO_ESTADOS.RETIRADO,
        PEDIDO_ESTADOS.ENTREGADO,
        PEDIDO_ESTADOS.CUENTA_SOLICITADA,
      ];
      if ((esMesero || esAdmin) && cancelables.includes(p.estado))
        btns += `<button class="btn btn-xs btn-outline-danger" onclick="Pages.cancelarPedido(${p.id})">
          <i class="bi bi-x"></i>
        </button>`;

      return btns;
    },
    vacio: "No hay pedidos registrados",
  });

  const btnNuevo = esMesero
    ? `<button class="btn btn-primary" onclick="App.navigate('nuevo_pedido')">
        <i class="bi bi-plus-circle me-2"></i>Nuevo Pedido
       </button>`
    : "";

  // ── Alerta de pedidos listos para mesero ──
  let alertaListos = "";
  if (esMesero) {
    const listosRes = await getPedidosListosParaMesero(usuario.id).catch(() => ({ data: [] }));
    const listos = listosRes.data || [];
    if (listos.length > 0) {
      alertaListos = `
        <div class="alert alert-success d-flex align-items-center gap-3 mb-4 shadow-sm" role="alert" style="border-radius:12px;">
          <i class="bi bi-bell-fill fs-3 flex-shrink-0" style="animation:pulse-anim 1s infinite;"></i>
          <div>
            <strong>¡${listos.length} pedido(s) listo(s) para retirar!</strong>
            <div class="small">Mesa(s): ${listos.map(p => `<span class="badge bg-success">Mesa ${p.mesa}</span>`).join(" ")}</div>
          </div>
        </div>`;
    }
  }

  el.innerHTML = `
    <div class="p-4">
      <div class="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 class="fw-bold mb-1"><i class="bi bi-receipt-cutoff me-2 text-primary"></i>Pedidos</h4>
          <p class="text-muted mb-0">${pedidos.length} pedido(s) encontrado(s)</p>
        </div>
        ${btnNuevo}
      </div>
      ${alertaListos}
      <!-- Filtros rápidos -->
      <div class="d-flex gap-2 mb-3 flex-wrap">
        ${Object.values(PEDIDO_ESTADOS).map(e => `
          <button class="btn btn-sm btn-outline-secondary filtro-estado" data-estado="${e}"
                  onclick="Pages.filtrarPedidos('${e}','${cid}','${usuario.rol}',${usuario.id})">
            ${badgeEstadoPedidoV2(e)} (${pedidos.filter(p => p.estado === e).length})
          </button>`).join("")}
        <button class="btn btn-sm btn-outline-primary"
                onclick="Pages.filtrarPedidos('todos','${cid}','${usuario.rol}',${usuario.id})">Todos</button>
      </div>
      <div class="card border-0 shadow-sm">
        <div class="card-body p-0" id="tabla-pedidos">${tablaHTML}</div>
      </div>
    </div>`;
}

// ══════════════════════════════════════════════════════
//  NUEVO PEDIDO (Mesero) — Flujo: Mesa → Platillos
// ══════════════════════════════════════════════════════
async function renderNuevoPedido(cid, usuario) {
  const el = document.getElementById(cid);
  const [platillosRes, mesasRes, pedidosRes] = await Promise.all([
    API.getPlatillos({ activo: true }),
    API.getMesas(),
    API.getPedidos({ mesero_id: usuario.id })
  ]);
  const platillos  = platillosRes.data;
  const mesas      = mesasRes.data;
  const misPedidos = pedidosRes.data;

  // ── Colores de estado ──
  const C = {
    disponible: { bg:"#22c55e", txt:"#fff", glow:"rgba(34,197,94,0.4)",  badge:"#dcfce7", badgeTxt:"#166534" },
    ocupada:    { bg:"#ef4444", txt:"#fff", glow:"rgba(239,68,68,0.4)",   badge:"#fee2e2", badgeTxt:"#991b1b" },
    reservada:  { bg:"#f59e0b", txt:"#1e293b", glow:"rgba(245,158,11,0.4)", badge:"#fef9c3", badgeTxt:"#713f12" }
  };

  // ── Helpers SVG ──
  const silla = (x,y,a) => `<rect x="${x-7}" y="${y-4}" width="14" height="8" rx="3"
    fill="#e2e8f0" stroke="#cbd5e1" stroke-width="0.8" transform="rotate(${a},${x},${y})"/>`;

  // ── Dibuja mesa rectangular ──
  const mesaRect = (m, cx, cy, w, h, sillas) => {
    const c = C[m.estado] || C.disponible;
    const esDisponible = m.estado === "disponible";
    const pedidoActivo = misPedidos.find(p => p.mesa === m.numero && ["pendiente","en_preparacion","listo"].includes(p.estado));

    const pulso = m.estado === "ocupada" ? `
      <ellipse cx="${cx}" cy="${cy}" rx="${w/2+10}" ry="${h/2+10}" fill="${c.glow}">
        <animate attributeName="rx" values="${w/2+6};${w/2+18};${w/2+6}" dur="2.4s" repeatCount="indefinite"/>
        <animate attributeName="ry" values="${h/2+6};${h/2+18};${h/2+6}" dur="2.4s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.5;0;0.5" dur="2.4s" repeatCount="indefinite"/>
      </ellipse>` : m.estado === "reservada" ? `
      <ellipse cx="${cx}" cy="${cy}" rx="${w/2+8}" ry="${h/2+8}" fill="${c.glow}">
        <animate attributeName="opacity" values="0.4;0;0.4" dur="1.8s" repeatCount="indefinite"/>
      </ellipse>` : "";

    // Si el mesero tiene pedido activo en esta mesa → borde especial verde pulsante
    const indicadorMiPedido = pedidoActivo ? `
      <rect x="${cx-w/2-4}" y="${cy-h/2-4}" width="${w+8}" height="${h+8}" rx="11"
            fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-dasharray="5,3">
        <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite"/>
      </rect>` : "";

    // Icono de estado encima de la mesa para el mesero
    const iconoEstado = pedidoActivo ? `
      <circle cx="${cx+w/2-2}" cy="${cy-h/2-2}" r="9" fill="${pedidoActivo.estado==='listo'?'#22c55e':'#3b82f6'}" stroke="#fff" stroke-width="1.5"/>
      <text x="${cx+w/2-2}" y="${cy-h/2+2.5}" text-anchor="middle" fill="#fff" font-size="10" font-family="sans-serif">
        ${pedidoActivo.estado==='listo'?'✓':'…'}
      </text>` : "";

    return `
      <g class="mesa-grupo" style="cursor:${esDisponible ? 'pointer' : 'default'};"
         onclick="${esDisponible ? `Pages.seleccionarMesaPedido(${m.id},${m.numero})` : pedidoActivo ? `Pages.verMesaDetalle(${m.id})` : ''}"
         data-mesa="${m.id}" data-estado="${m.estado}">
        <title>${esDisponible ? `✅ Mesa ${m.numero} — Toca para tomar pedido` : `Mesa ${m.numero} — ${m.estado}${pedidoActivo?' · Tu pedido: '+pedidoActivo.estado:''}`}</title>
        ${pulso}
        ${sillas}
        <!-- Sombra -->
        <rect x="${cx-w/2+3}" y="${cy-h/2+4}" width="${w}" height="${h}" rx="9" fill="rgba(0,0,0,0.12)"/>
        <!-- Mesa -->
        <rect x="${cx-w/2}" y="${cy-h/2}" width="${w}" height="${h}" rx="9"
              fill="${c.bg}" stroke="${esDisponible?'rgba(255,255,255,0.7)':'rgba(255,255,255,0.4)'}"
              stroke-width="${esDisponible?'2':'1.5'}"
              ${!esDisponible&&!pedidoActivo?'opacity="0.65"':''}/>
        <!-- Mantel decorativo -->
        <rect x="${cx-w/2+5}" y="${cy-h/2+4}" width="${w-10}" height="${h-8}" rx="6"
              fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="0.8"/>
        <!-- Número -->
        <text x="${cx}" y="${cy-5}" text-anchor="middle"
              fill="${c.txt}" font-weight="800" font-size="16" font-family="system-ui,sans-serif">M${m.numero}</text>
        <!-- Capacidad -->
        <text x="${cx}" y="${cy+13}" text-anchor="middle"
              fill="${c.txt}" font-size="12" font-family="system-ui,sans-serif" opacity="0.88">${m.capacidad} pax</text>
        ${indicadorMiPedido}
        ${iconoEstado}
      </g>`;
  };

  // ── Mesa circular para terraza ──
  const mesaCirculo = (m, cx, cy, r, sillas) => {
    const c = C[m.estado] || C.disponible;
    const esDisponible = m.estado === "disponible";
    const pedidoActivo = misPedidos.find(p => p.mesa === m.numero && ["pendiente","en_preparacion","listo"].includes(p.estado));

    const pulso = m.estado === "ocupada" ? `
      <circle cx="${cx}" cy="${cy}" r="${r+10}" fill="${c.glow}">
        <animate attributeName="r" values="${r+5};${r+18};${r+5}" dur="2.4s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.5;0;0.5" dur="2.4s" repeatCount="indefinite"/>
      </circle>` : "";

    const indicadorMiPedido = pedidoActivo ? `
      <circle cx="${cx}" cy="${cy}" r="${r+6}" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-dasharray="5,3">
        <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite"/>
      </circle>` : "";

    return `
      <g class="mesa-grupo" style="cursor:${esDisponible?'pointer':'default'};"
         onclick="${esDisponible?`Pages.seleccionarMesaPedido(${m.id},${m.numero})`:pedidoActivo?`Pages.verMesaDetalle(${m.id})`:''}"
         data-mesa="${m.id}" data-estado="${m.estado}">
        <title>${esDisponible?`✅ Mesa ${m.numero} — Toca para tomar pedido`:`Mesa ${m.numero} — ${m.estado}`}</title>
        ${pulso}
        ${sillas}
        <circle cx="${cx+2}" cy="${cy+3}" r="${r}" fill="rgba(0,0,0,0.12)"/>
        <circle cx="${cx}" cy="${cy}" r="${r}"
                fill="${c.bg}" stroke="${esDisponible?'rgba(255,255,255,0.7)':'rgba(255,255,255,0.4)'}"
                stroke-width="${esDisponible?'2':'1.5'}"
                ${!esDisponible&&!pedidoActivo?'opacity="0.65"':''}/>
        <circle cx="${cx}" cy="${cy}" r="${r-5}"
                fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="0.8"/>
        <text x="${cx}" y="${cy-4}" text-anchor="middle"
              fill="${c.txt}" font-weight="800" font-size="15" font-family="system-ui,sans-serif">M${m.numero}</text>
        <text x="${cx}" y="${cy+9}" text-anchor="middle"
              fill="${c.txt}" font-size="11" font-family="system-ui,sans-serif" opacity="0.88">${m.capacidad}p</text>
        ${indicadorMiPedido}
      </g>`;
  };

  // Layout mesas viewBox 800x560
  // Interior x40-530 | Cocina x562-640 | Terraza x642-762 | Privado y398-530
  const LAYOUT = {
    // Mesa 1 (cx=112, cy=148, w=72, h=46): sillas arriba y=125, abajo y=171, izq x=89, der x=135
    1: () => mesaRect(mesas.find(x=>x.numero===1), 112, 148, 72, 46,
        silla(112,125,0)+silla(112,171,180)+silla(89,148,270)+silla(135,148,90)),
    // Mesa 2 (cx=210, cy=148, w=72, h=46)
    2: () => mesaRect(mesas.find(x=>x.numero===2), 210, 148, 72, 46,
        silla(210,125,0)+silla(210,171,180)+silla(187,148,270)+silla(233,148,90)),
    // Mesa 3 (cx=318, cy=148, w=72, h=46)
    3: () => mesaRect(mesas.find(x=>x.numero===3), 318, 148, 72, 46,
        silla(318,125,0)+silla(318,171,180)+silla(295,148,270)+silla(341,148,90)),
    // Mesa 7 (cx=112, cy=268, w=72, h=46)
    7: () => mesaRect(mesas.find(x=>x.numero===7), 112, 268, 72, 46,
        silla(112,245,0)+silla(112,291,180)+silla(89,268,270)+silla(135,268,90)),
    // Mesa 8 (cx=222, cy=268, w=72, h=46)
    8: () => mesaRect(mesas.find(x=>x.numero===8), 222, 268, 72, 46,
        silla(222,245,0)+silla(222,291,180)+silla(199,268,270)+silla(245,268,90)),
    // Mesa 4 (cx=340, cy=268, w=72, h=46)
    4: () => mesaRect(mesas.find(x=>x.numero===4), 340, 268, 72, 46,
        silla(340,245,0)+silla(340,291,180)+silla(317,268,270)+silla(363,268,90)),
    // Mesa 6 — círculo (cx=702, cy=148, r=30): sillas arriba y=110, abajo y=186
    6: () => mesaCirculo(mesas.find(x=>x.numero===6), 702, 148, 30,
        silla(702,110,0)+silla(702,186,180)),
    // Mesa 9 — círculo (cx=702, cy=268, r=30)
    9: () => mesaCirculo(mesas.find(x=>x.numero===9), 702, 268, 30,
        silla(702,230,0)+silla(702,306,180)),
    // Mesa 5 (cx=240, cy=452, w=110, h=52): sillas izq x=218, der x=262, arr y=429, ab y=475
    5:  () => mesaRect(mesas.find(x=>x.numero===5),  240, 452, 110, 52,
        silla(185,452,270)+silla(295,452,90)+
        silla(213,429,0)+silla(267,429,0)+
        silla(213,475,180)+silla(267,475,180)),
    // Mesa 10 (cx=430, cy=452, w=145, h=52)
    10: () => mesaRect(mesas.find(x=>x.numero===10), 430, 452, 145, 52,
        silla(357,452,270)+silla(503,452,90)+
        silla(385,429,0)+silla(430,429,0)+silla(475,429,0)+
        silla(385,475,180)+silla(430,475,180)+silla(475,475,180)),
  };

  const mesasSVG = mesas.filter(m=>LAYOUT[m.numero]).map(m=>{try{return LAYOUT[m.numero]();}catch(e){return "";}}).join("");

  // Arquitectura viewBox 800x560 - fiel a imagen referencia
  const plano = `
    <defs>
      <pattern id="piso-i2" patternUnits="userSpaceOnUse" width="32" height="32">
        <rect width="32" height="32" fill="#f8fafc"/>
        <rect x="0" y="0" width="16" height="16" fill="#f1f5f9" opacity="0.55"/>
        <rect x="16" y="16" width="16" height="16" fill="#f1f5f9" opacity="0.55"/>
      </pattern>
      <pattern id="piso-t2" patternUnits="userSpaceOnUse" width="24" height="24">
        <rect width="24" height="24" fill="#fefce8"/>
        <path d="M0,24 L24,0" stroke="#fde68a" stroke-width="1" opacity="0.5"/>
      </pattern>
      <pattern id="piso-p2" patternUnits="userSpaceOnUse" width="28" height="28">
        <rect width="28" height="28" fill="#faf5ff"/>
        <circle cx="14" cy="14" r="2" fill="#e9d5ff" opacity="0.8"/>
      </pattern>
    </defs>
    <rect x="30" y="30" width="740" height="510" rx="16" fill="#d1d5db" stroke="#9ca3af" stroke-width="3"/>
    <rect x="40" y="40" width="490" height="355" rx="10" fill="url(#piso-i2)" stroke="#e2e8f0" stroke-width="1"/>
    <!-- Relleno zona entre interior y mostrador (elimina zona gris x530-562) -->
    <rect x="530" y="40" width="32" height="355" fill="#f8fafc"/>
    <rect x="642" y="40" width="120" height="355" rx="10" fill="url(#piso-t2)" stroke="#fde68a" stroke-width="2"/>
    <rect x="40" y="398" width="722" height="132" rx="10" fill="url(#piso-p2)" stroke="#e9d5ff" stroke-width="2"/>
    <text x="58" y="64" font-size="12" fill="#6b7280" font-family="system-ui,sans-serif" font-weight="800" letter-spacing="2">INTERIOR</text>
    <text x="702" y="64" text-anchor="middle" font-size="12" fill="#92400e" font-family="system-ui,sans-serif" font-weight="800" letter-spacing="1">TERRAZA</text>
    <text x="650" y="520" font-size="12" fill="#7c3aed" font-family="system-ui,sans-serif" font-weight="800" letter-spacing="2">SALON PRIVADO</text>
    <!-- Muro interior izq de cocina/mostrador -->
    <line x1="530" y1="40" x2="530" y2="395" stroke="#9ca3af" stroke-width="3"/>

    <!-- MOSTRADOR ENTREGA: x532 y40 w30 h266 -->
    <rect x="532" y="40" width="30" height="266" rx="0" fill="#7dd3fc" stroke="#0ea5e9" stroke-width="2"/>
    <text x="547" y="173" text-anchor="middle" font-size="9" fill="#0c4a6e" font-weight="700"
          transform="rotate(-90,547,173)">MOSTRADOR ENTREGA</text>

    <!-- COCINA: x562 y40 w78 h248 — icono centrado verticalmente en el bloque -->
    <rect x="562" y="40" width="78" height="248" rx="0" fill="#fb923c" stroke="#ea580c" stroke-width="2"/>
    <text x="601" y="148" text-anchor="middle" font-size="22" fill="#fff">🍳</text>
    <text x="601" y="171" text-anchor="middle" font-size="14" fill="#fff" font-family="system-ui,sans-serif" font-weight="800">COCINA</text>

    <!-- Pared cocina/terraza (x:640) — segmentos con 2 puertas -->
    <!-- Segmento sólido arriba: y:40 → y:288 (fin cocina) -->
    <line x1="640" y1="40" x2="640" y2="258" stroke="#9ca3af" stroke-width="3"/>
    <!-- PUERTA 1: cocina ↔ terraza (y:258 → y:298) -->
    <rect x="632" y="258" width="16" height="40" rx="4" fill="#d1fae5" stroke="#34d399" stroke-width="2"/>
    <path d="M640,258 Q658,278 640,298" fill="none" stroke="#34d399" stroke-width="1.5" stroke-dasharray="3,2" opacity="0.7"/>
    <text x="640" y="282" text-anchor="middle" font-size="8" fill="#065f46" font-weight="700">⇌</text>
    <!-- Segmento sólido medio: y:298 → y:345 -->
    <line x1="640" y1="298" x2="640" y2="345" stroke="#9ca3af" stroke-width="3"/>
    <!-- PUERTA 2: interior ↔ terraza (y:345 → y:395) -->
    <rect x="632" y="345" width="16" height="50" rx="4" fill="#bfdbfe" stroke="#3b82f6" stroke-width="2"/>
    <path d="M640,345 Q658,370 640,395" fill="none" stroke="#3b82f6" stroke-width="1.5" stroke-dasharray="3,2" opacity="0.7"/>
    <text x="640" y="373" text-anchor="middle" font-size="8" fill="#1e40af" font-weight="700">⇌</text>
    <line x1="40" y1="396" x2="248" y2="396" stroke="#9ca3af" stroke-width="4"/>
    <line x1="332" y1="396" x2="762" y2="396" stroke="#9ca3af" stroke-width="4"/>
    <rect x="248" y="387" width="84" height="18" rx="5" fill="#ede9fe" stroke="#8b5cf6" stroke-width="2"/>
    <path d="M248,396 Q290,363 332,396" fill="none" stroke="#8b5cf6" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.7"/>
    <text x="290" y="400" text-anchor="middle" font-size="10" fill="#7c3aed" font-weight="700">PUERTA</text>
    <rect x="44" y="44" width="210" height="62" rx="10" fill="#fb923c" stroke="#ea580c" stroke-width="2.5"/>
    <rect x="50" y="50" width="198" height="50" rx="7" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="1.5" stroke-dasharray="5,3"/>
    <text x="149" y="71" text-anchor="middle" font-size="14" fill="#fff" font-family="system-ui,sans-serif" font-weight="800">BARRA</text>
    <text x="149" y="91" text-anchor="middle" font-size="11" fill="rgba(255,255,255,0.9)">Caja Pedidos</text>
    <rect x="44" y="316" width="52" height="52" rx="8" fill="#e0f2fe" stroke="#7dd3fc" stroke-width="2"/>
    <text x="70" y="337" text-anchor="middle" font-size="10" fill="#0369a1" font-weight="700">WC</text>
    <text x="70" y="353" text-anchor="middle" font-size="13" fill="#0369a1">&#9794;</text>
    <text x="70" y="368" text-anchor="middle" font-size="8" fill="#64748b">publico</text>
    <rect x="98" y="316" width="52" height="52" rx="8" fill="#fce7f3" stroke="#f9a8d4" stroke-width="2"/>
    <text x="124" y="337" text-anchor="middle" font-size="10" fill="#9d174d" font-weight="700">WC</text>
    <text x="124" y="353" text-anchor="middle" font-size="13" fill="#c026d3">&#9792;</text>
    <text x="124" y="368" text-anchor="middle" font-size="8" fill="#64748b">publico</text>
    <rect x="44" y="408" width="52" height="52" rx="8" fill="#e0f2fe" stroke="#7dd3fc" stroke-width="1.5"/>
    <text x="70" y="429" text-anchor="middle" font-size="10" fill="#0369a1" font-weight="700">WC</text>
    <text x="70" y="445" text-anchor="middle" font-size="13" fill="#0369a1">&#9794;</text>
    <text x="70" y="458" text-anchor="middle" font-size="8" fill="#64748b">privado</text>
    <rect x="98" y="408" width="52" height="52" rx="8" fill="#fce7f3" stroke="#f9a8d4" stroke-width="1.5"/>
    <text x="124" y="429" text-anchor="middle" font-size="10" fill="#9d174d" font-weight="700">WC</text>
    <text x="124" y="445" text-anchor="middle" font-size="13" fill="#c026d3">&#9792;</text>
    <text x="124" y="458" text-anchor="middle" font-size="8" fill="#64748b">privado</text>
    <rect x="278" y="22" width="104" height="24" rx="6" fill="#dbeafe" stroke="#93c5fd" stroke-width="2"/>
    <path d="M278,44 Q330,16 382,44" fill="none" stroke="#3b82f6" stroke-width="2" stroke-dasharray="4,3" opacity="0.7"/>
    <text x="330" y="39" text-anchor="middle" font-size="12" fill="#1d4ed8" font-weight="800" letter-spacing="1">ENTRADA</text>
  `;

  // ── Categorías para la carta ──
  const categorias = [...new Set(platillos.map(p=>p.categoria))];
  const categoriasHTML =
    `<button class="btn btn-sm btn-primary me-1 mb-1 categoria-btn" data-cat="todos" onclick="Pages.filtrarCategoria('todos')">Todos</button>` +
    categorias.map(c=>`<button class="btn btn-sm btn-outline-secondary categoria-btn me-1 mb-1" data-cat="${c}" onclick="Pages.filtrarCategoria('${c}')">${c}</button>`).join("");

  const gridPlatillos = platillos.map(p=>`
    <div class="col-6 col-md-4 platillo-card" data-cat="${p.categoria}">
      <div class="card h-100 border-0 shadow-sm hover-card"
           onclick="Pages.agregarAlPedido(${p.id},'${p.nombre.replace(/'/g,"\\'")}',${p.precio},'${p.imagen}')">
        <div class="card-body text-center p-2">
          <div style="font-size:1.8rem;">${p.imagen}</div>
          <h6 class="fw-semibold mb-0 mt-1" style="font-size:0.78rem;line-height:1.2;">${p.nombre}</h6>
          <div class="text-primary fw-bold" style="font-size:0.85rem;">${fmt.moneda(p.precio)}</div>
          <div class="text-muted" style="font-size:0.65rem;"><i class="bi bi-clock me-1"></i>${p.tiempo_prep}min</div>
        </div>
      </div>
    </div>`).join("");

  // ── Mis pedidos activos (chips rápidos) ──
  const misPedidosActivos = misPedidos.filter(p=>["pendiente","en_preparacion","listo"].includes(p.estado));
  const estadoColor = { pendiente:"warning", en_preparacion:"info", listo:"success" };
  const estadoEmoji = { pendiente:"⏳", en_preparacion:"🔥", listo:"✅" };
  const pedidosChips = misPedidosActivos.length > 0
    ? misPedidosActivos.map(p=>`
        <div class="d-flex align-items-center gap-2 px-3 py-2 rounded-pill me-2 mb-1 flex-shrink-0"
             style="background:#f1f5f9;cursor:pointer;border:1.5px solid #e2e8f0;"
             onclick="Pages.verMesaDetalle(${p.id})">
          <span class="fw-bold" style="font-size:0.82rem;">M${p.mesa}</span>
          <span class="badge bg-${estadoColor[p.estado]}" style="font-size:0.65rem;">${estadoEmoji[p.estado]} ${p.estado.replace("_"," ")}</span>
          <span class="text-muted" style="font-size:0.75rem;">${fmt.moneda(p.total)}</span>
        </div>`).join("")
    : `<span class="text-muted small">Sin pedidos activos ahora</span>`;

  el.innerHTML = `
    <div class="p-3 p-md-4">

      <!-- ── Header ── -->
      <div class="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-2">
        <div>
          <h4 class="fw-bold mb-0"><i class="bi bi-plus-circle-fill me-2 text-primary"></i>Nuevo Pedido</h4>
          <small class="text-muted">Toca una mesa <span class="text-success fw-semibold">verde</span> para comenzar</small>
        </div>
        <button class="btn btn-sm btn-outline-primary rounded-pill px-3" onclick="App.navigate('nuevo_pedido')">
          <i class="bi bi-arrow-clockwise me-1"></i>Actualizar
        </button>
      </div>

      <!-- ── Mis pedidos activos (monitor rápido) ── -->
      <div class="mb-3">
        <div class="text-muted fw-semibold mb-1" style="font-size:0.72rem;text-transform:uppercase;letter-spacing:.08em;">
          <i class="bi bi-activity me-1"></i>Mis pedidos activos
        </div>
        <div class="d-flex align-items-center flex-wrap" style="overflow-x:auto;">
          ${pedidosChips}
        </div>
      </div>

      <!-- ── PASO 1: Mapa del restaurante ── -->
      <div id="paso-mesa">
        <div class="d-flex align-items-center gap-2 mb-2">
          <div class="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
               style="width:26px;height:26px;font-size:0.82rem;">1</div>
          <h6 class="fw-bold mb-0">Selecciona la mesa en el plano</h6>
        </div>

        <!-- Leyenda compacta -->
        <div class="d-flex gap-3 mb-2 flex-wrap" style="font-size:0.75rem;">
          <span class="d-flex align-items-center gap-1">
            <span style="width:10px;height:10px;border-radius:3px;background:#22c55e;display:inline-block;"></span>
            <span class="text-muted">Disponible — toca para pedir</span>
          </span>
          <span class="d-flex align-items-center gap-1">
            <span style="width:10px;height:10px;border-radius:3px;background:#ef4444;display:inline-block;"></span>
            <span class="text-muted">Ocupada</span>
          </span>
          <span class="d-flex align-items-center gap-1">
            <span style="width:10px;height:10px;border-radius:3px;background:#f59e0b;display:inline-block;"></span>
            <span class="text-muted">Reservada</span>
          </span>
          <span class="d-flex align-items-center gap-1">
            <svg width="16" height="16"><circle cx="8" cy="8" r="6" fill="none" stroke="#3b82f6" stroke-width="2" stroke-dasharray="4,2"/></svg>
            <span class="text-muted">Tu pedido activo</span>
          </span>
        </div>

        <!-- Plano SVG -->
        <div class="card border-0 shadow-sm mb-3" style="overflow:hidden;border-radius:16px;">
          <div class="card-body p-0" style="background:#e2e8f0;">
            <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;padding:4px;">
              <svg viewBox="0 0 800 560" xmlns="http://www.w3.org/2000/svg"
                   style="width:100%;min-width:300px;max-width:1000px;display:block;margin:0 auto;border-radius:14px;">
                ${plano}
                ${mesasSVG}
              </svg>
            </div>
          </div>
        </div>

        <!-- Mini-cards scroll horizontal (respaldo móvil) -->
        <div class="d-flex gap-2 pb-1" style="overflow-x:auto;-webkit-overflow-scrolling:touch;">
          ${mesas.map(m => {
            const c = C[m.estado] || C.disponible;
            const esDisp = m.estado === "disponible";
            return `
            <div class="flex-shrink-0" style="width:90px;cursor:${esDisp?'pointer':'default'};"
                 ${esDisp?`onclick="Pages.seleccionarMesaPedido(${m.id},${m.numero})"`:''}>
              <div class="card border-0 shadow-sm" style="border-top:3px solid ${c.bg}!important;border-radius:10px;${!esDisp?'opacity:0.6':''}">
                <div class="card-body p-2 text-center">
                  <div class="fw-bold" style="font-family:Sora,sans-serif;">M${m.numero}</div>
                  <div class="text-muted" style="font-size:0.65rem;">${m.capacidad}pax</div>
                  <span class="badge d-block mt-1"
                        style="background:${c.badge};color:${c.badgeTxt};font-size:0.6rem;border-radius:5px;">
                    ${m.estado}
                  </span>
                </div>
              </div>
            </div>`;
          }).join("")}
        </div>
      </div>

      <!-- ── PASO 2: Agregar Platillos (oculto hasta elegir mesa) ── -->
      <div id="paso-platillos" class="d-none mt-3">

        <!-- Banner mesa seleccionada -->
        <div class="d-flex align-items-center justify-content-between px-3 py-2 mb-3 rounded-3"
             style="background:rgba(34,197,94,0.1);border:1.5px solid rgba(34,197,94,0.3);">
          <div class="d-flex align-items-center gap-2">
            <i class="bi bi-check-circle-fill text-success fs-5"></i>
            <span class="fw-semibold">Mesa <span id="label-mesa-sel" class="text-success"></span> seleccionada</span>
          </div>
          <button class="btn btn-sm btn-outline-secondary rounded-pill" onclick="Pages.cambiarMesa()">
            <i class="bi bi-arrow-left me-1"></i>Cambiar
          </button>
        </div>

        <div class="d-flex align-items-center gap-2 mb-3">
          <div class="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
               style="width:26px;height:26px;font-size:0.82rem;">2</div>
          <h6 class="fw-bold mb-0">Elige los platillos</h6>
        </div>

        <div class="row g-3">
          <!-- Carta de platillos -->
          <div class="col-12 col-lg-7">
            <div class="card border-0 shadow-sm">
              <div class="card-header bg-transparent border-0 pb-0 pt-3">
                <div class="d-flex align-items-center justify-content-between mb-2">
                  <h6 class="fw-bold mb-0">Carta</h6>
                  <input type="text" class="form-control form-control-sm" style="max-width:150px;"
                         placeholder="🔍 Buscar..." oninput="Pages.buscarPlatillo(this.value)">
                </div>
                <div id="filtros-cat" class="pb-1">${categoriasHTML}</div>
              </div>
              <div class="card-body pt-2">
                <div class="row g-2" id="grid-platillos">${gridPlatillos}</div>
              </div>
            </div>
          </div>

          <!-- Resumen del pedido -->
          <div class="col-12 col-lg-5">
            <div class="card border-0 shadow-sm" style="position:sticky;top:80px;">
              <div class="card-header border-0 d-flex align-items-center justify-content-between py-3"
                   style="background:linear-gradient(135deg,#0f172a,#1e293b);">
                <span class="fw-bold text-white"><i class="bi bi-receipt me-2 text-warning"></i>Pedido</span>
                <span class="badge bg-warning text-dark" id="badge-items">0 items</span>
              </div>
              <div class="card-body p-3">
                <div id="items-pedido" style="min-height:100px;max-height:300px;overflow-y:auto;"></div>
                <div class="border-top pt-3 mt-2">
                  <div class="d-flex justify-content-between fw-bold mb-3" style="font-size:1.05rem;">
                    <span>Total</span>
                    <span class="text-primary" id="total-pedido">${fmt.moneda(0)}</span>
                  </div>
                  <button class="btn btn-primary w-100 fw-bold py-2" id="btn-enviar-pedido"
                          onclick="Pages.confirmarPedido(${usuario.id})" disabled>
                    <i class="bi bi-send-fill me-2"></i>Enviar a Cocina
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>`;

  window._pedidoItems = [];
  window._mesaSeleccionada = null;
}


// ══════════════════════════════════════════════════════
//  PLATILLOS
// ══════════════════════════════════════════════════════
async function renderPlatillos(cid, usuario) {
  const el = document.getElementById(cid);
  const res = await API.getPlatillos();
  const platillos = res.data;
  const esAdmin = ["administrador"].includes(usuario.rol);

  const grid = platillos.map(p => `
    <div class="col-6 col-md-4 col-xl-3">
      <div class="card h-100 border-0 shadow-sm ${!p.activo ? 'opacity-50' : ''}">
        <div class="card-body text-center p-3">
          <div class="display-4 mb-2">${p.imagen}</div>
          <h6 class="fw-semibold mb-1">${p.nombre}</h6>
          <p class="text-muted small mb-2" style="font-size:0.78rem;">${p.descripcion}</p>
          <span class="badge bg-light text-dark me-1">${p.categoria}</span>
          <div class="fw-bold text-primary mt-2 fs-5">${fmt.moneda(p.precio)}</div>
          <div class="text-muted small"><i class="bi bi-clock me-1"></i>${p.tiempo_prep} min</div>
          ${esAdmin ? `
          <div class="mt-2 d-flex gap-1 justify-content-center">
            <button class="btn btn-sm btn-outline-primary" onclick="Pages.editarPlatillo(${p.id})"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-sm btn-outline-danger" onclick="Pages.eliminarPlatillo(${p.id})"><i class="bi bi-trash"></i></button>
          </div>` : ""}
        </div>
      </div>
    </div>`).join("");

  el.innerHTML = `
    <div class="p-4">
      <div class="d-flex align-items-center justify-content-between mb-4">
        <h4 class="fw-bold mb-0"><i class="bi bi-egg-fried me-2 text-warning"></i>Platillos</h4>
        ${esAdmin ? `<button class="btn btn-primary" onclick="Pages.nuevoPlatillo()"><i class="bi bi-plus me-2"></i>Nuevo Platillo</button>` : ""}
      </div>
      <div class="row g-3">${grid}</div>
    </div>`;
}

// ══════════════════════════════════════════════════════
//  STOCK / INGREDIENTES
// ══════════════════════════════════════════════════════
async function renderStock(cid, usuario) {
  const el = document.getElementById(cid);
  const res = await API.getStock();
  const items = res.data;
  const puedeActualizar = ["administrador", "jefe_cocina"].includes(usuario.rol);

  const tabla = crearTabla({
    columnas: [
      { campo: "nombre", titulo: "Ingrediente" },
      { campo: "categoria", titulo: "Categoría", render: v => `<span class="badge bg-light text-dark">${v}</span>` },
      { campo: "stock", titulo: "Stock Actual", render: (v, fila) => badgeStock(v, fila.stock_minimo) },
      { campo: "stock_minimo", titulo: "Mínimo", render: v => `${v}` },
      { campo: "unidad", titulo: "Unidad" },
      { campo: "precio_unitario", titulo: "Precio Unit.", render: v => fmt.moneda(v) },
    ],
    datos: items,
    acciones: puedeActualizar ? (i) => `
      <button class="btn btn-sm btn-outline-success me-1" onclick="Pages.actualizarStock(${i.id},'${i.nombre}')">
        <i class="bi bi-plus-circle"></i> Agregar
      </button>` : null,
    vacio: "Sin datos de stock"
  });

  const bajoMinimo = items.filter(i => i.stock <= i.stock_minimo).length;

  el.innerHTML = `
    <div class="p-4">
      <div class="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 class="fw-bold mb-1"><i class="bi bi-boxes me-2 text-success"></i>Stock de Ingredientes</h4>
          ${bajoMinimo > 0 ? `<div class="alert alert-warning py-2 mb-0 mt-2"><i class="bi bi-exclamation-triangle me-2"></i><strong>${bajoMinimo}</strong> ingredientes por debajo del mínimo</div>` : ""}
        </div>
        ${["cocinero","jefe_cocina"].includes(usuario.rol) ? `<button class="btn btn-warning" onclick="App.navigate('solicitudes_ing')"><i class="bi bi-cart-plus me-2"></i>Solicitar</button>` : ""}
      </div>
      <div class="card border-0 shadow-sm">
        <div class="card-body p-0">${tabla}</div>
      </div>
    </div>`;
}

// ══════════════════════════════════════════════════════
//  INGREDIENTES (Admin CRUD)
// ══════════════════════════════════════════════════════
async function renderIngredientes(cid) {
  const el = document.getElementById(cid);
  const res = await API.getStock();
  const items = res.data;

  const tabla = crearTabla({
    columnas: [
      { campo: "id", titulo: "#" },
      { campo: "nombre", titulo: "Nombre" },
      { campo: "categoria", titulo: "Categoría" },
      { campo: "stock", titulo: "Stock", render: (v, f) => badgeStock(v, f.stock_minimo) },
      { campo: "stock_minimo", titulo: "Mín." },
      { campo: "unidad", titulo: "Unidad" },
      { campo: "precio_unitario", titulo: "Precio", render: v => fmt.moneda(v) },
    ],
    datos: items,
    acciones: (i) => `
      <button class="btn btn-sm btn-outline-primary me-1" onclick="Pages.editarIngrediente(${i.id})"><i class="bi bi-pencil"></i></button>
      <button class="btn btn-sm btn-outline-success me-1" onclick="Pages.actualizarStock(${i.id},'${i.nombre}')"><i class="bi bi-plus"></i></button>`,
    vacio: "Sin ingredientes"
  });

  el.innerHTML = `
    <div class="p-4">
      <div class="d-flex align-items-center justify-content-between mb-4">
        <h4 class="fw-bold mb-0"><i class="bi bi-basket3-fill me-2 text-success"></i>Ingredientes</h4>
        <button class="btn btn-primary" onclick="Pages.nuevoIngrediente()"><i class="bi bi-plus me-2"></i>Nuevo</button>
      </div>
      <div class="card border-0 shadow-sm"><div class="card-body p-0">${tabla}</div></div>
    </div>`;
}

// ══════════════════════════════════════════════════════
//  HORARIOS
// ══════════════════════════════════════════════════════
async function renderHorarios(cid, pageId, usuario) {
  const el = document.getElementById(cid);

  // ── Filtrar por rol según quién mira ──
  const filtros = {};
  if (pageId === "horarios_meseros")  filtros.rol = "mesero";
  if (pageId === "horarios_cocineros") filtros.rol = "cocinero";
  if (pageId === "horarios_porteros") filtros.rol = "portero";

  const res = await API.getHorarios();
  let horarios = res.data;
  if (filtros.rol) {
    const usuRes = await API.getUsuarios({ rol: filtros.rol });
    const empIds = usuRes.data.map(u => u.id);
    horarios = horarios.filter(h => empIds.includes(h.empleado_id));
  }

  const canEdit = ["administrador","jefe_meseros","jefe_cocina"].includes(usuario.rol);
  const dias    = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];

  const titulo = {
    horarios_meseros:  "Horario de Meseros",
    horarios_cocineros:"Horario de Cocineros",
    horarios_porteros: "Horario de Porteros",
    horarios:          "Horarios"
  }[pageId] || "Horarios";

  // ── Agrupar horarios por día ──
  const porDia = {};
  dias.forEach(d => { porDia[d] = []; });
  horarios.forEach(h => {
    if (porDia[h.dia]) porDia[h.dia].push(h);
  });
  // Ordenar cada día por hora de entrada
  dias.forEach(d => {
    porDia[d].sort((a,b) => a.entrada.localeCompare(b.entrada));
  });

  // ── Color de fila alterna ──
  const rowBg = (i) => i % 2 === 0 ? "#ffffff" : "#f0f6ff";

  // ── Etiqueta de turno ──
  const turnoLabel = (t) => {
    const cfg = { mañana:"☀️ Mañana", tarde:"🌤 Tarde", noche:"🌙 Noche" };
    return cfg[t] || t;
  };

  // ── Bloques por día ──
  const bloquesHTML = dias.map(dia => {
    const filas = porDia[dia];

    const filasHTML = filas.length === 0
      ? `<div style="padding:22px 24px;color:#94a3b8;font-style:italic;text-align:center;
                     font-size:0.9rem;">
           Sin turnos asignados para este día
         </div>`
      : filas.map((h, i) => `
          <div style="display:grid;grid-template-columns:160px 1fr 1fr 1fr;
                      align-items:center;padding:16px 24px;
                      background:${rowBg(i)};
                      border-bottom:${i<filas.length-1?'1px solid #e8f0fe':''};
                      transition:background 0.15s;"
               onmouseover="this.style.background='#e8f2ff'"
               onmouseout="this.style.background='${rowBg(i)}'">
            <!-- Hora -->
            <div style="font-size:1rem;font-weight:700;color:#0f172a;letter-spacing:0.01em;">
              ${h.entrada} – ${h.salida}
            </div>
            <!-- Nombre empleado + rol -->
            <div>
              <div style="font-size:0.75rem;color:#64748b;text-transform:uppercase;
                          letter-spacing:0.06em;font-weight:600;margin-bottom:2px;">
                Empleado:
              </div>
              <div style="font-size:0.9rem;font-weight:700;color:#0f172a;text-transform:uppercase;">
                ${(h.empleado_nombre && h.empleado_nombre !== "N/A" ? h.empleado_nombre : "Sin asignar").toUpperCase()}
              </div>
            </div>
            <!-- Turno -->
            <div>
              <div style="font-size:0.75rem;color:#64748b;text-transform:uppercase;
                          letter-spacing:0.06em;font-weight:600;margin-bottom:2px;">
                Turno:
              </div>
              <div style="font-size:0.88rem;font-weight:600;color:#1e293b;">
                ${turnoLabel(h.turno)}
              </div>
            </div>
            <!-- Rol -->
            <div>
              <div style="font-size:0.75rem;color:#64748b;text-transform:uppercase;
                          letter-spacing:0.06em;font-weight:600;margin-bottom:2px;">
                Rol:
              </div>
              <div style="font-size:0.88rem;font-weight:600;color:#1e293b;text-transform:uppercase;">
                ${AuthService.getNombreRol(h.empleado_rol && h.empleado_rol !== "N/A" ? h.empleado_rol : "").toUpperCase() || "Sin asignar"}
              </div>
            </div>
          </div>`).join("");

    return `
      <div style="margin-bottom:20px;border-radius:14px;overflow:hidden;
                  box-shadow:0 2px 12px rgba(0,0,0,0.07),0 1px 3px rgba(0,0,0,0.05);">
        <!-- Header azul oscuro del día -->
        <div style="background:#0f2d52;padding:16px 24px;
                    display:flex;align-items:center;justify-content:space-between;">
          <span style="font-size:1.15rem;font-weight:700;color:#ffffff;
                       font-family:'Sora',sans-serif;">
            ${dia}
          </span>
          <div style="display:flex;align-items:center;gap:12px;">
            <span style="font-size:0.75rem;color:rgba(255,255,255,0.55);font-weight:500;">
              ${filas.length} turno${filas.length!==1?'s':''}
            </span>
            ${canEdit ? `
            <button onclick="Pages.nuevoHorarioDiaRapido(null,null,'${dia}')"
                    style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);
                           color:#fff;border-radius:8px;padding:4px 12px;font-size:0.75rem;
                           cursor:pointer;font-weight:600;transition:background 0.15s;"
                    onmouseover="this.style.background='rgba(255,255,255,0.2)'"
                    onmouseout="this.style.background='rgba(255,255,255,0.12)'">
              + Agregar
            </button>` : ""}
          </div>
        </div>
        <!-- Sub-header de sección -->
        <div style="background:#f8fafc;padding:10px 24px;
                    border-bottom:2px dashed #bfdbfe;">
          <span style="font-size:0.72rem;font-weight:800;color:#1e3a5f;
                       text-transform:uppercase;letter-spacing:0.1em;">
            ${titulo.toUpperCase()}
          </span>
        </div>
        <!-- Filas de turnos -->
        <div style="background:#fff;">${filasHTML}</div>
      </div>`;
  }).join("");

  el.innerHTML = `
    <div class="p-3 p-md-4" style="max-width:1100px;">

      <!-- Header principal -->
      <div class="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h4 class="fw-bold mb-0">
            <i class="bi bi-calendar-week me-2 text-primary"></i>${titulo}
          </h4>
          <small class="text-muted">${horarios.length} turno(s) registrados</small>
        </div>
        ${canEdit ? `
        <button class="btn btn-primary rounded-pill px-4 fw-semibold shadow-sm"
                onclick="Pages.nuevoHorario()">
          <i class="bi bi-plus-circle me-2"></i>Agregar Turno
        </button>` : ""}
      </div>

      <!-- Bloques por día -->
      ${bloquesHTML}

    </div>`;
}

// ══════════════════════════════════════════════════════
//  MI HORARIO — Vista tipo bloques por día (empleado)
// ══════════════════════════════════════════════════════
async function renderMiHorario(cid, usuario) {
  const el = document.getElementById(cid);
  const res = await API.getHorarios({ empleado_id: usuario.id });
  const horarios = res.data;

  const dias = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];

  // Agrupar por día y ordenar
  const porDia = {};
  dias.forEach(d => { porDia[d] = []; });
  horarios.forEach(h => { if (porDia[h.dia]) porDia[h.dia].push(h); });
  dias.forEach(d => porDia[d].sort((a,b) => a.entrada.localeCompare(b.entrada)));

  // Total horas
  let totalHoras = 0;
  horarios.forEach(h => {
    const [eh] = h.entrada.split(":").map(Number);
    const [sh] = h.salida.split(":").map(Number);
    let diff = sh - eh; if (diff<0) diff+=24;
    totalHoras += diff;
  });

  const turnoLabel = (t) => ({ mañana:"☀️ Mañana", tarde:"🌤 Tarde", noche:"🌙 Noche" }[t] || t);
  const rowBg = (i) => i%2===0 ? "#ffffff" : "#f0f6ff";

  const bloquesHTML = dias.map(dia => {
    const filas = porDia[dia];

    const filasHTML = filas.length === 0
      ? `<div style="padding:22px 24px;color:#94a3b8;font-style:italic;
                     text-align:center;font-size:0.9rem;">
           No tienes turnos para este día
         </div>`
      : filas.map((h, i) => `
          <div style="display:grid;grid-template-columns:160px 1fr 1fr 1fr;
                      align-items:center;padding:16px 24px;
                      background:${rowBg(i)};
                      border-bottom:${i<filas.length-1?'1px solid #e8f0fe':''};
                      transition:background 0.15s;"
               onmouseover="this.style.background='#e8f2ff'"
               onmouseout="this.style.background='${rowBg(i)}'">
            <div style="font-size:1rem;font-weight:700;color:#0f172a;">
              ${h.entrada} – ${h.salida}
            </div>
            <div>
              <div style="font-size:0.72rem;color:#64748b;text-transform:uppercase;
                          letter-spacing:0.06em;font-weight:600;">Turno:</div>
              <div style="font-size:0.9rem;font-weight:700;color:#0f172a;">
                ${turnoLabel(h.turno)}
              </div>
            </div>
            <div>
              <div style="font-size:0.72rem;color:#64748b;text-transform:uppercase;
                          letter-spacing:0.06em;font-weight:600;">Rol:</div>
              <div style="font-size:0.88rem;font-weight:600;color:#1e293b;text-transform:uppercase;">
                ${AuthService.getNombreRol(h.empleado_rol||usuario.rol).toUpperCase()}
              </div>
            </div>
            <div>
              <div style="font-size:0.72rem;color:#64748b;text-transform:uppercase;
                          letter-spacing:0.06em;font-weight:600;">Duración:</div>
              <div style="font-size:0.88rem;font-weight:600;color:#1e293b;">
                ${(()=>{ const e=parseInt(h.entrada);const s=parseInt(h.salida);let d=s-e;if(d<0)d+=24;return d+"h"; })()}
              </div>
            </div>
          </div>`).join("");

    return `
      <div style="margin-bottom:20px;border-radius:14px;overflow:hidden;
                  box-shadow:0 2px 12px rgba(0,0,0,0.07),0 1px 3px rgba(0,0,0,0.05);">
        <div style="background:#0f2d52;padding:16px 24px;
                    display:flex;align-items:center;justify-content:space-between;">
          <span style="font-size:1.15rem;font-weight:700;color:#ffffff;
                       font-family:'Sora',sans-serif;">${dia}</span>
          <span style="font-size:0.75rem;color:rgba(255,255,255,0.55);">
            ${filas.length > 0 ? filas[0].entrada+" – "+filas[filas.length-1].salida : "Libre"}
          </span>
        </div>
        <div style="background:#f8fafc;padding:10px 24px;border-bottom:2px dashed #bfdbfe;">
          <span style="font-size:0.72rem;font-weight:800;color:#1e3a5f;
                       text-transform:uppercase;letter-spacing:0.1em;">
            ${AuthService.getNombreRol(usuario.rol).toUpperCase()}
          </span>
        </div>
        <div style="background:#fff;">${filasHTML}</div>
      </div>`;
  }).join("");

  el.innerHTML = `
    <div class="p-3 p-md-4" style="max-width:1100px;">

      <!-- Header -->
      <div class="mb-4">
        <h4 class="fw-bold mb-1">
          <i class="bi bi-calendar-week me-2 text-primary"></i>Mi Horario
        </h4>
        <div class="d-flex align-items-center gap-3 flex-wrap">
          <small class="text-muted">
            ${horarios.length} turno(s) esta semana
          </small>
          <span style="background:#e8f0fe;color:#1e3a5f;font-size:0.78rem;
                       font-weight:700;padding:3px 12px;border-radius:99px;">
            ⏱ ${totalHoras}h totales
          </span>
        </div>
      </div>

      <!-- Bloques por día -->
      ${bloquesHTML}

    </div>`;
}



// ══════════════════════════════════════════════════════
//  TURNO
// ══════════════════════════════════════════════════════
async function renderTurno(cid, usuario) {
  const el = document.getElementById(cid);
  const res = await API.getTurnosActivos();
  const miTurno = res.data.find(t => t.empleado_id === usuario.id);

  el.innerHTML = `
    <div class="p-4 text-center" style="max-width:500px;margin:0 auto;">
      <h4 class="fw-bold mb-4"><i class="bi bi-clock-fill me-2 text-primary"></i>Mi Turno</h4>
      ${miTurno ? `
        <div class="card border-0 shadow-sm mb-4">
          <div class="card-body py-4">
            <div class="display-6 mb-2">✅</div>
            <h5 class="fw-bold text-success">Turno Activo</h5>
            <p class="text-muted mb-2">Inicio: <strong>${miTurno.hora_inicio}</strong></p>
            <p class="text-muted mb-0">Fecha: <strong>${miTurno.fecha}</strong></p>
          </div>
        </div>
        <button class="btn btn-danger" onclick="Pages.terminarTurno(${miTurno.id},'${cid}',${usuario.id})">
          <i class="bi bi-stop-circle me-2"></i>Terminar Turno
        </button>` : `
        <div class="card border-0 shadow-sm mb-4">
          <div class="card-body py-4">
            <div class="display-6 mb-2">⏸️</div>
            <h5 class="fw-bold text-muted">Sin Turno Activo</h5>
            <p class="text-muted">Toma tu turno para comenzar a trabajar</p>
          </div>
        </div>
        <button class="btn btn-success btn-lg" onclick="Pages.iniciarTurno('${cid}',${usuario.id})">
          <i class="bi bi-play-circle me-2"></i>Tomar Turno
        </button>`}
    </div>`;
}

// ══════════════════════════════════════════════════════
//  MESAS — Plano visual interactivo (versión mejorada)
// ══════════════════════════════════════════════════════
async function renderMesas(cid, usuario) {
  const el = document.getElementById(cid);
  const res = await getMesasConEstadoPedido();
  const mesas = res.data;

  const esPortero = usuario.rol === "portero";
  const esMesero  = usuario.rol === "mesero";

  // ── Leyenda de estados ──
  const leyenda = Object.entries({
    disponible:     "Disponible",
    reservada:      "Reservada",
    ocupada:        "Ocupada",
    con_pedido:     "Con Pedido",
    pendiente_pago: "Pendiente Pago",
    liberable:      "Lista p/ Liberar",
  }).map(([est, label]) => `
    <span class="d-inline-flex align-items-center gap-1 me-3 mb-1">
      ${badgeEstadoMesa(est)} <small class="text-muted">${label}</small>
    </span>`).join("");

  // ── Tarjetas de mesas ──
  const tarjetas = mesas.map(mesa => {
    const puede = mesa.puede_liberarse;
    const pedido = mesa.pedido_activo;

    // Botones según rol y estado
    let acciones = "";

    if (esPortero) {
      if (mesa.estado === "reservada")
        acciones = `<button class="btn btn-sm btn-warning w-100" onclick="Mesas.confirmarLlegadaReserva(${mesa.id},${mesa.numero})">
          <i class="bi bi-person-check me-1"></i>Confirmar llegada</button>`;

      if (mesa.estado === "disponible")
        acciones = `<button class="btn btn-sm btn-outline-secondary w-100" onclick="Mesas.ocuparMesa(${mesa.id},${mesa.numero})">
          <i class="bi bi-people me-1"></i>Ocupar mesa</button>`;

      if (mesa.estado === "liberable")
        acciones = `<button class="btn btn-sm btn-primary w-100" onclick="Mesas.liberarMesa(${mesa.id},${mesa.numero})">
          <i class="bi bi-unlock me-1"></i>Liberar mesa</button>`;

      if (!puede && mesa.estado !== "disponible" && mesa.estado !== "liberable" && mesa.estado !== "reservada") {
        acciones = `<div class="text-muted small d-flex align-items-center gap-1">
          <i class="bi bi-lock-fill text-danger"></i>
          <span>${mesa.razon_bloqueo ?? "No liberalble aún"}</span>
        </div>`;
      }
    }

    if (esMesero) {
      if (mesa.estado === "disponible")
        acciones = `<button class="btn btn-sm btn-success w-100" onclick="App.navigate('nuevo_pedido')">
          <i class="bi bi-plus-circle me-1"></i>Nuevo pedido</button>`;
    }

    const borderColor = {
      disponible:     "#22c55e",
      reservada:      "#f59e0b",
      ocupada:        "#ef4444",
      con_pedido:     "#3b82f6",
      pendiente_pago: "#1e293b",
      liberable:      "#6366f1",
    }[mesa.estado] ?? "#e2e8f0";

    const pedidoInfo = pedido ? `
      <div class="mt-2 p-2 rounded-2" style="background:#f8fafc;font-size:0.78rem;">
        <div class="fw-semibold mb-1">Pedido #${pedido.id}</div>
        ${badgeEstadoPedidoV2(pedido.estado)}
        <div class="text-muted mt-1">${fmt.moneda(pedido.total)}</div>
      </div>` : "";

    const bloqueado = !puede && !["disponible","reservada"].includes(mesa.estado) ? `
      <div class="mt-2 d-flex align-items-center gap-1" style="font-size:0.75rem;color:#ef4444;">
        <i class="bi bi-lock-fill"></i>
        <span>Bloqueada: pedido activo</span>
      </div>` : "";

    return `
      <div class="col-6 col-md-4 col-lg-3">
        <div class="card border-0 shadow-sm h-100 mesa-mini-card"
             style="border-left:4px solid ${borderColor}!important;">
          <div class="card-body p-3">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <div>
                <div class="fw-bold fs-5">Mesa ${mesa.numero}</div>
                <small class="text-muted"><i class="bi bi-people me-1"></i>${mesa.capacidad} personas</small>
              </div>
              ${badgeEstadoMesa(mesa.estado)}
            </div>
            <div class="text-muted small text-capitalize mb-2">
              <i class="bi bi-geo-alt me-1"></i>${mesa.zona.replace("_", " ")}
            </div>
            ${pedidoInfo}
            ${bloqueado}
            ${acciones ? `<div class="mt-3">${acciones}</div>` : ""}
          </div>
        </div>
      </div>`;
  });

  // ── Contadores resumen ──
  const resumen = [
    { label: "Disponibles",   count: mesas.filter(m => m.estado === "disponible").length,     color: "success" },
    { label: "Reservadas",    count: mesas.filter(m => m.estado === "reservada").length,      color: "warning" },
    { label: "Con Pedido",    count: mesas.filter(m => m.estado === "con_pedido").length,     color: "info"    },
    { label: "Pend. Pago",    count: mesas.filter(m => m.estado === "pendiente_pago").length, color: "dark"    },
    { label: "Liberables",    count: mesas.filter(m => m.estado === "liberable").length,      color: "primary" },
  ].map(s => `
    <div class="col-auto">
      <div class="badge bg-${s.color} bg-opacity-10 text-${s.color} px-3 py-2" style="font-size:0.8rem;">
        <span class="fw-bold">${s.count}</span> ${s.label}
      </div>
    </div>`).join("");

  el.innerHTML = `
    <div class="p-4">
      <div class="mb-4">
        <h4 class="fw-bold mb-1"><i class="bi bi-grid-3x3-gap-fill me-2 text-primary"></i>Mesas del Restaurante</h4>
        <div class="row g-2 mt-2">${resumen}</div>
      </div>
      <!-- Leyenda -->
      <div class="mb-3 d-flex flex-wrap">${leyenda}</div>
      <!-- Grid de mesas -->
      <div class="row g-3">${tarjetas.join("")}</div>
      ${esPortero ? `
        <div class="alert alert-info mt-4 d-flex gap-2 align-items-center" style="border-radius:12px;">
          <i class="bi bi-info-circle-fill fs-5"></i>
          <div>
            <strong>Regla de negocio:</strong> Solo puedes liberar una mesa cuando su pedido está
            <span class="badge bg-success">Pagado</span> o
            <span class="badge bg-danger">Cancelado</span>.
          </div>
        </div>` : ""}
    </div>`;
}


// ══════════════════════════════════════════════════════
//  RESERVACIONES
// ══════════════════════════════════════════════════════
async function renderReservaciones(cid) {
  const el = document.getElementById(cid);
  const res = await API.getReservaciones({ tipo: "mesa" });
  const reservas = res.data;

  const tabla = crearTabla({
    columnas: [
      { campo: "id", titulo: "#" },
      { campo: "cliente", titulo: "Cliente", render: v => `<span class="fw-semibold">${v}</span>` },
      { campo: "fecha", titulo: "Fecha/Hora", render: v => fmt.fechaHora(v) },
      { campo: "personas", titulo: "Personas", render: v => `<span class="badge bg-secondary">${v} pax</span>` },
      { campo: "mesa_id", titulo: "Mesa", render: v => `Mesa ${v}` },
      { campo: "estado", titulo: "Estado", render: v => `<span class="badge bg-${v==='confirmada'?'success':'warning text-dark'}">${v}</span>` },
      { campo: "notas", titulo: "Notas" },
    ],
    datos: reservas,
    vacio: "No hay reservaciones de mesas"
  });

  el.innerHTML = `
    <div class="p-4">
      <div class="d-flex align-items-center justify-content-between mb-4">
        <h4 class="fw-bold mb-0"><i class="bi bi-bookmark-star-fill me-2 text-primary"></i>Reservaciones de Mesas</h4>
        <button class="btn btn-primary" onclick="Pages.nuevaReservacion()"><i class="bi bi-plus me-2"></i>Nueva Reserva</button>
      </div>
      <div class="card border-0 shadow-sm"><div class="card-body p-0">${tabla}</div></div>
    </div>`;
}

// ══════════════════════════════════════════════════════
//  RESERVACIONES PLATILLOS
// ══════════════════════════════════════════════════════
async function renderReservacionesPlatillos(cid) {
  const el = document.getElementById(cid);
  const res = await API.getReservaciones({ tipo: "platillo" });
  const reservas = res.data;

  const tabla = crearTabla({
    columnas: [
      { campo: "id", titulo: "#" },
      { campo: "cliente", titulo: "Cliente", render: v => `<span class="fw-semibold">${v}</span>` },
      { campo: "fecha", titulo: "Fecha", render: v => fmt.fechaHora(v) },
      { campo: "cantidad", titulo: "Personas", render: v => `${v} pax` },
      { campo: "estado", titulo: "Estado", render: v => `<span class="badge bg-${v==='confirmada'?'success':'warning text-dark'}">${v}</span>` },
      { campo: "notas", titulo: "Notas" },
    ],
    datos: reservas,
    vacio: "No hay reservaciones de platillos"
  });

  el.innerHTML = `
    <div class="p-4">
      <h4 class="fw-bold mb-4"><i class="bi bi-bookmark-fill me-2 text-warning"></i>Reservaciones de Platillos</h4>
      <div class="card border-0 shadow-sm"><div class="card-body p-0">${tabla}</div></div>
    </div>`;
}

// ══════════════════════════════════════════════════════
//  FINANZAS (Dueño/Admin)
// ══════════════════════════════════════════════════════
async function renderFinanzas(cid) {
  const el = document.getElementById(cid);
  el.innerHTML = `
    <div class="p-4">
      <h4 class="fw-bold mb-4"><i class="bi bi-bar-chart-fill me-2 text-success"></i>Balance Financiero</h4>
      <!-- Selector de periodo -->
      <div class="d-flex gap-2 mb-4 flex-wrap" id="periodo-btns">
        ${["dia","semana","mes","trimestre","semestre","anual"].map(p =>
          `<button class="btn btn-sm ${p==="mes"?"btn-primary":"btn-outline-secondary"} periodo-btn" data-periodo="${p}" onclick="Pages.cargarFinanzas('${p}')">${p.charAt(0).toUpperCase()+p.slice(1)}</button>`
        ).join("")}
      </div>
      <!-- KPIs -->
      <div class="row g-3 mb-4" id="kpis-finanzas">
        <div class="col-12 text-center py-3"><div class="spinner-border text-primary"></div></div>
      </div>
      <!-- Gráfico -->
      <div class="card border-0 shadow-sm mb-4">
        <div class="card-header bg-transparent border-0 pt-3">
          <h6 class="fw-bold mb-0">Ganancias vs Gastos</h6>
        </div>
        <div class="card-body">
          <canvas id="chart-finanzas" height="100"></canvas>
        </div>
      </div>
    </div>`;

  await cargarDatosFinanzas("mes");
}

async function cargarDatosFinanzas(periodo) {
  const res = await API.getFinanzas(periodo);
  const fin = res.data;

  // KPIs
  document.getElementById("kpis-finanzas").innerHTML = `
    <div class="col-6 col-md-3">${kpiCard({ titulo: "Ganancias Totales", valor: fmt.moneda(fin.total_ganancias), icono: "bi-arrow-up-circle-fill", color: "success" })}</div>
    <div class="col-6 col-md-3">${kpiCard({ titulo: "Gastos Totales", valor: fmt.moneda(fin.total_gastos), icono: "bi-arrow-down-circle-fill", color: "danger" })}</div>
    <div class="col-6 col-md-3">${kpiCard({ titulo: "Utilidad Neta", valor: fmt.moneda(fin.utilidad), icono: "bi-cash-stack", color: fin.utilidad > 0 ? "primary" : "danger" })}</div>
    <div class="col-6 col-md-3">${kpiCard({ titulo: "Margen", valor: `${Math.round((fin.utilidad/fin.total_ganancias)*100)}%`, icono: "bi-graph-up-arrow", color: "info" })}</div>`;

  // Chart
  const canvas = document.getElementById("chart-finanzas");
  if (!canvas) return;
  if (window._chartFinanzas) window._chartFinanzas.destroy();

  const labels = fin.ganancias.map((_, i) => {
    if (periodo === "dia") return ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"][i] || `Día ${i+1}`;
    if (periodo === "semana") return `Sem ${i+1}`;
    if (periodo === "mes") return ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"][i] || `Mes ${i+1}`;
    return `P${i+1}`;
  });

  window._chartFinanzas = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Ganancias", data: fin.ganancias, backgroundColor: "rgba(34,197,94,0.7)", borderColor: "#22c55e", borderWidth: 2, borderRadius: 6 },
        { label: "Gastos", data: fin.gastos, backgroundColor: "rgba(239,68,68,0.7)", borderColor: "#ef4444", borderWidth: 2, borderRadius: 6 }
      ]
    },
    options: {
      responsive: true, plugins: { legend: { position: "top" } },
      scales: { y: { beginAtZero: true, ticks: { callback: v => "$" + v.toLocaleString("es-MX") } } }
    }
  });
}

// ══════════════════════════════════════════════════════
//  EMPLEADOS (Dueño)
// ══════════════════════════════════════════════════════
async function renderEmpleados(cid) {
  const el = document.getElementById(cid);
  const res = await API.getUsuarios();
  const usuarios = res.data;
  const metricas = (await API.getMetricas()).data;

  const porRol = Object.entries(metricas.empleados_por_rol).map(([rol, cant]) => `
    <div class="col-6 col-md-3 col-lg-2">
      <div class="card border-0 shadow-sm text-center">
        <div class="card-body py-3">
          <div class="display-5 fw-bold text-primary">${cant}</div>
          <div class="text-muted small">${AuthService.getNombreRol(rol)}</div>
        </div>
      </div>
    </div>`).join("");

  const tabla = crearTabla({
    columnas: [
      { campo: "avatar", titulo: "", render: (v, f) => `<div class="avatar-circle bg-${AuthService.getColorRol(f.rol)} bg-opacity-20 text-${AuthService.getColorRol(f.rol)} fw-bold d-inline-flex align-items-center justify-content-center" style="width:36px;height:36px;border-radius:50%;font-size:0.75rem;">${v}</div>` },
      { campo: "nombre", titulo: "Nombre", render: v => `<span class="fw-semibold">${v}</span>` },
      { campo: "email", titulo: "Email" },
      { campo: "rol", titulo: "Rol", render: v => `<span class="badge bg-${AuthService.getColorRol(v)}">${AuthService.getNombreRol(v)}</span>` },
      { campo: "activo", titulo: "Estado", render: v => `<span class="badge bg-${v?'success':'danger'}">${v?'Activo':'Inactivo'}</span>` },
    ],
    datos: usuarios,
    vacio: "No hay empleados"
  });

  el.innerHTML = `
    <div class="p-4">
      <h4 class="fw-bold mb-4"><i class="bi bi-people-fill me-2 text-primary"></i>Empleados por Rol</h4>
      <div class="row g-3 mb-4">${porRol}</div>
      <div class="card border-0 shadow-sm"><div class="card-body p-0">${tabla}</div></div>
    </div>`;
}

// ══════════════════════════════════════════════════════
//  USUARIOS CRUD (Admin)
// ══════════════════════════════════════════════════════
async function renderUsuarios(cid) {
  const el = document.getElementById(cid);
  const res = await API.getUsuarios();
  const usuarios = res.data;

  const tabla = crearTabla({
    columnas: [
      { campo: "id", titulo: "ID" },
      { campo: "nombre", titulo: "Nombre", render: v => `<span class="fw-semibold">${v}</span>` },
      { campo: "email", titulo: "Email" },
      { campo: "rol", titulo: "Rol", render: v => `<span class="badge bg-${AuthService.getColorRol(v)}">${AuthService.getNombreRol(v)}</span>` },
      { campo: "activo", titulo: "Estado", render: v => `<span class="badge bg-${v?'success':'secondary'}">${v?'Activo':'Inactivo'}</span>` },
    ],
    datos: usuarios,
    acciones: (u) => `
      <button class="btn btn-sm btn-outline-primary me-1" onclick="Pages.editarUsuario(${u.id})"><i class="bi bi-pencil"></i></button>
      <button class="btn btn-sm btn-outline-danger" onclick="Pages.eliminarUsuario(${u.id})"><i class="bi bi-trash"></i></button>`,
    vacio: "No hay usuarios"
  });

  el.innerHTML = `
    <div class="p-4">
      <div class="d-flex align-items-center justify-content-between mb-4">
        <h4 class="fw-bold mb-0"><i class="bi bi-people-fill me-2 text-primary"></i>Gestión de Usuarios</h4>
        <button class="btn btn-primary" onclick="Pages.nuevoUsuario()"><i class="bi bi-person-plus me-2"></i>Nuevo Usuario</button>
      </div>
      <div class="card border-0 shadow-sm"><div class="card-body p-0">${tabla}</div></div>
    </div>`;
}

// ══════════════════════════════════════════════════════
//  SOLICITUDES PERSONAL
// ══════════════════════════════════════════════════════
async function renderSolicitudesPersonal(cid, usuario) {
  const el = document.getElementById(cid);
  const res = await API.getSolicitudesPersonal();
  const solicitudes = res.data;

  const puedeAprobar = ["administrador", "dueno"].includes(usuario.rol);
  const puedeCrear = ["jefe_meseros", "jefe_cocina", "administrador"].includes(usuario.rol);

  const tabla = crearTabla({
    columnas: [
      { campo: "id", titulo: "#" },
      { campo: "tipo", titulo: "Tipo", render: v => `<span class="badge bg-info">${v}</span>` },
      { campo: "rol_solicitado", titulo: "Rol", render: v => `<span class="badge bg-${AuthService.getColorRol(v)}">${AuthService.getNombreRol(v)}</span>` },
      { campo: "cantidad", titulo: "Cantidad" },
      { campo: "motivo", titulo: "Motivo" },
      { campo: "solicitante_nombre", titulo: "Solicitante" },
      { campo: "estado", titulo: "Estado", render: v => `<span class="badge bg-${v==='aprobada'?'success':v==='rechazada'?'danger':'warning text-dark'}">${v}</span>` },
    ],
    datos: solicitudes,
    acciones: puedeAprobar ? (s) => s.estado === "pendiente" ? `
      <button class="btn btn-sm btn-success me-1" onclick="Pages.aprobarSolicitudPersonal(${s.id})"><i class="bi bi-check-lg"></i></button>
      <button class="btn btn-sm btn-danger" onclick="Pages.rechazarSolicitudPersonal(${s.id})"><i class="bi bi-x-lg"></i></button>` : "-" : null,
    vacio: "No hay solicitudes"
  });

  el.innerHTML = `
    <div class="p-4">
      <div class="d-flex align-items-center justify-content-between mb-4">
        <h4 class="fw-bold mb-0"><i class="bi bi-person-plus-fill me-2 text-primary"></i>Solicitudes de Personal</h4>
        ${puedeCrear ? `<button class="btn btn-primary" onclick="Pages.nuevaSolicitudPersonal(${usuario.id})"><i class="bi bi-plus me-2"></i>Nueva Solicitud</button>` : ""}
      </div>
      <div class="card border-0 shadow-sm"><div class="card-body p-0">${tabla}</div></div>
    </div>`;
}

// ══════════════════════════════════════════════════════
//  SOLICITUDES INGREDIENTES
// ══════════════════════════════════════════════════════
async function renderSolicitudesIngredientes(cid, usuario) {
  const el = document.getElementById(cid);
  const res = await API.getSolicitudesIngredientes();
  const solicitudes = res.data;
  const puedeAprobar = ["administrador", "jefe_cocina"].includes(usuario.rol);

  const tabla = crearTabla({
    columnas: [
      { campo: "id", titulo: "#" },
      { campo: "ingrediente_nombre", titulo: "Ingrediente", render: v => `<span class="fw-semibold">${v}</span>` },
      { campo: "cantidad", titulo: "Cantidad" },
      { campo: "unidad", titulo: "Unidad" },
      { campo: "motivo", titulo: "Motivo" },
      { campo: "solicitante_nombre", titulo: "Solicitante" },
      { campo: "estado", titulo: "Estado", render: v => `<span class="badge bg-${v==='aprobada'?'success':v==='rechazada'?'danger':'warning text-dark'}">${v}</span>` },
    ],
    datos: solicitudes,
    acciones: puedeAprobar ? (s) => s.estado === "pendiente" ? `
      <button class="btn btn-sm btn-success me-1" onclick="Pages.aprobarIngrediente(${s.id})"><i class="bi bi-check-lg"></i></button>
      <button class="btn btn-sm btn-danger" onclick="Pages.rechazarIngrediente(${s.id})"><i class="bi bi-x-lg"></i></button>` : "-" : null,
    vacio: "No hay solicitudes de ingredientes"
  });

  el.innerHTML = `
    <div class="p-4">
      <div class="d-flex align-items-center justify-content-between mb-4">
        <h4 class="fw-bold mb-0"><i class="bi bi-cart-plus-fill me-2 text-warning"></i>Solicitudes de Ingredientes</h4>
        <button class="btn btn-warning text-dark" onclick="Pages.nuevaSolicitudIngrediente(${usuario.id})"><i class="bi bi-plus me-2"></i>Nueva Solicitud</button>
      </div>
      <div class="card border-0 shadow-sm"><div class="card-body p-0">${tabla}</div></div>
    </div>`;
}

// Alias para dueño
async function renderIngredientesSolicitudes(cid) {
  const usuario = AuthService.getUsuario();
  return renderSolicitudesIngredientes(cid, usuario);
}

// ══════════════════════════════════════════════════════
//  RANKING PLATILLOS
// ══════════════════════════════════════════════════════
async function renderPlatillosRanking(cid) {
  const el = document.getElementById(cid);
  const res = await API.getMetricas();
  const ranking = res.data.platillos_mas_pedidos;

  const platRes = await API.getPlatillos();
  const platillos = platRes.data;

  const rows = ranking.map((r, i) => {
    const plat = platillos.find(p => p.id === r.platillo_id);
    return `
      <tr>
        <td><span class="badge bg-${i===0?'warning text-dark':i===1?'secondary':i===2?'danger':'light text-dark'} fs-6">#${i+1}</span></td>
        <td>${plat?.imagen || "🍽️"}</td>
        <td class="fw-semibold">${r.nombre}</td>
        <td><strong>${r.cantidad}</strong> pedidos</td>
        <td>${r.mes}</td>
        <td>${fmt.moneda((plat?.precio || 0) * r.cantidad)}</td>
      </tr>`;
  }).join("");

  el.innerHTML = `
    <div class="p-4">
      <h4 class="fw-bold mb-4"><i class="bi bi-trophy-fill me-2 text-warning"></i>Platillos Más Pedidos</h4>
      <div class="card border-0 shadow-sm">
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-dark"><tr><th>Pos.</th><th></th><th>Platillo</th><th>Pedidos</th><th>Mes</th><th>Ingresos</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>`;
}

// ══════════════════════════════════════════════════════
//  EQUIPOS DE COCINA
// ══════════════════════════════════════════════════════
async function renderEquiposCocina(cid) {
  const el = document.getElementById(cid);
  const res = await API.getEquiposCocina();
  const equipos = res.data;

  const cards = equipos.map(e => `
    <div class="col-6 col-md-4 col-lg-3">
      <div class="card border-0 shadow-sm h-100 border-top border-4 border-${e.estado==='ok'?'success':'warning'}">
        <div class="card-body text-center p-3">
          <h5 class="fw-bold mb-1">${e.nombre}</h5>
          <div class="display-5 fw-bold ${e.cantidad <= e.minimo ? 'text-warning' : 'text-success'}">${e.cantidad}</div>
          <div class="text-muted small">Mínimo: ${e.minimo}</div>
          <span class="badge mt-2 bg-${e.estado==='ok'?'success':'warning text-dark'}">${e.estado==='ok'?'OK':'Alerta'}</span>
        </div>
      </div>
    </div>`).join("");

  el.innerHTML = `
    <div class="p-4">
      <h4 class="fw-bold mb-4"><i class="bi bi-tools me-2 text-secondary"></i>Stock de Equipos de Cocina</h4>
      <div class="row g-3">${cards}</div>
    </div>`;
}

// ══════════════════════════════════════════════════════
//  ACCIONES INTERACTIVAS (llamadas desde botones)
// ══════════════════════════════════════════════════════
export const PageActions = {
  // Cambiar estado de pedido (cocinero/mesero)
  async cambiarEstadoPedido(id, estado) {
    const res = await API.updateEstadoPedido(id, estado);
    if (res.status === 200) {
      Toast.success(`Pedido #${id} → ${estado.replace("_", " ")}`);
      App.navigate(App.currentPage); // Recargar
    } else {
      Toast.error(res.message);
    }
  },

  // Ver detalle de pedido
  async verDetallePedido(id) {
    const res = await API.getPedidos();
    const pedido = res.data.find(p => p.id === id);
    if (!pedido) return Toast.error("Pedido no encontrado");

    const itemsHTML = pedido.items.map(i => `
      <div class="d-flex align-items-center justify-content-between py-2 border-bottom">
        <div>${i.platillo_emoji} <strong>${i.cantidad}x</strong> ${i.platillo_nombre}
          ${i.notas ? `<br><small class="text-muted">${i.notas}</small>` : ""}</div>
        <div class="fw-bold">${fmt.moneda(i.precio_unitario * i.cantidad)}</div>
      </div>`).join("");

    Modal.show({
      titulo: `Pedido #${pedido.id} — Mesa ${pedido.mesa}`,
      cuerpo: `
        <div class="mb-3">${badgeEstadoPedido(pedido.estado)}</div>
        ${itemsHTML}
        <div class="d-flex justify-content-between fw-bold fs-5 pt-3 mt-2">
          <span>Total</span><span class="text-primary">${fmt.moneda(pedido.total)}</span>
        </div>`,
      size: "md"
    });
  },

  // Seleccionar mesa para el nuevo pedido
  seleccionarMesaPedido(mesaId, mesaNum) {
    window._mesaSeleccionada = mesaId;
    window._mesaSeleccionadaNum = mesaNum;  // FIX: guardar también el número
    const label = document.getElementById("label-mesa-sel");
    if (label) label.textContent = `Mesa ${mesaNum}`;
    document.getElementById("paso-mesa")?.classList.add("d-none");
    document.getElementById("paso-platillos")?.classList.remove("d-none");
    Toast.success(`✅ Mesa ${mesaNum} seleccionada`);
  },

  cambiarMesa() {
    window._mesaSeleccionada = null;
    window._mesaSeleccionadaNum = null;
    window._pedidoItems = [];
    document.getElementById("paso-mesa")?.classList.remove("d-none");
    document.getElementById("paso-platillos")?.classList.add("d-none");
  },

  filtrarCategoria(cat) {
    document.querySelectorAll(".categoria-btn").forEach(b => {
      b.classList.toggle("btn-primary", b.dataset.cat === cat);
      b.classList.toggle("btn-outline-secondary", b.dataset.cat !== cat);
    });
    document.querySelectorAll(".platillo-card").forEach(card => {
      card.style.display = (cat === "todos" || card.dataset.cat === cat) ? "" : "none";
    });
  },

  // Ver detalle de mesa (mapa)
  async verMesaDetalle(mesaId) {
    const res = await API.getMesas();
    const mesa = res.data.find(m => m.id === mesaId);
    if (!mesa) return;
    const pedRes = await API.getPedidos({ mesa: mesa.numero });
    const pedidos = pedRes.data.filter(p => ["pendiente","en_preparacion","listo"].includes(p.estado));
    const pedidosHTML = pedidos.length > 0
      ? pedidos.map(p => `<div class="d-flex justify-content-between align-items-center py-2 border-bottom">
          <span>#${p.id} — ${p.items.length} plato(s)</span>
          <div class="d-flex gap-2 align-items-center">${badgeEstadoPedido(p.estado)} <span class="fw-bold">${fmt.moneda(p.total)}</span></div>
        </div>`).join("")
      : `<div class="text-muted text-center py-3">Sin pedidos activos</div>`;
    const estadoBg = { disponible: "#22c55e", ocupada: "#ef4444", reservada: "#f59e0b" };

    // Botones de acción según estado actual
    const accionesHTML = {
      disponible: `<button class="btn btn-danger" onclick="Mesas.ocuparMesa(${mesa.id},${mesa.numero});bootstrap.Modal.getInstance(document.querySelector('.modal.show'))?.hide()">
                     <i class="bi bi-person-fill me-2"></i>Marcar Ocupada</button>`,
      ocupada:    `<button class="btn btn-success" onclick="Mesas.liberarMesa(${mesa.id},${mesa.numero});bootstrap.Modal.getInstance(document.querySelector('.modal.show'))?.hide()">
                     <i class="bi bi-check-circle me-2"></i>Liberar Mesa</button>`,
      reservada:  `<div class="d-flex gap-2">
                     <button class="btn btn-primary" onclick="Mesas.confirmarLlegadaReserva(${mesa.id},${mesa.numero});bootstrap.Modal.getInstance(document.querySelector('.modal.show'))?.hide()">
                       <i class="bi bi-person-check me-2"></i>Confirmar Llegada</button>
                     <button class="btn btn-outline-danger" onclick="Mesas.liberarMesa(${mesa.id},${mesa.numero});bootstrap.Modal.getInstance(document.querySelector('.modal.show'))?.hide()">
                       Cancelar Reserva</button>
                   </div>`
    }[mesa.estado] || "";

    Modal.show({
      titulo: `Mesa ${mesa.numero}`,
      cuerpo: `
        <div class="d-flex align-items-center gap-3 mb-3">
          <span class="badge px-3 py-2 fs-6" style="background:${estadoBg[mesa.estado]||'#94a3b8'};color:#fff;">${mesa.estado}</span>
          <span class="text-muted"><i class="bi bi-people me-1"></i>${mesa.capacidad} personas · ${mesa.zona.replace(/_/g," ")}</span>
        </div>
        <h6 class="fw-bold mb-2">Pedidos activos</h6>
        ${pedidosHTML}`,
      pie: accionesHTML,
      size: "md"
    });
  },

  // Agregar al pedido (mesero)
  agregarAlPedido(id, nombre, precio, emoji) {
    if (!window._mesaSeleccionada) return Toast.warning("Primero selecciona una mesa");
    const existente = window._pedidoItems.find(i => i.platillo_id === id);
    if (existente) {
      existente.cantidad++;
    } else {
      window._pedidoItems.push({ platillo_id: id, nombre, precio, emoji, cantidad: 1, notas: "" });
    }
    this.actualizarResumenPedido();
    // Feedback visual en la carta
    Toast.info(`${emoji} ${nombre} agregado`);
  },

  // Actualizar resumen visual del pedido
  actualizarResumenPedido() {
    const cont = document.getElementById("items-pedido");
    const totalEl = document.getElementById("total-pedido");
    const badgeItems = document.getElementById("badge-items");
    const btnEnviar = document.getElementById("btn-enviar-pedido");
    if (!cont) return;

    if (window._pedidoItems.length === 0) {
      cont.innerHTML = `<div class="text-center py-4 text-muted"><i class="bi bi-cart-x display-5 d-block mb-2 opacity-50"></i><small>Agrega platillos desde la carta</small></div>`;
      if (totalEl) totalEl.textContent = fmt.moneda(0);
      if (badgeItems) badgeItems.textContent = "0 items";
      if (btnEnviar) btnEnviar.disabled = true;
      return;
    }

    let total = 0;
    const totalItems = window._pedidoItems.reduce((a, i) => a + i.cantidad, 0);
    const html = window._pedidoItems.map((item, i) => {
      const subtotal = item.precio * item.cantidad;
      total += subtotal;
      return `
        <div class="d-flex align-items-start gap-2 py-2 border-bottom">
          <span style="font-size:1.4rem;">${item.emoji}</span>
          <div class="flex-grow-1">
            <div class="fw-semibold" style="font-size:0.85rem;">${item.nombre}</div>
            <input type="text" class="form-control form-control-sm mt-1" placeholder="Sin sal, sin cebolla..."
              value="${item.notas}" oninput="Pages.actualizarNotas(${i}, this.value)" style="font-size:0.75rem;">
          </div>
          <div class="d-flex flex-column align-items-end gap-1">
            <div class="d-flex align-items-center gap-1">
              <button class="btn btn-xs btn-outline-secondary py-0 px-2" onclick="Pages.cambiarCantidad(${i},-1)" style="font-size:0.8rem;">−</button>
              <span class="fw-bold mx-1">${item.cantidad}</span>
              <button class="btn btn-xs btn-outline-secondary py-0 px-2" onclick="Pages.cambiarCantidad(${i},1)" style="font-size:0.8rem;">+</button>
            </div>
            <div class="fw-bold text-primary" style="font-size:0.85rem;">${fmt.moneda(subtotal)}</div>
            <button class="btn btn-link text-danger p-0" onclick="Pages.quitarItem(${i})" style="font-size:0.75rem;"><i class="bi bi-trash"></i></button>
          </div>
        </div>`;
    }).join("");
    cont.innerHTML = html;
    if (totalEl) totalEl.textContent = fmt.moneda(total);
    if (badgeItems) badgeItems.textContent = `${totalItems} item${totalItems !== 1 ? "s" : ""}`;
    if (btnEnviar) btnEnviar.disabled = false;
  },

  cambiarCantidad(idx, delta) {
    if (!window._pedidoItems[idx]) return;
    window._pedidoItems[idx].cantidad += delta;
    if (window._pedidoItems[idx].cantidad <= 0) window._pedidoItems.splice(idx, 1);
    this.actualizarResumenPedido();
  },

  quitarItem(idx) {
    window._pedidoItems.splice(idx, 1);
    this.actualizarResumenPedido();
  },

  actualizarNotas(idx, notas) {
    if (window._pedidoItems[idx]) window._pedidoItems[idx].notas = notas;
  },

  async confirmarPedido(mesero_id) {
    if (!window._pedidoItems || window._pedidoItems.length === 0) return Toast.warning("Agrega platillos al pedido");
    if (!window._mesaSeleccionada) return Toast.warning("Selecciona una mesa primero");
    const items = window._pedidoItems.map(i => ({ platillo_id: i.platillo_id, cantidad: i.cantidad, notas: i.notas }));
    // FIX: enviar el número de mesa (no el ID) para que coincida con los filtros de getPedidos
    const mesaNum = window._mesaSeleccionadaNum || window._mesaSeleccionada;
    const res = await API.createPedido({ mesa: mesaNum, mesero_id, items });
    if (res.status === 201) {
      // Marcar la mesa como ocupada automáticamente
      await API.cambiarEstadoMesa(window._mesaSeleccionada, "ocupada");
      Toast.success(`✅ Pedido #${res.data.id} enviado a cocina!`);
      window._pedidoItems = [];
      window._mesaSeleccionada = null;
      window._mesaSeleccionadaNum = null;
      App.navigate("pedidos");
    } else {
      Toast.error(res.message);
    }
  },

  buscarPlatillo(query) {
    document.querySelectorAll(".platillo-card").forEach(card => {
      const nombre = card.querySelector("h6")?.textContent.toLowerCase() || "";
      card.style.display = nombre.includes(query.toLowerCase()) ? "" : "none";
    });
  },

  filtrarPedidos: async (estado, cid, rol, userId) => {
    const filtros = rol === "mesero" ? { mesero_id: userId } : {};
    const res = await API.getPedidos(filtros);
    let pedidos = res.data;
    if (estado !== "todos") pedidos = pedidos.filter(p => p.estado === estado);
    const contenedor = document.getElementById("tabla-pedidos");
    if (contenedor) contenedor.innerHTML = crearTabla({
      columnas: [
        { campo: "id", titulo: "#", render: v => `<span class="fw-bold text-primary">#${v}</span>` },
        { campo: "mesa", titulo: "Mesa", render: v => `<span class="badge bg-secondary">Mesa ${v}</span>` },
        { campo: "total", titulo: "Total", render: v => fmt.moneda(v) },
        { campo: "estado", titulo: "Estado", render: v => badgeEstadoPedido(v) },
        { campo: "fecha", titulo: "Hora", render: v => fmt.hora(v) },
      ],
      datos: pedidos,
      vacio: "Sin pedidos con ese estado"
    });
  },

  // TURNO
  async iniciarTurno(cid, empleado_id) {
    const res = await API.tomarTurno(empleado_id);
    if (res.status === 201) {
      Toast.success("¡Turno iniciado!");
      renderPage("turno", cid);
    } else {
      Toast.error(res.message);
    }
  },

  terminarTurno(turno_id, cid, empleado_id) {
    Modal.confirm({
      titulo: "Terminar turno",
      mensaje: "¿Estás seguro de que deseas terminar tu turno?",
      onConfirm: async () => {
        // ── FIX BUG 2: Llamar API real para finalizar turno ──
        const res = await API.finalizarTurno(turno_id, empleado_id);
        if (res.status === 200) {
          Toast.success("Turno finalizado correctamente");
          // Re-renderizar la vista con estado actualizado
          await renderPage("turno", cid);
        } else {
          Toast.error(res.message || "Error al finalizar turno");
        }
      }
    });
  },

  // STOCK
  async actualizarStock(id, nombre) {
    Modal.show({
      titulo: `Agregar Stock: ${nombre}`,
      cuerpo: `
        <div class="mb-3">
          <label class="form-label fw-semibold">Cantidad a agregar</label>
          <input type="number" class="form-control" id="cantidad-stock" min="1" value="1">
        </div>`,
      pie: `
        <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
        <button class="btn btn-success" onclick="Pages._confirmActualizarStock(${id})">Confirmar</button>`,
      size: "sm"
    });
  },

  async _confirmActualizarStock(id) {
    const cantidad = parseInt(document.getElementById("cantidad-stock")?.value || 0);
    if (cantidad <= 0) return Toast.warning("Ingresa una cantidad válida");
    const res = await API.updateStock(id, cantidad);
    if (res.status === 200) {
      Toast.success(`Stock actualizado: ${res.data.nombre} = ${res.data.stock}`);
      bootstrap.Modal.getInstance(document.querySelector(".modal"))?.hide();
      App.navigate(App.currentPage);
    }
  },

  // SOLICITUDES PERSONAL
  async nuevaSolicitudPersonal(solicitante_id) {
    Modal.show({
      titulo: "Nueva Solicitud de Personal",
      cuerpo: `
        <div class="mb-3">
          <label class="form-label fw-semibold">Rol solicitado</label>
          <select class="form-select" id="sol-rol">
            <option value="mesero">Mesero</option>
            <option value="cocinero">Cocinero</option>
            <option value="portero">Portero</option>
          </select>
        </div>
        <div class="mb-3">
          <label class="form-label fw-semibold">Cantidad</label>
          <input type="number" class="form-control" id="sol-cantidad" min="1" value="1">
        </div>
        <div class="mb-3">
          <label class="form-label fw-semibold">Motivo</label>
          <textarea class="form-control" id="sol-motivo" rows="3" placeholder="Describe el motivo..."></textarea>
        </div>`,
      pie: `
        <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
        <button class="btn btn-primary" onclick="Pages._enviarSolicitudPersonal(${solicitante_id})">Enviar Solicitud</button>`,
      size: "md"
    });
  },

  async _enviarSolicitudPersonal(solicitante_id) {
    const rol = document.getElementById("sol-rol")?.value;
    const cantidad = parseInt(document.getElementById("sol-cantidad")?.value);
    const motivo = document.getElementById("sol-motivo")?.value;
    if (!motivo) return Toast.warning("Escribe el motivo");
    const res = await API.createSolicitudPersonal({ tipo: "contratacion", rol_solicitado: rol, cantidad, motivo, solicitante_id });
    if (res.status === 201) {
      Toast.success("Solicitud enviada exitosamente");
      bootstrap.Modal.getInstance(document.querySelector(".modal"))?.hide();
      App.navigate(App.currentPage);
    }
  },

  async aprobarSolicitudPersonal(id) {
    const res = await API.updateSolicitudPersonal(id, "aprobada");
    if (res.status === 200) { Toast.success("Solicitud aprobada"); App.navigate(App.currentPage); }
  },

  async rechazarSolicitudPersonal(id) {
    const res = await API.updateSolicitudPersonal(id, "rechazada");
    if (res.status === 200) { Toast.warning("Solicitud rechazada"); App.navigate(App.currentPage); }
  },

  async aprobarIngrediente(id) {
    const res = await API.updateSolicitudIngrediente(id, "aprobada");
    if (res.status === 200) { Toast.success("Ingrediente aprobado y stock actualizado"); App.navigate(App.currentPage); }
  },

  async rechazarIngrediente(id) {
    const res = await API.updateSolicitudIngrediente(id, "rechazada");
    if (res.status === 200) { Toast.warning("Solicitud rechazada"); App.navigate(App.currentPage); }
  },

  async nuevaSolicitudIngrediente(solicitante_id) {
    const stockRes = await API.getStock();
    const ingredientes = stockRes.data;
    const opts = ingredientes.map(i => `<option value="${i.id}">${i.nombre} (Stock: ${i.stock} ${i.unidad})</option>`).join("");

    Modal.show({
      titulo: "Solicitar Ingrediente",
      cuerpo: `
        <div class="mb-3">
          <label class="form-label fw-semibold">Ingrediente</label>
          <select class="form-select" id="ing-id">${opts}</select>
        </div>
        <div class="mb-3">
          <label class="form-label fw-semibold">Cantidad</label>
          <input type="number" class="form-control" id="ing-cantidad" min="1" value="5">
        </div>
        <div class="mb-3">
          <label class="form-label fw-semibold">Unidad</label>
          <input type="text" class="form-control" id="ing-unidad" placeholder="kg, litros, piezas...">
        </div>
        <div class="mb-3">
          <label class="form-label fw-semibold">Motivo</label>
          <textarea class="form-control" id="ing-motivo" rows="2" placeholder="Stock bajo, pedido especial..."></textarea>
        </div>`,
      pie: `
        <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
        <button class="btn btn-warning text-dark" onclick="Pages._enviarSolicitudIng(${solicitante_id})">Enviar</button>`,
      size: "md"
    });
  },

  async _enviarSolicitudIng(solicitante_id) {
    const ingrediente_id = parseInt(document.getElementById("ing-id")?.value);
    const cantidad = parseInt(document.getElementById("ing-cantidad")?.value);
    const unidad = document.getElementById("ing-unidad")?.value || "unidad";
    const motivo = document.getElementById("ing-motivo")?.value;
    if (!motivo) return Toast.warning("Escribe el motivo");
    const res = await API.createSolicitudIngrediente({ ingrediente_id, cantidad, unidad, motivo, solicitante_id });
    if (res.status === 201) {
      Toast.success("Solicitud enviada");
      bootstrap.Modal.getInstance(document.querySelector(".modal"))?.hide();
      App.navigate(App.currentPage);
    }
  },

  nuevaReservacion() {
    Modal.show({
      titulo: "Nueva Reservación de Mesa",
      cuerpo: `
        <div class="mb-3"><label class="form-label fw-semibold">Cliente</label>
        <input type="text" class="form-control" id="res-cliente" placeholder="Nombre del cliente o empresa"></div>
        <div class="mb-3"><label class="form-label fw-semibold">Fecha y Hora</label>
        <input type="datetime-local" class="form-control" id="res-fecha"></div>
        <div class="row g-2 mb-3">
          <div class="col-md-6"><label class="form-label fw-semibold">Número de personas</label>
          <input type="number" class="form-control" id="res-personas" min="1" max="20" value="2"></div>
          <div class="col-md-6"><label class="form-label fw-semibold">Mesa</label>
          <select class="form-select" id="res-mesa">${[1,2,3,4,5,6,7,8,9,10].map(n=>`<option value="${n}">Mesa ${n}</option>`).join("")}</select></div>
        </div>
        <div class="mb-3">
          <label class="form-label fw-semibold d-flex align-items-center gap-2">
            Abono requerido
            <span class="badge bg-warning text-dark">Recomendado para grupos +6 o empresas</span>
          </label>
          <div class="input-group">
            <select class="form-select" id="res-abono-pct" style="max-width:130px;">
              <option value="0">Sin abono</option>
              <option value="30">30%</option>
              <option value="50">50%</option>
              <option value="100">100% (prepago)</option>
            </select>
            <span class="input-group-text bg-light" id="res-abono-monto">$0</span>
          </div>
          <div class="form-text">El monto del abono se calcula en base al consumo promedio estimado por persona.</div>
        </div>
        <div class="mb-3"><label class="form-label fw-semibold">Notas</label>
        <input type="text" class="form-control" id="res-notas" placeholder="Cumpleaños, aniversario, reunión empresarial..."></div>`,
      pie: `
        <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
        <button class="btn btn-primary" onclick="Pages._guardarReservacion()">Guardar Reservación</button>`,
      size: "md",
      onShow: () => {
        // Calcular abono dinámicamente
        const calcAbono = () => {
          const personas = parseInt(document.getElementById("res-personas")?.value || 0);
          const pct = parseInt(document.getElementById("res-abono-pct")?.value || 0);
          const consumoPromedio = 7500; // CLP por persona
          const total = personas * consumoPromedio;
          const abono = Math.round(total * pct / 100);
          const el = document.getElementById("res-abono-monto");
          if (el) el.textContent = pct > 0 ? fmt.moneda(abono) : "$0";
        };
        setTimeout(() => {
          document.getElementById("res-personas")?.addEventListener("input", calcAbono);
          document.getElementById("res-abono-pct")?.addEventListener("change", calcAbono);
        }, 100);
      }
    });
  },

  async _guardarReservacion() {
    const cliente = document.getElementById("res-cliente")?.value;
    const fecha = document.getElementById("res-fecha")?.value;
    const personas = parseInt(document.getElementById("res-personas")?.value);
    const mesa_id = parseInt(document.getElementById("res-mesa")?.value);
    const notas = document.getElementById("res-notas")?.value;
    if (!cliente || !fecha) return Toast.warning("Completa los campos obligatorios");
    const res = await API.createReservacion({ tipo: "mesa", cliente, fecha: new Date(fecha).toISOString(), personas, mesa_id, notas, estado: "confirmada" });
    if (res.status === 201) {
      Toast.success("Reservación creada");
      bootstrap.Modal.getInstance(document.querySelector(".modal"))?.hide();
      App.navigate(App.currentPage);
    }
  },

  // ══════════════════════════════════════════════════════
  //  HORARIOS — Modal con selector de rango + auto-marcado
  // ══════════════════════════════════════════════════════
  nuevoHorario() {
    Pages._abrirModalHorario(null, null, null, null, null, null);
  },

  // Clic en celda vacía del calendario → pre-selecciona empleado y día
  nuevoHorarioDiaRapido(empId, empNombre, dia) {
    Pages._abrirModalHorario(empId, empNombre, dia, null, null, null);
  },

  // Clic en celda con horario → editar
  editarHorarioCelda(horarioId, empNombre, dia, entrada, salida, turno) {
    Pages._abrirModalHorario(null, empNombre, dia, entrada, salida, turno, horarioId);
  },

  async _abrirModalHorario(preEmpId, preEmpNombre, preDia, preEntrada, preSalida, preTurno, editId = null) {
    const esEdicion = !!editId;

    // Horas disponibles 06:00 – 02:00 (siguiente día)
    const HORAS = [];
    for (let h = 6; h <= 23; h++) HORAS.push(`${String(h).padStart(2,"0")}:00`);
    HORAS.push("00:00","01:00","02:00");

    // Colores por turno
    const TURNO_BG = {
      mañana: { bg:"#72c472", shadow:"#58a858", txt:"#fff" },
      tarde:  { bg:"#f5c842", shadow:"#d4a82a", txt:"#1e293b" },
      noche:  { bg:"#475569", shadow:"#334155", txt:"#fff" }
    };

    // Generar grilla de horas (círculos estilo calendario)
    const horasGrid = HORAS.map(h => `
      <div class="hor-celda text-center"
           data-hora="${h}"
           onclick="Pages._toggleHoraCelda('${h}')"
           style="cursor:pointer;padding:3px 2px;">
        <div class="hor-circulo"
             data-hora="${h}"
             style="width:42px;height:42px;border-radius:50%;
                    border:2.5px dashed #cbd5e1;background:#f8fafc;
                    display:inline-flex;flex-direction:column;
                    align-items:center;justify-content:center;
                    transition:all 0.18s;margin:0 auto;">
          <span style="font-size:0.62rem;font-weight:700;color:#94a3b8;line-height:1;">${h}</span>
        </div>
      </div>`).join("");

    Modal.show({
      titulo: esEdicion ? `✏️ Editar Horario — ${preEmpNombre}` : "➕ Agregar Turno",
      cuerpo: `
        <div class="row g-3 mb-3">
          <div class="col-md-6">
            <label class="form-label fw-semibold">Empleado</label>
            <select class="form-select" id="hor-emp-sel" ${esEdicion?'disabled':''}>
              <option value="">Selecciona empleado...</option>
            </select>
          </div>
          <div class="col-md-6">
            <label class="form-label fw-semibold">Día</label>
            <select class="form-select" id="hor-dia">
              ${["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"]
                .map(d=>`<option ${d===preDia?"selected":""}>${d}</option>`).join("")}
            </select>
          </div>
        </div>

        <!-- Selector de rango rápido -->
        <div class="mb-3 p-3 rounded-3" style="background:#f8fffe;border:1.5px solid #e2e8f0;">
          <label class="form-label fw-semibold mb-2">⏰ Selecciona rango de horas</label>
          <div class="row g-2 align-items-end">
            <div class="col-5">
              <label class="form-label" style="font-size:0.78rem;">Entrada</label>
              <select class="form-select form-select-sm" id="hor-entrada-sel"
                      onchange="Pages._autoMarcarRango()">
                ${HORAS.map(h=>`<option ${h===preEntrada?"selected":""}>${h}</option>`).join("")}
              </select>
            </div>
            <div class="col-2 text-center pb-1">
              <span class="fw-bold text-muted">→</span>
            </div>
            <div class="col-5">
              <label class="form-label" style="font-size:0.78rem;">Salida</label>
              <select class="form-select form-select-sm" id="hor-salida-sel"
                      onchange="Pages._autoMarcarRango()">
                ${HORAS.map(h=>`<option ${h===preSalida?"selected":""}>${h}</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="mt-2 text-center">
            <button class="btn btn-sm btn-outline-primary rounded-pill px-4"
                    onclick="Pages._autoMarcarRango()">
              <i class="bi bi-magic me-1"></i>Marcar automáticamente
            </button>
          </div>
        </div>

        <!-- Grilla visual de horas (círculos) -->
        <label class="form-label fw-semibold">
          Vista previa del turno
          <small class="text-muted fw-normal ms-2">(<span id="horas-count">0</span>h seleccionadas)</small>
        </label>
        <div style="background:#fff;border:1.5px solid #e2e8f0;border-radius:12px;padding:12px;">
          <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:4px;" id="horas-grid">
            ${horasGrid}
          </div>
        </div>

        <!-- Turno detectado automáticamente -->
        <div class="mt-3 d-flex align-items-center gap-3">
          <span class="text-muted fw-semibold" style="font-size:0.82rem;">Turno detectado:</span>
          <span id="turno-badge" class="badge px-3 py-2" style="font-size:0.8rem;">—</span>
          <span id="resumen-horas" class="text-muted" style="font-size:0.8rem;"></span>
        </div>`,
      pie: `
        <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
        <button class="btn btn-primary fw-semibold px-4" onclick="Pages._guardarHorario(${editId||'null'})">
          <i class="bi bi-calendar-check me-2"></i>${esEdicion?"Guardar Cambios":"Crear Turno"}
        </button>`,
      size: "lg",
      onShow: async () => {
        // FIX: inicializar siempre antes de cualquier uso para evitar race condition
        window._horasSeleccionadas = [];

        // Poblar selector de empleados con filtro de rol
        const usuarioActual = AuthService.getUsuario();
        const ROLES_PERMITIDOS = {
          jefe_meseros:  ["mesero","portero"],
          jefe_cocina:   ["cocinero"],
          administrador: null
        };
        const rolesPermitidos = ROLES_PERMITIDOS[usuarioActual?.rol] ?? null;
        const res = await API.getUsuarios();
        let empleados = res.data.filter(u => u.activo);
        if (rolesPermitidos !== null) empleados = empleados.filter(u => rolesPermitidos.includes(u.rol));

        const sel = document.getElementById("hor-emp-sel");
        if (sel) {
          sel.innerHTML = `<option value="">Selecciona empleado...</option>`;
          empleados.forEach(u => {
            const opt = document.createElement("option");
            opt.value = u.id;
            opt.textContent = `${u.nombre} (${AuthService.getNombreRol(u.rol)})`;
            if (u.id === preEmpId) opt.selected = true;
            sel.appendChild(opt);
          });
        }

        // Si hay rango pre-cargado (edición), marcar automáticamente
        if (preEntrada && preSalida) {
          setTimeout(() => Pages._autoMarcarRango(), 100);
        }
      }
    });
  },

  // Auto-marcar todas las horas del rango seleccionado
  _autoMarcarRango() {
    const entradaEl = document.getElementById("hor-entrada-sel");
    const salidaEl  = document.getElementById("hor-salida-sel");
    if (!entradaEl || !salidaEl) return;

    const entrada = entradaEl.value;
    const salida  = salidaEl.value;

    const HORAS = [];
    for (let h = 6; h <= 23; h++) HORAS.push(`${String(h).padStart(2,"0")}:00`);
    HORAS.push("00:00","01:00","02:00");

    const idxEntrada = HORAS.indexOf(entrada);
    const idxSalida  = HORAS.indexOf(salida);

    if (idxEntrada === -1 || idxSalida === -1 || idxEntrada === idxSalida) return;

    // Calcular rango (puede cruzar medianoche)
    let horasRango = [];
    if (idxSalida > idxEntrada) {
      horasRango = HORAS.slice(idxEntrada, idxSalida);
    } else {
      // Cruza medianoche
      horasRango = [...HORAS.slice(idxEntrada), ...HORAS.slice(0, idxSalida)];
    }

    // Límite 9 horas
    if (horasRango.length > 9) {
      horasRango = horasRango.slice(0, 9);
      Toast.warning("Se aplica el máximo de 9 horas");
    }

    window._horasSeleccionadas = [...horasRango];

    // Actualizar visual de círculos
    document.querySelectorAll(".hor-circulo").forEach(c => {
      const h = c.dataset.hora;
      const activo = window._horasSeleccionadas.includes(h);
      Pages._pintarCelda(c, activo, entrada);
    });

    Pages._actualizarResumenTurno();
  },

  _toggleHoraCelda(hora) {
    if (!window._horasSeleccionadas) window._horasSeleccionadas = [];
    const idx = window._horasSeleccionadas.indexOf(hora);
    const circulo = document.querySelector(`.hor-circulo[data-hora="${hora}"]`);

    if (idx === -1) {
      if (window._horasSeleccionadas.length >= 9) {
        Toast.warning("Máximo 9 horas por turno");
        return;
      }
      window._horasSeleccionadas.push(hora);
      if (circulo) Pages._pintarCelda(circulo, true, window._horasSeleccionadas[0]);
    } else {
      window._horasSeleccionadas.splice(idx, 1);
      if (circulo) Pages._pintarCelda(circulo, false, null);
    }
    Pages._actualizarResumenTurno();
  },

  _pintarCelda(circulo, activo, horaEntrada) {
    if (!circulo) return;
    const h = parseInt((horaEntrada||"06:00").split(":")[0]);
    let bg, shadow, txt;
    if (h >= 6 && h < 14)       { bg="#72c472"; shadow="#58a858"; txt="#fff"; }
    else if (h >= 14 && h < 22) { bg="#f5c842"; shadow="#d4a82a"; txt="#1e293b"; }
    else                         { bg="#475569"; shadow="#334155"; txt="#fff"; }

    if (activo) {
      circulo.style.background    = bg;
      circulo.style.border        = `2.5px solid ${bg}`;
      circulo.style.boxShadow     = `0 4px 0 ${shadow},0 6px 10px rgba(0,0,0,0.15)`;
      circulo.style.transform     = "scale(1.08)";
      const span = circulo.querySelector("span");
      if (span) { span.style.color = txt; span.style.textShadow = "0 1px 2px rgba(0,0,0,0.3)"; }
    } else {
      circulo.style.background    = "#f8fafc";
      circulo.style.border        = "2.5px dashed #cbd5e1";
      circulo.style.boxShadow     = "none";
      circulo.style.transform     = "scale(1)";
      const span = circulo.querySelector("span");
      if (span) { span.style.color = "#94a3b8"; span.style.textShadow = "none"; }
    }
  },

  _actualizarResumenTurno() {
    const sel   = window._horasSeleccionadas || [];
    const count = document.getElementById("horas-count");
    const badge = document.getElementById("turno-badge");
    const resumen = document.getElementById("resumen-horas");
    if (count) count.textContent = sel.length;

    if (sel.length === 0) {
      if (badge) { badge.textContent = "—"; badge.style.background="#e2e8f0"; badge.style.color="#475569"; }
      if (resumen) resumen.textContent = "";
      return;
    }

    const sorted   = [...sel].sort((a,b)=>{ const toMin=x=>{const[h,m]=x.split(":").map(Number);return h<6?h+24*60+m:h*60+m}; return toMin(a)-toMin(b); });
    const entrada  = sorted[0];
    const hNum     = parseInt(entrada.split(":")[0]);
    const turno    = hNum >= 6 && hNum < 14 ? "mañana" : hNum >= 14 && hNum < 22 ? "tarde" : "noche";
    const colores  = { mañana:["#72c472","#fff","☀️"], tarde:["#f5c842","#1e293b","🌤"], noche:["#475569","#fff","🌙"] };
    const [cbg, ctxt, emoji] = colores[turno];

    const ultH = parseInt(sorted[sorted.length-1].split(":")[0]);
    const salidaH = (ultH+1)%24;
    const salida  = `${String(salidaH).padStart(2,"0")}:00`;

    if (badge) { badge.textContent=`${emoji} ${turno}`; badge.style.background=cbg; badge.style.color=ctxt; badge.style.borderRadius="99px"; }
    if (resumen) resumen.textContent = `${entrada} → ${salida} · ${sel.length}h`;
  },

  async _guardarHorario(editId = null) {
    const empleado_id = parseInt(document.getElementById("hor-emp-sel")?.value);
    const dia         = document.getElementById("hor-dia")?.value;
    const horas       = window._horasSeleccionadas || [];

    if (!empleado_id) return Toast.warning("Selecciona un empleado");
    if (!dia)         return Toast.warning("Selecciona un día");
    if (horas.length === 0) return Toast.warning("Selecciona al menos una hora");

    const sorted  = [...horas].sort((a,b)=>{ const toMin=x=>{const[h,m]=x.split(":").map(Number);return h<6?h+24*60+m:h*60+m}; return toMin(a)-toMin(b); });
    const entrada = sorted[0];
    const ultH    = parseInt(sorted[sorted.length-1].split(":")[0]);
    const salidaH = (ultH+1)%24;
    const salida  = `${String(salidaH).padStart(2,"0")}:00`;
    const hNum    = parseInt(entrada.split(":")[0]);
    const turno   = hNum>=6&&hNum<14 ? "mañana" : hNum>=14&&hNum<22 ? "tarde" : "noche";

    let res;
    if (editId) {
      res = await API.updateHorario(editId, { empleado_id, dia, entrada, salida, turno });
    } else {
      res = await API.createHorario({ empleado_id, dia, entrada, salida, turno, semana:"2024-W03" });
    }

    if (res.status === 201 || res.status === 200) {
      Toast.success(`✅ Turno ${editId?"actualizado":"creado"}: ${dia} ${entrada}–${salida} (${horas.length}h)`);
      bootstrap.Modal.getInstance(document.querySelector(".modal.show"))?.hide();
      App.navigate(App.currentPage);
    } else {
      Toast.error(res.message || "Error al guardar horario");
    }
  },

  // Finanzas
  cargarFinanzas(periodo) {
    document.querySelectorAll(".periodo-btn").forEach(b => {
      b.classList.toggle("btn-primary", b.dataset.periodo === periodo);
      b.classList.toggle("btn-outline-secondary", b.dataset.periodo !== periodo);
    });
    cargarDatosFinanzas(periodo);
  },

  // ── CRUD USUARIOS ──
  nuevoUsuario() {
    Modal.show({
      titulo: "Nuevo Usuario",
      cuerpo: `
        <div class="row g-3">
          <div class="col-12"><label class="form-label fw-semibold">Nombre completo</label>
            <input type="text" class="form-control" id="u-nombre" placeholder="Ej: Juan Pérez"></div>
          <div class="col-12"><label class="form-label fw-semibold">Email</label>
            <input type="email" class="form-control" id="u-email" placeholder="juan@restaurante.com"></div>
          <div class="col-md-6"><label class="form-label fw-semibold">Contraseña</label>
            <input type="password" class="form-control" id="u-pass" placeholder="Mínimo 6 caracteres"></div>
          <div class="col-md-6"><label class="form-label fw-semibold">Rol</label>
            <select class="form-select" id="u-rol">
              <option value="mesero">Mesero</option>
              <option value="cocinero">Cocinero</option>
              <option value="portero">Portero / Recepcionista</option>
              <option value="jefe_meseros">Jefe de Meseros</option>
              <option value="jefe_cocina">Jefe de Cocina</option>
              <option value="dueno">Dueño</option>
              <option value="administrador">Administrador</option>
            </select></div>
        </div>`,
      pie: `<button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button class="btn btn-primary" onclick="Pages._guardarNuevoUsuario()"><i class="bi bi-person-plus me-2"></i>Crear Usuario</button>`,
      size: "md"
    });
  },

  async _guardarNuevoUsuario() {
    const nombre   = document.getElementById("u-nombre")?.value?.trim();
    const email    = document.getElementById("u-email")?.value?.trim();
    const password = document.getElementById("u-pass")?.value;
    const rol      = document.getElementById("u-rol")?.value;
    if (!nombre || !email || !password) return Toast.warning("Completa todos los campos obligatorios");
    if (password.length < 6) return Toast.warning("La contraseña debe tener al menos 6 caracteres");
    const avatar = nombre.split(" ").map(p => p[0]).join("").slice(0,2).toUpperCase();
    const res = await API.createUsuario({ nombre, email, password, rol, avatar });
    if (res.status === 201) {
      Toast.success(`✅ Usuario "${nombre}" creado exitosamente`);
      bootstrap.Modal.getInstance(document.querySelector(".modal.show"))?.hide();
      App.navigate(App.currentPage);
    } else {
      Toast.error(res.message);
    }
  },

  async editarUsuario(id) {
    const res = await API.getUsuarios();
    const u = res.data.find(x => x.id === id);
    if (!u) return Toast.error("Usuario no encontrado");
    Modal.show({
      titulo: `Editar Usuario — ${u.nombre}`,
      cuerpo: `
        <div class="row g-3">
          <div class="col-12"><label class="form-label fw-semibold">Nombre completo</label>
            <input type="text" class="form-control" id="eu-nombre" value="${u.nombre}"></div>
          <div class="col-12"><label class="form-label fw-semibold">Email</label>
            <input type="email" class="form-control" id="eu-email" value="${u.email}"></div>
          <div class="col-md-6"><label class="form-label fw-semibold">Nueva contraseña <small class="text-muted">(dejar vacío para no cambiar)</small></label>
            <input type="password" class="form-control" id="eu-pass" placeholder="••••••••"></div>
          <div class="col-md-6"><label class="form-label fw-semibold">Rol</label>
            <select class="form-select" id="eu-rol">
              ${["mesero","cocinero","portero","jefe_meseros","jefe_cocina","dueno","administrador"].map(r =>
                `<option value="${r}" ${u.rol===r?"selected":""}>${AuthService.getNombreRol(r)}</option>`).join("")}
            </select></div>
          <div class="col-12"><label class="form-label fw-semibold">Estado</label>
            <select class="form-select" id="eu-activo">
              <option value="true" ${u.activo?"selected":""}>Activo</option>
              <option value="false" ${!u.activo?"selected":""}>Inactivo</option>
            </select></div>
        </div>`,
      pie: `<button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button class="btn btn-primary" onclick="Pages._guardarEdicionUsuario(${id})"><i class="bi bi-save me-2"></i>Guardar Cambios</button>`,
      size: "md"
    });
  },

  async _guardarEdicionUsuario(id) {
    const nombre  = document.getElementById("eu-nombre")?.value?.trim();
    const email   = document.getElementById("eu-email")?.value?.trim();
    const pass    = document.getElementById("eu-pass")?.value;
    const rol     = document.getElementById("eu-rol")?.value;
    const activo  = document.getElementById("eu-activo")?.value === "true";
    if (!nombre || !email) return Toast.warning("Nombre y email son obligatorios");
    const datos = { nombre, email, rol, activo };
    if (pass) datos.password = pass;
    const res = await API.updateUsuario(id, datos);
    if (res.status === 200) {
      Toast.success("✅ Usuario actualizado correctamente");
      bootstrap.Modal.getInstance(document.querySelector(".modal.show"))?.hide();
      App.navigate(App.currentPage);
    } else {
      Toast.error(res.message);
    }
  },

  eliminarUsuario(id) {
    Modal.confirm({
      titulo: "Desactivar usuario",
      mensaje: "El usuario no podrá iniciar sesión. ¿Confirmar?",
      onConfirm: async () => {
        const res = await API.deleteUsuario(id);
        if (res.status === 200) { Toast.success("Usuario desactivado"); App.navigate(App.currentPage); }
        else Toast.error(res.message);
      }
    });
  },

  // ── CRUD PLATILLOS ──
  nuevoPlatillo() {
    Modal.show({
      titulo: "Nuevo Platillo",
      cuerpo: `
        <div class="row g-3">
          <div class="col-md-8"><label class="form-label fw-semibold">Nombre</label>
            <input type="text" class="form-control" id="pl-nombre" placeholder="Ej: Cazuela de Vacuno"></div>
          <div class="col-md-4"><label class="form-label fw-semibold">Emoji</label>
            <input type="text" class="form-control" id="pl-emoji" placeholder="🍲" maxlength="2"></div>
          <div class="col-12"><label class="form-label fw-semibold">Descripción</label>
            <input type="text" class="form-control" id="pl-desc" placeholder="Descripción breve"></div>
          <div class="col-md-4"><label class="form-label fw-semibold">Precio (CLP)</label>
            <input type="number" class="form-control" id="pl-precio" min="0" placeholder="5900"></div>
          <div class="col-md-4"><label class="form-label fw-semibold">Categoría</label>
            <select class="form-select" id="pl-cat">
              <option>Entradas</option><option>Sopas</option><option>Platos Fuertes</option>
              <option>Postres</option><option>Bebidas</option>
            </select></div>
          <div class="col-md-4"><label class="form-label fw-semibold">Tiempo prep. (min)</label>
            <input type="number" class="form-control" id="pl-tiempo" min="1" value="15"></div>
        </div>`,
      pie: `<button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button class="btn btn-primary" onclick="Pages._guardarNuevoPlatillo()"><i class="bi bi-plus me-2"></i>Crear Platillo</button>`,
      size: "lg"
    });
  },

  async _guardarNuevoPlatillo() {
    const nombre = document.getElementById("pl-nombre")?.value?.trim();
    const imagen = document.getElementById("pl-emoji")?.value || "🍽️";
    const descripcion = document.getElementById("pl-desc")?.value?.trim();
    const precio = parseInt(document.getElementById("pl-precio")?.value);
    const categoria = document.getElementById("pl-cat")?.value;
    const tiempo_prep = parseInt(document.getElementById("pl-tiempo")?.value);
    if (!nombre || !precio) return Toast.warning("Nombre y precio son obligatorios");
    const res = await API.createPlatillo({ nombre, imagen, descripcion, precio, categoria, tiempo_prep, ingredientes: [] });
    if (res.status === 201) {
      Toast.success(`✅ Platillo "${nombre}" creado`);
      bootstrap.Modal.getInstance(document.querySelector(".modal.show"))?.hide();
      App.navigate(App.currentPage);
    }
  },

  editarPlatillo(id) { Toast.info(`Próximamente: editar platillo #${id}`); },

  eliminarPlatillo(id) {
    Modal.confirm({
      titulo: "Eliminar platillo",
      mensaje: "El platillo quedará inactivo. ¿Confirmar?",
      onConfirm: async () => { await API.deletePlatillo(id); Toast.success("Platillo eliminado"); App.navigate(App.currentPage); }
    });
  },

  // ── CRUD INGREDIENTES ──
  nuevoIngrediente() {
    Modal.show({
      titulo: "Nuevo Ingrediente",
      cuerpo: `
        <div class="row g-3">
          <div class="col-md-8"><label class="form-label fw-semibold">Nombre</label>
            <input type="text" class="form-control" id="ing-n-nombre" placeholder="Ej: Merkén"></div>
          <div class="col-md-4"><label class="form-label fw-semibold">Categoría</label>
            <select class="form-select" id="ing-n-cat">
              <option>Carnes</option><option>Verduras</option><option>Lácteos</option>
              <option>Granos</option><option>Especias</option><option>Frutas</option>
              <option>Mariscos</option><option>Dulces</option><option>Caldos</option>
            </select></div>
          <div class="col-md-4"><label class="form-label fw-semibold">Stock inicial</label>
            <input type="number" class="form-control" id="ing-n-stock" min="0" value="0"></div>
          <div class="col-md-4"><label class="form-label fw-semibold">Stock mínimo</label>
            <input type="number" class="form-control" id="ing-n-minimo" min="0" value="1"></div>
          <div class="col-md-4"><label class="form-label fw-semibold">Unidad</label>
            <select class="form-select" id="ing-n-unidad">
              <option>kg</option><option>litro</option><option>unidad</option>
              <option>paquete</option><option>lata</option><option>ml</option>
            </select></div>
          <div class="col-12"><label class="form-label fw-semibold">Precio unitario (CLP)</label>
            <input type="number" class="form-control" id="ing-n-precio" min="0" placeholder="1500"></div>
        </div>`,
      pie: `<button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button class="btn btn-success" onclick="Pages._guardarNuevoIngrediente()"><i class="bi bi-plus me-2"></i>Crear Ingrediente</button>`,
      size: "md"
    });
  },

  async _guardarNuevoIngrediente() {
    const nombre = document.getElementById("ing-n-nombre")?.value?.trim();
    const categoria = document.getElementById("ing-n-cat")?.value;
    const stock = parseInt(document.getElementById("ing-n-stock")?.value);
    const stock_minimo = parseInt(document.getElementById("ing-n-minimo")?.value);
    const unidad = document.getElementById("ing-n-unidad")?.value;
    const precio_unitario = parseInt(document.getElementById("ing-n-precio")?.value);
    if (!nombre) return Toast.warning("El nombre es obligatorio");
    const res = await API.createIngrediente({ nombre, categoria, stock, stock_minimo, unidad, precio_unitario });
    if (res.status === 201) {
      Toast.success(`✅ Ingrediente "${nombre}" creado`);
      bootstrap.Modal.getInstance(document.querySelector(".modal.show"))?.hide();
      App.navigate(App.currentPage);
    }
  },

  editarIngrediente(id) { Toast.info(`Próximamente: editar ingrediente #${id}`); },
};

// ══════════════════════════════════════════════════════
//  GESTIÓN DE MESAS — Acciones de estado (PageActions)
// ══════════════════════════════════════════════════════
export const MesaActions = {

  /**
   * Mesero selecciona mesa para nuevo pedido.
   * Solo funciona si la mesa está en estado "disponible" u "ocupada".
   */
  async ocuparMesa(mesaId, mesaNum) {
    const usuario = AuthService.getUsuario();
    Modal.confirm({
      titulo:  `Ocupar Mesa ${mesaNum}`,
      mensaje: `¿Marcar la Mesa ${mesaNum} como ocupada?`,
      onConfirm: async () => {
        const res = await ejecutarAccionMesa(mesaId, "ocupar_sin_reserva", usuario.rol);
        if (res.status === 200) {
          Toast.success(`Mesa ${mesaNum} marcada como ocupada`);
          App.navigate(App.currentPage);
        } else {
          Toast.error(res.message);
        }
      },
    });
  },

  /**
   * Solo portero puede liberar mesa.
   * La API valida que no existan pedidos activos antes de permitirlo.
   */
  async liberarMesa(mesaId, mesaNum) {
    const usuario = AuthService.getUsuario();
    Modal.confirm({
      titulo:  `Liberar Mesa ${mesaNum}`,
      mensaje: `¿Confirmar que la Mesa ${mesaNum} está libre y lista para nuevos clientes?`,
      onConfirm: async () => {
        const res = await ejecutarAccionMesa(mesaId, "liberar_mesa", usuario.rol);
        if (res.status === 200) {
          Toast.success(`Mesa ${mesaNum} liberada ✔`);
          App.navigate(App.currentPage);
        } else {
          // Error claro: hay pedidos activos
          Toast.error(`No se puede liberar: ${res.message}`);
        }
      },
    });
  },

  async confirmarLlegadaReserva(mesaId, mesaNum) {
    const usuario = AuthService.getUsuario();
    Modal.confirm({
      titulo:  `Confirmar llegada — Mesa ${mesaNum}`,
      mensaje: `¿El grupo reservado llegó? Esto cambiará la mesa a "ocupada".`,
      onConfirm: async () => {
        const res = await ejecutarAccionMesa(mesaId, "confirmar_llegada", usuario.rol);
        if (res.status === 200) {
          Toast.success(`Mesa ${mesaNum}: reserva confirmada, mesa ocupada`);
          App.navigate(App.currentPage);
        } else {
          Toast.error(res.message);
        }
      },
    });
  },
};

// ══════════════════════════════════════════════════════
//  POLLING — Sincronización entre sesiones (mock)
//  En producción esto sería WebSocket o SSE
// ══════════════════════════════════════════════════════
export const SyncService = {
  _intervalId: null,
  _lastTimestamp: null,
  _badgeCallback: null,

  // Iniciar polling cada N segundos
  start(intervalMs = 8000, onUpdate = null) {
    this.stop(); // evitar doble intervalo
    this._badgeCallback = onUpdate;
    this._poll(); // primera llamada inmediata
    this._intervalId = setInterval(() => this._poll(), intervalMs);
    console.log(`[Sync] Polling iniciado cada ${intervalMs/1000}s`);
  },

  stop() {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  },

  async _poll() {
    try {
      const res = await API.getSyncData(this._lastTimestamp);
      if (res.status === 200) {
        this._lastTimestamp = res.data.timestamp;
        // Actualizar badge de pedidos pendientes en topbar
        const badge = document.getElementById("notif-badge");
        if (badge) {
          const count = res.data.pedidos_pendientes;
          badge.textContent = count > 0 ? count : "";
          badge.style.display = count > 0 ? "" : "none";
        }
        // Callback externo (para refrescar vistas activas)
        if (this._badgeCallback) this._badgeCallback(res.data);
      }
    } catch (e) {
      console.warn("[Sync] Error en polling:", e.message);
    }
  }
};

export { cargarDatosFinanzas };
