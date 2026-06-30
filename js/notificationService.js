/**
 * ══════════════════════════════════════════════════════
 *  RESTAUROS — CENTRO DE NOTIFICACIONES
 *  Archivo: js/notificationService.js
 *
 *  v2 — Persistente, filtrable, multi-pestaña.
 *
 *  Cambios vs v1:
 *    • Persistencia real en localStorage (clave RESTOS_NOTIFS)
 *      en vez de array en memoria — sobrevive a refresh y
 *      se comparte entre pestañas del mismo navegador.
 *    • Categorías por tipo de notificación (para el filtro
 *      del panel: pedidos | mesas | reservas | personal |
 *      stock | finanzas | sistema).
 *    • Sincronización entre pestañas vía evento "storage".
 *    • API ampliada: eliminarNotificacion, contarPorCategoria,
 *      timestamp relativo (tiempoRelativo).
 *    • Diseñado 1:1 con la futura tabla MySQL `notificaciones`
 *      (ver README) — cuando se migre a Node/Express, este
 *      archivo se convierte en un repositorio que pega a
 *      GET/POST /api/notificaciones en vez de localStorage.
 * ══════════════════════════════════════════════════════
 */

import { NOTIF_TIPOS } from './businessLogic.js';

// ─────────────────────────────────────────────────────
//  CONFIG / CONSTANTES
// ─────────────────────────────────────────────────────

const STORAGE_KEY = "RESTOS_NOTIFS";
const STORAGE_SEQ  = "RESTOS_NOTIFS_SEQ";
const MAX_NOTIFS    = 300; // tope de historial guardado (evita crecer infinito)

// Categoría por tipo — controla el filtro del panel.
// En MySQL futuro: columna `categoria` ENUM en la tabla notificaciones.
const CATEGORIA_POR_TIPO = {
  // Pedidos
  [NOTIF_TIPOS.PEDIDO_CREADO]:        "pedidos",
  [NOTIF_TIPOS.PEDIDO_EN_COCINA]:     "pedidos",
  [NOTIF_TIPOS.PEDIDO_URGENTE]:       "pedidos",
  [NOTIF_TIPOS.PEDIDO_MODIFICADO]:    "pedidos",
  [NOTIF_TIPOS.PEDIDO_LISTO]:         "pedidos",
  [NOTIF_TIPOS.PEDIDO_RETIRADO]:      "pedidos",
  [NOTIF_TIPOS.PEDIDO_ENTREGADO]:     "pedidos",
  [NOTIF_TIPOS.PEDIDO_RETRASADO]:     "pedidos",
  [NOTIF_TIPOS.PEDIDO_CANCELADO]:     "pedidos",
  // Mesas / cuentas
  [NOTIF_TIPOS.MESA_SOLICITA_ATENCION]: "mesas",
  [NOTIF_TIPOS.CUENTA_SOLICITADA]:      "mesas",
  [NOTIF_TIPOS.CUENTA_PAGADA]:          "mesas",
  [NOTIF_TIPOS.MESA_LIBERABLE]:         "mesas",
  [NOTIF_TIPOS.MESA_LIBERADA]:          "mesas",
  [NOTIF_TIPOS.MESA_OCUPADA_LARGO]:     "mesas",
  // Reservas
  [NOTIF_TIPOS.RESERVA_NUEVA]:          "reservas",
  [NOTIF_TIPOS.RESERVA_ASIGNADA]:       "reservas",
  [NOTIF_TIPOS.RESERVA_CLIENTE_LLEGO]:  "reservas",
  [NOTIF_TIPOS.RESERVA_PROXIMA]:        "reservas",
  [NOTIF_TIPOS.RESERVA_PLATILLO]:       "reservas",
  [NOTIF_TIPOS.RESERVA_IMPORTANTE]:     "reservas",
  // Turnos / horarios / personal
  [NOTIF_TIPOS.HORARIO_APROBADO]:       "personal",
  [NOTIF_TIPOS.TURNO_INICIADO]:         "personal",
  [NOTIF_TIPOS.TURNO_FINALIZADO]:       "personal",
  [NOTIF_TIPOS.TURNO_30MIN]:            "personal",
  [NOTIF_TIPOS.TURNO_15MIN]:            "personal",
  [NOTIF_TIPOS.TURNO_PROXIMO_INICIO]:   "personal",
  [NOTIF_TIPOS.HORAS_EXTRA]:            "personal",
  [NOTIF_TIPOS.SOLICITUD_PERSONAL]:     "personal",
  [NOTIF_TIPOS.CONTRATACION_PENDIENTE]: "personal",
  [NOTIF_TIPOS.CONTRATACION_APROBADA]:  "personal",
  [NOTIF_TIPOS.CONTRATACION_RECHAZADA]: "personal",
  [NOTIF_TIPOS.PROBLEMA_REPORTADO]:     "personal",
  [NOTIF_TIPOS.APOYO_RECEPCION]:        "personal",
  // Stock / ingredientes
  [NOTIF_TIPOS.SOLICITUD_INGREDIENTES]:       "stock",
  [NOTIF_TIPOS.SOLICITUD_INGREDIENTES_APROB]: "stock",
  [NOTIF_TIPOS.SOLICITUD_INGREDIENTES_RECH]:  "stock",
  [NOTIF_TIPOS.STOCK_CRITICO]:                "stock",
  [NOTIF_TIPOS.STOCK_PROXIMO_AGOTAR]:         "stock",
  // Finanzas
  [NOTIF_TIPOS.VENTAS_RECORD]:    "finanzas",
  [NOTIF_TIPOS.VENTAS_CAIDA]:     "finanzas",
  [NOTIF_TIPOS.RESUMEN_DIARIO]:   "finanzas",
  [NOTIF_TIPOS.RESUMEN_SEMANAL]:  "finanzas",
  // Sistema / admin
  [NOTIF_TIPOS.ERROR_SISTEMA]:      "sistema",
  [NOTIF_TIPOS.USUARIO_BLOQUEADO]:  "sistema",
  [NOTIF_TIPOS.USUARIO_CREADO]:     "sistema",
  [NOTIF_TIPOS.USUARIO_ELIMINADO]:  "sistema",
  [NOTIF_TIPOS.PERMISOS_CAMBIADOS]: "sistema",
  [NOTIF_TIPOS.RESPALDO_GENERADO]:  "sistema",
  // Cliente
  [NOTIF_TIPOS.CLIENTE_ESPERANDO]:  "mesas",
};

// Icono + color por tipo (usado en el panel)
const ICONO_POR_TIPO = {
  [NOTIF_TIPOS.PEDIDO_CREADO]:        { icon: "bi-receipt",               color: "primary" },
  [NOTIF_TIPOS.PEDIDO_EN_COCINA]:     { icon: "bi-fire",                  color: "warning" },
  [NOTIF_TIPOS.PEDIDO_URGENTE]:       { icon: "bi-exclamation-triangle-fill", color: "danger" },
  [NOTIF_TIPOS.PEDIDO_MODIFICADO]:    { icon: "bi-pencil-fill",           color: "info" },
  [NOTIF_TIPOS.PEDIDO_LISTO]:         { icon: "bi-check-circle-fill",     color: "success" },
  [NOTIF_TIPOS.PEDIDO_RETIRADO]:      { icon: "bi-bag-fill",              color: "primary" },
  [NOTIF_TIPOS.PEDIDO_ENTREGADO]:     { icon: "bi-bag-check-fill",        color: "info" },
  [NOTIF_TIPOS.PEDIDO_RETRASADO]:     { icon: "bi-hourglass-split",       color: "danger" },
  [NOTIF_TIPOS.PEDIDO_CANCELADO]:     { icon: "bi-x-circle-fill",         color: "danger" },

  [NOTIF_TIPOS.MESA_SOLICITA_ATENCION]: { icon: "bi-hand-index-thumb-fill", color: "warning" },
  [NOTIF_TIPOS.CUENTA_SOLICITADA]:      { icon: "bi-credit-card-fill",      color: "dark" },
  [NOTIF_TIPOS.CUENTA_PAGADA]:          { icon: "bi-cash-coin",             color: "success" },
  [NOTIF_TIPOS.MESA_LIBERABLE]:         { icon: "bi-grid-3x3-gap-fill",     color: "primary" },
  [NOTIF_TIPOS.MESA_LIBERADA]:          { icon: "bi-check2-square",         color: "success" },
  [NOTIF_TIPOS.MESA_OCUPADA_LARGO]:     { icon: "bi-clock-history",         color: "warning" },

  [NOTIF_TIPOS.RESERVA_NUEVA]:          { icon: "bi-bookmark-plus-fill",    color: "primary" },
  [NOTIF_TIPOS.RESERVA_ASIGNADA]:       { icon: "bi-bookmark-star-fill",    color: "primary" },
  [NOTIF_TIPOS.RESERVA_CLIENTE_LLEGO]:  { icon: "bi-person-check-fill",     color: "success" },
  [NOTIF_TIPOS.RESERVA_PROXIMA]:        { icon: "bi-alarm-fill",            color: "warning" },
  [NOTIF_TIPOS.RESERVA_PLATILLO]:       { icon: "bi-bookmark-fill",         color: "info" },
  [NOTIF_TIPOS.RESERVA_IMPORTANTE]:     { icon: "bi-star-fill",             color: "warning" },

  [NOTIF_TIPOS.HORARIO_APROBADO]:       { icon: "bi-calendar-check-fill",   color: "success" },
  [NOTIF_TIPOS.TURNO_INICIADO]:         { icon: "bi-box-arrow-in-right",    color: "success" },
  [NOTIF_TIPOS.TURNO_FINALIZADO]:       { icon: "bi-box-arrow-right",       color: "secondary" },
  [NOTIF_TIPOS.TURNO_30MIN]:            { icon: "bi-clock-fill",            color: "warning" },
  [NOTIF_TIPOS.TURNO_15MIN]:            { icon: "bi-clock-fill",            color: "danger" },
  [NOTIF_TIPOS.TURNO_PROXIMO_INICIO]:   { icon: "bi-alarm",                 color: "info" },
  [NOTIF_TIPOS.HORAS_EXTRA]:            { icon: "bi-stopwatch-fill",        color: "warning" },
  [NOTIF_TIPOS.SOLICITUD_PERSONAL]:     { icon: "bi-person-plus-fill",      color: "primary" },
  [NOTIF_TIPOS.CONTRATACION_PENDIENTE]: { icon: "bi-person-plus-fill",      color: "warning" },
  [NOTIF_TIPOS.CONTRATACION_APROBADA]:  { icon: "bi-person-check-fill",     color: "success" },
  [NOTIF_TIPOS.CONTRATACION_RECHAZADA]: { icon: "bi-person-x-fill",         color: "danger" },
  [NOTIF_TIPOS.PROBLEMA_REPORTADO]:     { icon: "bi-flag-fill",             color: "danger" },
  [NOTIF_TIPOS.APOYO_RECEPCION]:        { icon: "bi-life-preserver",        color: "warning" },

  [NOTIF_TIPOS.SOLICITUD_INGREDIENTES]:       { icon: "bi-cart-plus-fill",  color: "primary" },
  [NOTIF_TIPOS.SOLICITUD_INGREDIENTES_APROB]: { icon: "bi-check-circle-fill", color: "success" },
  [NOTIF_TIPOS.SOLICITUD_INGREDIENTES_RECH]:  { icon: "bi-x-circle-fill",   color: "danger" },
  [NOTIF_TIPOS.STOCK_CRITICO]:                { icon: "bi-exclamation-octagon-fill", color: "danger" },
  [NOTIF_TIPOS.STOCK_PROXIMO_AGOTAR]:         { icon: "bi-graph-down",      color: "warning" },

  [NOTIF_TIPOS.VENTAS_RECORD]:    { icon: "bi-trophy-fill",       color: "success" },
  [NOTIF_TIPOS.VENTAS_CAIDA]:     { icon: "bi-graph-down-arrow",  color: "danger" },
  [NOTIF_TIPOS.RESUMEN_DIARIO]:   { icon: "bi-file-earmark-bar-graph-fill", color: "info" },
  [NOTIF_TIPOS.RESUMEN_SEMANAL]:  { icon: "bi-calendar-week-fill", color: "info" },

  [NOTIF_TIPOS.ERROR_SISTEMA]:      { icon: "bi-bug-fill",          color: "danger" },
  [NOTIF_TIPOS.USUARIO_BLOQUEADO]:  { icon: "bi-lock-fill",         color: "danger" },
  [NOTIF_TIPOS.USUARIO_CREADO]:     { icon: "bi-person-plus-fill",  color: "success" },
  [NOTIF_TIPOS.USUARIO_ELIMINADO]:  { icon: "bi-person-dash-fill",  color: "secondary" },
  [NOTIF_TIPOS.PERMISOS_CAMBIADOS]: { icon: "bi-shield-lock-fill",  color: "warning" },
  [NOTIF_TIPOS.RESPALDO_GENERADO]:  { icon: "bi-cloud-check-fill",  color: "success" },

  [NOTIF_TIPOS.CLIENTE_ESPERANDO]:  { icon: "bi-person-raised-hand", color: "warning" },
};

const CATEGORIAS_LABEL = {
  pedidos:   { label: "Pedidos",       icon: "bi-receipt-cutoff" },
  mesas:     { label: "Mesas",         icon: "bi-grid-3x3-gap-fill" },
  reservas:  { label: "Reservas",      icon: "bi-bookmark-star-fill" },
  personal:  { label: "Personal",      icon: "bi-people-fill" },
  stock:     { label: "Stock",         icon: "bi-boxes" },
  finanzas:  { label: "Finanzas",      icon: "bi-bar-chart-fill" },
  sistema:   { label: "Sistema",       icon: "bi-gear-fill" },
};

// ─────────────────────────────────────────────────────
//  PERSISTENCIA — localStorage
//  (En Node+MySQL: estas dos funciones se reemplazan por
//   SELECT * FROM notificaciones / fetch a /api/notificaciones)
// ─────────────────────────────────────────────────────

function _leerStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

function _guardarStore(store) {
  try {
    // Recorte de historial para no crecer indefinidamente
    const recortado = store.length > MAX_NOTIFS
      ? store.slice(store.length - MAX_NOTIFS)
      : store;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recortado));
  } catch (_) {
    // Cuota excedida u otro error de storage — fallar en silencio,
    // la notificación ya se mostró como toast aunque no persista.
  }
}

function _siguienteId() {
  let seq = parseInt(localStorage.getItem(STORAGE_SEQ) || "0", 10);
  seq += 1;
  localStorage.setItem(STORAGE_SEQ, String(seq));
  return seq;
}

const _listeners = new Set();

function _emitir(evento, payload) {
  _listeners.forEach(fn => {
    try { fn(evento, payload); } catch (_) {}
  });
}

// Sincronización entre pestañas: si otra pestaña escribe en
// localStorage, esta pestaña refresca su badge/panel.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) {
      _emitir("sync_externo", null);
    }
  });
}

// ─────────────────────────────────────────────────────
//  TIMESTAMP RELATIVO
// ─────────────────────────────────────────────────────

function tiempoRelativo(iso) {
  const ahora = Date.now();
  const t = new Date(iso).getTime();
  const diffSeg = Math.max(0, Math.floor((ahora - t) / 1000));

  if (diffSeg < 10) return "Justo ahora";
  if (diffSeg < 60) return `Hace ${diffSeg} seg`;

  const diffMin = Math.floor(diffSeg / 60);
  if (diffMin < 60) return `Hace ${diffMin} min`;

  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `Hace ${diffHrs} ${diffHrs === 1 ? "hora" : "horas"}`;

  const diffDias = Math.floor(diffHrs / 24);
  if (diffDias < 7) return `Hace ${diffDias} ${diffDias === 1 ? "día" : "días"}`;

  return new Date(iso).toLocaleDateString("es-CL", { day: "2-digit", month: "short" });
}

// ─────────────────────────────────────────────────────
//  API PÚBLICA — NotifService
// ─────────────────────────────────────────────────────

export const NotifService = {

  NOTIF_TIPOS,
  CATEGORIAS_LABEL,

  /**
   * Crea y persiste una nueva notificación.
   * Equivalente futuro: POST /api/notificaciones
   *
   * @param {object} opts
   *   tipo       - NOTIF_TIPOS.*
   *   mensaje    - Texto a mostrar
   *   roles      - Array de roles destinatarios
   *   pedido_id  - (opcional) FK pedido
   *   mesa_num   - (opcional) FK mesa
   *   meta       - (opcional) datos extra libres
   */
  crearNotificacion({ tipo, mensaje, roles = [], pedido_id = null, mesa_num = null, meta = null }) {
    const notif = {
      id:         _siguienteId(),
      tipo,
      categoria:  CATEGORIA_POR_TIPO[tipo] || "sistema",
      mensaje,
      roles,
      pedido_id,
      mesa_num,
      meta,
      timestamp:  new Date().toISOString(),
      leida:      false,
    };

    const store = _leerStore();
    store.push(notif);
    _guardarStore(store);

    _emitir("nueva", notif);
    this._mostrarToastSiCorresponde(notif);

    return notif;
  },

  // Alias retrocompatible (el resto del código usa .push())
  push(opts) {
    return this.crearNotificacion(opts);
  },

  /**
   * Devuelve notificaciones para un rol, con filtros opcionales.
   * Equivalente futuro: GET /api/notificaciones?rol=...&categoria=...
   *
   * @param {string} rol
   * @param {object} opts
   *   soloNoLeidas - boolean
   *   categoria    - string ("pedidos"|"mesas"|...) o null = todas
   *   orden        - "desc" (más reciente primero, default) | "asc"
   *   limite       - número máximo de resultados
   */
  obtenerNotificaciones(rol, { soloNoLeidas = false, categoria = null, orden = "desc", limite = null } = {}) {
    let lista = _leerStore().filter(n => n.roles.includes(rol));

    if (soloNoLeidas) lista = lista.filter(n => !n.leida);
    if (categoria)    lista = lista.filter(n => n.categoria === categoria);

    lista.sort((a, b) => {
      const ta = new Date(a.timestamp).getTime();
      const tb = new Date(b.timestamp).getTime();
      return orden === "asc" ? ta - tb : tb - ta;
    });

    if (limite) lista = lista.slice(0, limite);

    // Adjuntar timestamp relativo y metadata de presentación
    return lista.map(n => ({
      ...n,
      tiempo_relativo: tiempoRelativo(n.timestamp),
      icono: (ICONO_POR_TIPO[n.tipo] || { icon: "bi-bell-fill", color: "secondary" }),
    }));
  },

  // Alias retrocompatible
  getParaRol(rol, soloNoLeidas = false) {
    return this.obtenerNotificaciones(rol, { soloNoLeidas });
  },

  /**
   * Marca una notificación puntual como leída.
   * Equivalente futuro: POST /api/notificaciones/:id/leida
   */
  marcarComoLeida(id) {
    const store = _leerStore();
    const idx = store.findIndex(n => n.id === id);
    if (idx === -1) return false;
    store[idx].leida = true;
    _guardarStore(store);
    _emitir("actualizada", store[idx]);
    return true;
  },

  // Alias retrocompatible
  marcarLeida(id) {
    return this.marcarComoLeida(id);
  },

  /**
   * Marca todas las notificaciones de un rol como leídas.
   * Equivalente futuro: POST /api/notificaciones/marcar-todas?rol=...
   */
  marcarTodasLeidas(rol, categoria = null) {
    const store = _leerStore();
    let cambios = 0;
    store.forEach(n => {
      if (n.roles.includes(rol) && !n.leida && (!categoria || n.categoria === categoria)) {
        n.leida = true;
        cambios++;
      }
    });
    if (cambios > 0) {
      _guardarStore(store);
      _emitir("todas_leidas", { rol, categoria, cambios });
    }
    return cambios;
  },

  /**
   * Elimina una notificación del historial permanentemente.
   * Equivalente futuro: DELETE /api/notificaciones/:id
   */
  eliminarNotificacion(id) {
    const store = _leerStore();
    const idx = store.findIndex(n => n.id === id);
    if (idx === -1) return false;
    store.splice(idx, 1);
    _guardarStore(store);
    _emitir("eliminada", { id });
    return true;
  },

  /**
   * Limpia todo el historial de un rol (mantiene las de otros roles).
   */
  limpiarHistorial(rol) {
    const store = _leerStore();
    const restante = store.filter(n => !n.roles.includes(rol));
    _guardarStore(restante);
    _emitir("historial_limpiado", { rol });
  },

  /** Total de no leídas para un rol (para el badge del topbar). */
  contarNoLeidas(rol) {
    return _leerStore().filter(n => n.roles.includes(rol) && !n.leida).length;
  },

  /** Conteo de no leídas agrupado por categoría (para los tabs de filtro). */
  contarPorCategoria(rol) {
    const lista = _leerStore().filter(n => n.roles.includes(rol) && !n.leida);
    const conteo = {};
    lista.forEach(n => { conteo[n.categoria] = (conteo[n.categoria] || 0) + 1; });
    return conteo;
  },

  /**
   * Suscribirse a cambios (nueva notif, marcada leída, sync entre pestañas...).
   * fn(evento, payload)
   * Devuelve función de unsubscribe.
   */
  subscribe(fn) {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
  },

  // ── Muestra Toast si el usuario activo es destinatario ──
  _mostrarToastSiCorresponde(notif) {
    try {
      const raw = sessionStorage.getItem("usuario");
      if (!raw) return;
      const usuario = JSON.parse(raw);
      if (!notif.roles.includes(usuario.rol)) return;

      import('../components/ui.js').then(({ Toast }) => {
        const cfg = ICONO_POR_TIPO[notif.tipo] || { icon: "bi-bell-fill", color: "secondary" };
        Toast.show(notif.mensaje, cfg.color === "danger" ? "danger" : (cfg.color === "warning" ? "warning" : "info"));
        this._actualizarBadgeTopbar(usuario.rol);
      });
    } catch (_) {}
  },

  // ── Actualiza badge de notificaciones en topbar ──
  _actualizarBadgeTopbar(rol) {
    const badge = document.getElementById("notif-badge");
    if (!badge) return;
    const count = this.contarNoLeidas(rol);
    badge.textContent = count > 9 ? "9+" : (count > 0 ? count : "");
    badge.style.display = count > 0 ? "" : "none";
  },

  // ══════════════════════════════════════════════════
  //  RENDERIZADO DEL PANEL
  // ══════════════════════════════════════════════════

  /**
   * Renderiza el contenido completo del panel desplegable
   * (header con filtros + lista de notificaciones).
   * @param {string} rol
   * @param {string|null} categoriaActiva - filtro activo o null = "Todas"
   */
  renderPanel(rol, categoriaActiva = null) {
    const notifs = this.obtenerNotificaciones(rol, { categoria: categoriaActiva, limite: 50 });
    const conteoPorCat = this.contarPorCategoria(rol);
    const totalNoLeidas = this.contarNoLeidas(rol);

    const tabsHTML = this._renderTabs(rol, categoriaActiva, conteoPorCat);
    const listaHTML = notifs.length === 0
      ? `<div class="notif-empty">
           <i class="bi bi-bell-slash"></i>
           <p>Sin notificaciones${categoriaActiva ? " en esta categoría" : ""}</p>
         </div>`
      : notifs.map(n => this._renderItem(n)).join("");

    return `
      <div class="notif-panel-header">
        <div class="notif-panel-title">
          <i class="bi bi-bell-fill"></i> Notificaciones
          ${totalNoLeidas > 0 ? `<span class="notif-count-pill">${totalNoLeidas}</span>` : ""}
        </div>
        <button class="notif-mark-all" onclick="NotifService.uiMarcarTodas('${rol}')" ${totalNoLeidas === 0 ? "disabled" : ""}>
          <i class="bi bi-check2-all"></i> Marcar todas
        </button>
      </div>
      <div class="notif-tabs">${tabsHTML}</div>
      <div class="notif-list">${listaHTML}</div>
    `;
  },

  _renderTabs(rol, categoriaActiva, conteoPorCat) {
    const totalTodas = Object.values(conteoPorCat).reduce((a, b) => a + b, 0);
    const categoriasPresentes = Object.keys(CATEGORIAS_LABEL).filter(cat =>
      _leerStore().some(n => n.roles.includes(rol) && n.categoria === cat)
    );

    const tabTodas = `
      <button class="notif-tab ${!categoriaActiva ? 'active' : ''}" onclick="NotifService.uiFiltrar('${rol}', null)">
        Todas ${totalTodas > 0 ? `<span class="notif-tab-badge">${totalTodas}</span>` : ""}
      </button>`;

    const tabsResto = categoriasPresentes.map(cat => {
      const cfg = CATEGORIAS_LABEL[cat];
      const count = conteoPorCat[cat] || 0;
      return `
        <button class="notif-tab ${categoriaActiva === cat ? 'active' : ''}" onclick="NotifService.uiFiltrar('${rol}', '${cat}')">
          <i class="bi ${cfg.icon}"></i> ${cfg.label} ${count > 0 ? `<span class="notif-tab-badge">${count}</span>` : ""}
        </button>`;
    }).join("");

    return tabTodas + tabsResto;
  },

  _renderItem(n) {
    const cfg = n.icono;
    return `
      <div class="notif-item ${n.leida ? 'leida' : 'no-leida'}" data-id="${n.id}">
        <div class="notif-item-icon text-${cfg.color}">
          <i class="bi ${cfg.icon}"></i>
        </div>
        <div class="notif-item-body" onclick="NotifService.uiMarcarLeida(${n.id})">
          <div class="notif-item-msg">${n.mensaje}</div>
          <div class="notif-item-time">${n.tiempo_relativo}</div>
        </div>
        ${!n.leida ? `<span class="notif-dot" title="No leída"></span>` : ""}
        <button class="notif-item-delete" title="Eliminar" onclick="NotifService.uiEliminar(${n.id})">
          <i class="bi bi-x"></i>
        </button>
      </div>`;
  },

  // ── Handlers invocados directamente desde el HTML (onclick) ──
  // Mantienen el panel sincronizado tras cada acción sin recargar la página.

  uiFiltrar(rol, categoria) {
    this._categoriaActiva = categoria;
    const cont = document.getElementById("notif-panel-body");
    if (cont) cont.innerHTML = this.renderPanel(rol, categoria);
  },

  uiMarcarLeida(id) {
    this.marcarComoLeida(id);
    const usuario = JSON.parse(sessionStorage.getItem("usuario") || "null");
    if (!usuario) return;
    this._actualizarBadgeTopbar(usuario.rol);
    const cont = document.getElementById("notif-panel-body");
    if (cont) cont.innerHTML = this.renderPanel(usuario.rol, this._categoriaActiva || null);
  },

  uiMarcarTodas(rol) {
    this.marcarTodasLeidas(rol, this._categoriaActiva || null);
    this._actualizarBadgeTopbar(rol);
    const cont = document.getElementById("notif-panel-body");
    if (cont) cont.innerHTML = this.renderPanel(rol, this._categoriaActiva || null);
  },

  uiEliminar(id) {
    this.eliminarNotificacion(id);
    const usuario = JSON.parse(sessionStorage.getItem("usuario") || "null");
    if (!usuario) return;
    this._actualizarBadgeTopbar(usuario.rol);
    const cont = document.getElementById("notif-panel-body");
    if (cont) cont.innerHTML = this.renderPanel(usuario.rol, this._categoriaActiva || null);
  },
};

// Exponer globalmente para onclick en HTML
window.NotifService = NotifService;

/*
 * ════════════════════════════════════════════════════════
 *  MIGRACIÓN FUTURA — Node.js + Express + MySQL
 * ════════════════════════════════════════════════════════
 *
 *  Tabla sugerida (ya documentada en README.md):
 *
 *    CREATE TABLE notificaciones (
 *      id INT AUTO_INCREMENT PRIMARY KEY,
 *      tipo VARCHAR(40) NOT NULL,
 *      categoria VARCHAR(20) NOT NULL,
 *      mensaje TEXT NOT NULL,
 *      roles JSON NOT NULL,
 *      pedido_id INT NULL,
 *      mesa_num INT NULL,
 *      meta JSON NULL,
 *      leida BOOLEAN DEFAULT FALSE,
 *      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
 *    );
 *
 *  Endpoints REST 1:1 con los métodos de este archivo:
 *
 *    POST   /api/notificaciones                  → crearNotificacion()
 *    GET    /api/notificaciones?rol=&categoria=   → obtenerNotificaciones()
 *    POST   /api/notificaciones/:id/leida         → marcarComoLeida()
 *    POST   /api/notificaciones/marcar-todas      → marcarTodasLeidas()
 *    DELETE /api/notificaciones/:id                → eliminarNotificacion()
 *
 *  El polling actual (`window.addEventListener("storage")`)
 *  se reemplaza por WebSocket / Socket.IO: el servidor emite
 *  "notificacion:nueva" a los sockets de los roles en `roles`,
 *  y el cliente llama exactamente el mismo `_emitir("nueva", ...)`
 *  + re-render que ya usa hoy con localStorage.
 * ════════════════════════════════════════════════════════
 */
