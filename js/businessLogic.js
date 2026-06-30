/**
 * ══════════════════════════════════════════════════════
 *  RESTAUROS — MOTOR DE REGLAS DE NEGOCIO
 *  Archivo: js/businessLogic.js
 *
 *  Contiene:
 *    • Enums de estados (PEDIDO_ESTADOS, MESA_ESTADOS, CUENTA_ESTADOS)
 *    • Máquinas de estado con transiciones permitidas
 *    • Validadores de transición por rol
 *    • Generador de notificaciones automáticas
 *    • Definición de endpoints REST futuros (comentados)
 *
 *  MIGRACIÓN FUTURA: Node.js + Express + MySQL
 *    → Mover las mismas reglas a middlewares Express
 *    → Los enums pasan a ENUM columns en MySQL
 *    → Los eventos pasan a un EventEmitter / Socket.IO
 * ══════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────
//  ENUMS — estados como objetos frozen (inmutables)
//  En MySQL: ENUM('pendiente','en_preparacion', ...)
// ─────────────────────────────────────────────────────

export const PEDIDO_ESTADOS = Object.freeze({
  PENDIENTE:        "pendiente",         // Mesero creó el pedido
  EN_PREPARACION:   "en_preparacion",    // Cocinero lo tomó
  LISTO:            "listo",             // Cocinero terminó
  RETIRADO:         "retirado",          // Mesero retiró de cocina
  ENTREGADO:        "entregado",         // Mesero entregó en mesa
  CUENTA_SOLICITADA:"cuenta_solicitada", // Mesero pidió cuenta
  PAGADO:           "pagado",            // Cuenta cobrada
  CANCELADO:        "cancelado",         // Pedido anulado
});

export const MESA_ESTADOS = Object.freeze({
  DISPONIBLE:          "disponible",           // Sin clientes
  RESERVADA:           "reservada",            // Reserva confirmada, sin llegar
  OCUPADA:             "ocupada",              // Clientes presentes, sin pedido activo
  CON_PEDIDO:          "con_pedido",           // Tiene pedido activo
  PENDIENTE_PAGO:      "pendiente_pago",       // Pedido entregado, esperando pago
  LIBERABLE:           "liberable",            // Pagado/cancelado, portero puede liberar
});

export const NOTIF_TIPOS = Object.freeze({
  // ── Pedidos ──
  PEDIDO_CREADO:          "pedido_creado",
  PEDIDO_EN_COCINA:       "pedido_en_cocina",
  PEDIDO_URGENTE:         "pedido_urgente",
  PEDIDO_MODIFICADO:      "pedido_modificado",
  PEDIDO_LISTO:           "pedido_listo",
  PEDIDO_RETIRADO:        "pedido_retirado",
  PEDIDO_ENTREGADO:       "pedido_entregado",
  PEDIDO_RETRASADO:       "pedido_retrasado",
  PEDIDO_CANCELADO:       "pedido_cancelado",

  // ── Mesas / cuentas ──
  MESA_SOLICITA_ATENCION: "mesa_solicita_atencion",
  CUENTA_SOLICITADA:      "cuenta_solicitada",
  CUENTA_PAGADA:          "cuenta_pagada",
  MESA_LIBERABLE:         "mesa_liberable",
  MESA_LIBERADA:          "mesa_liberada",
  MESA_OCUPADA_LARGO:     "mesa_ocupada_largo",

  // ── Reservas ──
  RESERVA_NUEVA:          "reserva_nueva",
  RESERVA_ASIGNADA:       "reserva_asignada",
  RESERVA_CLIENTE_LLEGO:  "reserva_cliente_llego",
  RESERVA_PROXIMA:        "reserva_proxima",
  RESERVA_PLATILLO:       "reserva_platillo",
  RESERVA_IMPORTANTE:     "reserva_importante",

  // ── Turnos / horarios ──
  HORARIO_APROBADO:       "horario_aprobado",
  TURNO_INICIADO:         "turno_iniciado",
  TURNO_FINALIZADO:       "turno_finalizado",
  TURNO_30MIN:            "turno_30min",
  TURNO_15MIN:            "turno_15min",
  TURNO_PROXIMO_INICIO:   "turno_proximo_inicio",
  HORAS_EXTRA:            "horas_extra",

  // ── Personal ──
  SOLICITUD_PERSONAL:        "solicitud_personal",
  CONTRATACION_PENDIENTE:    "contratacion_pendiente",
  CONTRATACION_APROBADA:     "contratacion_aprobada",
  CONTRATACION_RECHAZADA:    "contratacion_rechazada",
  PROBLEMA_REPORTADO:        "problema_reportado",
  APOYO_RECEPCION:           "apoyo_recepcion",

  // ── Ingredientes / stock ──
  SOLICITUD_INGREDIENTES:        "solicitud_ingredientes",
  SOLICITUD_INGREDIENTES_APROB:  "solicitud_ingredientes_aprobada",
  SOLICITUD_INGREDIENTES_RECH:   "solicitud_ingredientes_rechazada",
  STOCK_CRITICO:                  "stock_critico",
  STOCK_PROXIMO_AGOTAR:           "stock_proximo_agotar",

  // ── Finanzas / negocio ──
  VENTAS_RECORD:          "ventas_record",
  VENTAS_CAIDA:           "ventas_caida",
  RESUMEN_DIARIO:         "resumen_diario",
  RESUMEN_SEMANAL:        "resumen_semanal",

  // ── Sistema / admin ──
  ERROR_SISTEMA:          "error_sistema",
  USUARIO_BLOQUEADO:      "usuario_bloqueado",
  USUARIO_CREADO:         "usuario_creado",
  USUARIO_ELIMINADO:      "usuario_eliminado",
  PERMISOS_CAMBIADOS:     "permisos_cambiados",
  RESPALDO_GENERADO:      "respaldo_generado",

  // ── Cliente / experiencia ──
  CLIENTE_ESPERANDO:      "cliente_esperando",
});

// ─────────────────────────────────────────────────────
//  MÁQUINA DE ESTADOS — PEDIDOS
//
//  Cada transición define:
//    desde:    estado origen (array para multi-origen)
//    hasta:    estado destino
//    roles:    roles autorizados para ejecutarla
//    accion:   nombre semántico (para logs y REST)
//    notifica: roles que reciben notificación
// ─────────────────────────────────────────────────────

export const TRANSICIONES_PEDIDO = [
  {
    accion:    "tomar_pedido",
    desde:     [PEDIDO_ESTADOS.PENDIENTE],
    hasta:     PEDIDO_ESTADOS.EN_PREPARACION,
    roles:     ["cocinero", "jefe_cocina"],
    notifica:  [], // Solo feedback visual al cocinero
    mensaje:   (p) => `Pedido #${p.id} (Mesa ${p.mesa}) en preparación`,
  },
  {
    accion:    "marcar_listo",
    desde:     [PEDIDO_ESTADOS.EN_PREPARACION],
    hasta:     PEDIDO_ESTADOS.LISTO,
    roles:     ["cocinero", "jefe_cocina"],
    notifica:  ["mesero", "jefe_meseros"],
    mensaje:   (p) => `🔔 Pedido #${p.id} de Mesa ${p.mesa} está LISTO para retirar`,
    notifTipo: NOTIF_TIPOS.PEDIDO_LISTO,
  },
  {
    accion:    "retirar_pedido",
    desde:     [PEDIDO_ESTADOS.LISTO],
    hasta:     PEDIDO_ESTADOS.RETIRADO,
    roles:     ["mesero"],
    notifica:  [],
    mensaje:   (p) => `Pedido #${p.id} retirado de cocina`,
  },
  {
    accion:    "entregar_pedido",
    desde:     [PEDIDO_ESTADOS.RETIRADO],
    hasta:     PEDIDO_ESTADOS.ENTREGADO,
    roles:     ["mesero"],
    notifica:  ["administrador", "jefe_meseros"],
    mensaje:   (p) => `Pedido #${p.id} entregado en Mesa ${p.mesa}`,
    notifTipo: NOTIF_TIPOS.PEDIDO_ENTREGADO,
  },
  {
    accion:    "solicitar_cuenta",
    desde:     [PEDIDO_ESTADOS.ENTREGADO],
    hasta:     PEDIDO_ESTADOS.CUENTA_SOLICITADA,
    roles:     ["mesero"],
    notifica:  ["administrador", "dueno"],
    mensaje:   (p) => `💳 Mesa ${p.mesa} solicita la cuenta — Total: $${p.total?.toLocaleString("es-CL")}`,
    notifTipo: NOTIF_TIPOS.CUENTA_SOLICITADA,
  },
  {
    accion:    "marcar_pagado",
    desde:     [PEDIDO_ESTADOS.CUENTA_SOLICITADA],
    hasta:     PEDIDO_ESTADOS.PAGADO,
    roles:     ["mesero", "administrador"],
    notifica:  ["portero", "jefe_meseros"],
    mensaje:   (p) => `✅ Mesa ${p.mesa} pagada — Mesa disponible para liberar`,
    notifTipo: NOTIF_TIPOS.CUENTA_PAGADA,
  },
  {
    accion:    "cancelar_pedido",
    desde:     [
      PEDIDO_ESTADOS.PENDIENTE,
      PEDIDO_ESTADOS.EN_PREPARACION,
      PEDIDO_ESTADOS.LISTO,
      PEDIDO_ESTADOS.RETIRADO,
      PEDIDO_ESTADOS.ENTREGADO,
      PEDIDO_ESTADOS.CUENTA_SOLICITADA,
    ],
    hasta:     PEDIDO_ESTADOS.CANCELADO,
    roles:     ["mesero", "administrador", "jefe_meseros"],
    notifica:  ["portero"],
    mensaje:   (p) => `❌ Pedido #${p.id} Mesa ${p.mesa} cancelado`,
    notifTipo: NOTIF_TIPOS.PEDIDO_CANCELADO,
  },
];

// ─────────────────────────────────────────────────────
//  MÁQUINA DE ESTADOS — MESAS
// ─────────────────────────────────────────────────────

export const TRANSICIONES_MESA = [
  {
    accion:   "reservar",
    desde:    [MESA_ESTADOS.DISPONIBLE],
    hasta:    MESA_ESTADOS.RESERVADA,
    roles:    ["portero", "administrador", "jefe_meseros"],
  },
  {
    accion:   "confirmar_llegada",
    desde:    [MESA_ESTADOS.RESERVADA],
    hasta:    MESA_ESTADOS.OCUPADA,
    roles:    ["portero", "administrador", "jefe_meseros"],
  },
  {
    accion:   "ocupar_sin_reserva",
    desde:    [MESA_ESTADOS.DISPONIBLE],
    hasta:    MESA_ESTADOS.OCUPADA,
    roles:    ["portero", "administrador", "jefe_meseros"],
  },
  {
    // Automática al crear pedido
    accion:   "activar_pedido",
    desde:    [MESA_ESTADOS.OCUPADA],
    hasta:    MESA_ESTADOS.CON_PEDIDO,
    roles:    ["mesero", "administrador"],
  },
  {
    // Automática al marcar entregado + solicitar cuenta
    accion:   "pasar_a_pago",
    desde:    [MESA_ESTADOS.CON_PEDIDO],
    hasta:    MESA_ESTADOS.PENDIENTE_PAGO,
    roles:    ["mesero"],
  },
  {
    // Automática al pagar o cancelar
    accion:   "habilitar_liberacion",
    desde:    [MESA_ESTADOS.PENDIENTE_PAGO, MESA_ESTADOS.CON_PEDIDO],
    hasta:    MESA_ESTADOS.LIBERABLE,
    roles:    [], // Solo el sistema la ejecuta
  },
  {
    // Manual por portero
    accion:   "liberar_mesa",
    desde:    [MESA_ESTADOS.LIBERABLE],
    hasta:    MESA_ESTADOS.DISPONIBLE,
    roles:    ["portero", "administrador"],
  },
];

// ─────────────────────────────────────────────────────
//  VALIDADOR CENTRAL DE TRANSICIONES
// ─────────────────────────────────────────────────────

/**
 * Valida si una transición de pedido es legal.
 * @param {string} estadoActual - Estado actual del pedido
 * @param {string} accion       - Acción deseada (ej: "marcar_listo")
 * @param {string} rolUsuario   - Rol del usuario que ejecuta
 * @returns {{ ok: boolean, error?: string, transicion?: object }}
 */
export function validarTransicionPedido(estadoActual, accion, rolUsuario) {
  const t = TRANSICIONES_PEDIDO.find(t => t.accion === accion);
  if (!t) return { ok: false, error: `Acción desconocida: "${accion}"` };

  if (!t.desde.includes(estadoActual)) {
    return {
      ok: false,
      error: `El pedido en estado "${_labelEstado(estadoActual)}" no puede ejecutar "${accion}". ` +
             `Solo es posible desde: ${t.desde.map(_labelEstado).join(", ")}`
    };
  }

  if (t.roles.length > 0 && !t.roles.includes(rolUsuario)) {
    return {
      ok: false,
      error: `Tu rol (${rolUsuario}) no está autorizado para "${accion}". ` +
             `Roles permitidos: ${t.roles.join(", ")}`
    };
  }

  return { ok: true, transicion: t };
}

/**
 * Valida si una transición de mesa es legal.
 */
export function validarTransicionMesa(estadoActual, accion, rolUsuario) {
  const t = TRANSICIONES_MESA.find(t => t.accion === accion);
  if (!t) return { ok: false, error: `Acción de mesa desconocida: "${accion}"` };

  if (!t.desde.includes(estadoActual)) {
    return {
      ok: false,
      error: `Mesa en estado "${estadoActual}" no permite "${accion}"`
    };
  }

  if (t.roles.length > 0 && !t.roles.includes(rolUsuario)) {
    return {
      ok: false,
      error: `Tu rol no puede ejecutar "${accion}" sobre mesas`
    };
  }

  return { ok: true, transicion: t };
}

/**
 * Regla crítica: ¿puede liberarse la mesa?
 * La mesa SOLO puede liberarse si el pedido está PAGADO o CANCELADO.
 * @param {object} mesa    - Objeto mesa
 * @param {Array}  pedidos - Todos los pedidos del sistema
 * @returns {{ puede: boolean, razon: string }}
 */
export function puedeLiberarseMesa(mesa, pedidos) {
  const pedidosActivos = pedidos.filter(p =>
    p.mesa === mesa.numero &&
    ![PEDIDO_ESTADOS.PAGADO, PEDIDO_ESTADOS.CANCELADO].includes(p.estado)
  );

  if (pedidosActivos.length === 0) {
    return { puede: true, razon: "Sin pedidos activos. Mesa lista para liberar." };
  }

  const estadosPedidos = pedidosActivos.map(p => `#${p.id}:${_labelEstado(p.estado)}`).join(", ");
  return {
    puede: false,
    razon: `Existen pedidos no cerrados: ${estadosPedidos}. ` +
           `Deben estar Pagados o Cancelados antes de liberar la mesa.`
  };
}

// ─────────────────────────────────────────────────────
//  HELPER — Label legible de estado
// ─────────────────────────────────────────────────────

function _labelEstado(estado) {
  const labels = {
    pendiente:          "Pendiente",
    en_preparacion:     "En Preparación",
    listo:              "Listo",
    retirado:           "Retirado",
    entregado:          "Entregado",
    cuenta_solicitada:  "Cuenta Solicitada",
    pagado:             "Pagado",
    cancelado:          "Cancelado",
    disponible:         "Disponible",
    reservada:          "Reservada",
    ocupada:            "Ocupada",
    con_pedido:         "Con Pedido",
    pendiente_pago:     "Pendiente de Pago",
    liberable:          "Liberable",
  };
  return labels[estado] || estado;
}

export { _labelEstado as labelEstado };

/*
 * ════════════════════════════════════════════════════════
 *  ENDPOINTS REST FUTUROS (Node.js + Express + MySQL)
 *  Estas rutas corresponden 1:1 con las acciones del
 *  motor de negocio definido arriba.
 * ════════════════════════════════════════════════════════
 *
 *  POST   /api/pedidos                          → crear pedido (mesero)
 *  PUT    /api/pedidos/:id/tomar                → cocinero toma pedido
 *  PUT    /api/pedidos/:id/listo                → cocinero marca listo
 *  PUT    /api/pedidos/:id/retirar              → mesero retira de cocina
 *  PUT    /api/pedidos/:id/entregar             → mesero entrega en mesa
 *  PUT    /api/pedidos/:id/solicitar-cuenta     → mesero pide cuenta
 *  PUT    /api/pedidos/:id/pagar                → marcar como pagado
 *  PUT    /api/pedidos/:id/cancelar             → cancelar pedido
 *
 *  PUT    /api/mesas/:id/reservar               → marcar reservada
 *  PUT    /api/mesas/:id/confirmar-llegada      → ocupar desde reserva
 *  PUT    /api/mesas/:id/ocupar                 → ocupar sin reserva
 *  PUT    /api/mesas/:id/liberar                → portero libera mesa
 *
 *  GET    /api/notificaciones?rol=mesero        → notif por rol
 *  POST   /api/notificaciones/:id/leida         → marcar leída
 *
 *  GET    /api/sync                             → polling (o migrar a WS)
 */
