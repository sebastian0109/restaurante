/**
 * ══════════════════════════════════════════════════════
 *  RESTAUROS — MOCK API ROUTER  (versión v2 — flujo real)
 *  Archivo: services/api.js
 *
 *  CAMBIOS vs v1:
 *    • updateEstadoPedido ahora valida transiciones con businessLogic
 *    • cambiarEstadoMesa ahora valida máquina de estados de mesa
 *    • Nuevo: ejecutarAccionPedido() — punto de entrada unificado
 *    • Nuevo: ejecutarAccionMesa()
 *    • Nuevo: getMesasConEstadoPedido() — para portero
 *    • Nuevo: getPedidosListosParaMesero() — alertas mesero
 * ══════════════════════════════════════════════════════
 */

import { MockDB, nextIds } from '../api/mockData.js';
import {
  validarTransicionPedido,
  validarTransicionMesa,
  puedeLiberarseMesa,
  PEDIDO_ESTADOS,
  MESA_ESTADOS,
  NOTIF_TIPOS,
} from '../js/businessLogic.js';
import { NotifService } from '../js/notificationService.js';

// Simula latencia de red (80–250 ms)
const delay = (ms = null) => new Promise(r => setTimeout(r, ms ?? (Math.random() * 170 + 80)));

const apiResponse = (data, status = 200, message = "OK") =>
  ({ status, message, data, timestamp: new Date().toISOString() });
const apiError = (message, status = 400) =>
  ({ status, message, data: null, timestamp: new Date().toISOString() });

// ─────────────────────────────────────────────────────
//  PLATILLOS
// ─────────────────────────────────────────────────────
export async function getPlatillos(filtros = {}) {
  await delay();
  let platillos = [...MockDB.platillos];
  if (filtros.categoria) platillos = platillos.filter(p => p.categoria === filtros.categoria);
  if (filtros.activo !== undefined) platillos = platillos.filter(p => p.activo === filtros.activo);
  return apiResponse(platillos);
}

export async function getPlatillo(id) {
  await delay();
  const p = MockDB.platillos.find(p => p.id === parseInt(id));
  if (!p) return apiError("Platillo no encontrado", 404);
  return apiResponse(p);
}

export async function createPlatillo(data) {
  await delay();
  const nuevo = { id: MockDB.platillos.length + 1, ...data, activo: true };
  MockDB.platillos.push(nuevo);
  return apiResponse(nuevo, 201, "Platillo creado");
}

export async function updatePlatillo(id, data) {
  await delay();
  const idx = MockDB.platillos.findIndex(p => p.id === parseInt(id));
  if (idx === -1) return apiError("Platillo no encontrado", 404);
  MockDB.platillos[idx] = { ...MockDB.platillos[idx], ...data };
  return apiResponse(MockDB.platillos[idx]);
}

export async function deletePlatillo(id) {
  await delay();
  const idx = MockDB.platillos.findIndex(p => p.id === parseInt(id));
  if (idx === -1) return apiError("Platillo no encontrado", 404);
  MockDB.platillos[idx].activo = false;
  return apiResponse({ id }, 200, "Platillo desactivado");
}

// ─────────────────────────────────────────────────────
//  PEDIDOS
// ─────────────────────────────────────────────────────

/** GET /api/pedidos */
export async function getPedidos(filtros = {}) {
  await delay();
  let pedidos = [...MockDB.pedidos];
  if (filtros.estado)     pedidos = pedidos.filter(p => p.estado === filtros.estado);
  if (filtros.mesero_id)  pedidos = pedidos.filter(p => p.mesero_id === parseInt(filtros.mesero_id));
  if (filtros.mesa)       pedidos = pedidos.filter(p => p.mesa === parseInt(filtros.mesa));
  if (filtros.estados)    pedidos = pedidos.filter(p => filtros.estados.includes(p.estado));

  // Enriquecer con nombres de platillos
  pedidos = pedidos.map(p => ({
    ...p,
    items: p.items.map(item => {
      const plat = MockDB.platillos.find(pl => pl.id === item.platillo_id);
      return {
        ...item,
        platillo_nombre:  plat?.nombre  ?? "N/A",
        platillo_emoji:   plat?.imagen  ?? "🍽️",
        precio_unitario:  plat?.precio  ?? 0,
      };
    }),
  }));
  return apiResponse(pedidos);
}

/**
 * POST /api/pedidos
 * Solo meseros pueden crear pedidos.
 * Al crear: mesa pasa a estado "con_pedido".
 */
export async function createPedido(data) {
  await delay();

  // Calcular total
  let total = 0;
  data.items.forEach(item => {
    const plat = MockDB.platillos.find(p => p.id === item.platillo_id);
    if (plat) total += plat.precio * item.cantidad;
  });

  const id = nextIds.pedido++;
  const nuevo = {
    id,
    ...data,
    estado:          PEDIDO_ESTADOS.PENDIENTE,
    fecha:           new Date().toISOString(),
    total,
    tiempo_estimado: 20,
    urgente:         !!data.urgente,
    historial: [{
      estado:      PEDIDO_ESTADOS.PENDIENTE,
      timestamp:   new Date().toISOString(),
      usuario_id:  data.mesero_id,
    }],
  };
  MockDB.pedidos.push(nuevo);

  // ── Transición automática de mesa → con_pedido ──
  const mesaIdx = MockDB.mesas.findIndex(m => m.numero === parseInt(data.mesa));
  if (mesaIdx !== -1) {
    MockDB.mesas[mesaIdx].estado = MESA_ESTADOS.CON_PEDIDO;
  }

  // ── Notificación a cocina ──
  NotifService.push({
    tipo:      NOTIF_TIPOS.PEDIDO_CREADO,
    mensaje:   `🛎️ Nuevo pedido #${id} en Mesa ${data.mesa} — ${data.items.length} platillo(s)`,
    roles:     ["cocinero", "jefe_cocina"],
    pedido_id: id,
    mesa_num:  data.mesa,
  });

  // ── Notificación adicional si el pedido se marcó urgente ──
  if (nuevo.urgente) {
    NotifService.push({
      tipo:      NOTIF_TIPOS.PEDIDO_URGENTE,
      mensaje:   `🔥 Pedido #${id} (Mesa ${data.mesa}) marcado como URGENTE`,
      roles:     ["cocinero", "jefe_cocina"],
      pedido_id: id,
      mesa_num:  data.mesa,
    });
  }

  return apiResponse(nuevo, 201, "Pedido creado exitosamente");
}

/**
 * PUT /api/pedidos/:id/modificar
 * El mesero puede modificar items/notas mientras el pedido
 * sigue en "pendiente" (antes de que cocina lo tome).
 * Dispara notificación a cocina para que revise el cambio.
 */
export async function modificarPedido(pedidoId, cambios) {
  await delay();
  const idx = MockDB.pedidos.findIndex(p => p.id === parseInt(pedidoId));
  if (idx === -1) return apiError("Pedido no encontrado", 404);

  const pedido = MockDB.pedidos[idx];
  if (pedido.estado !== PEDIDO_ESTADOS.PENDIENTE) {
    return apiError("Solo se puede modificar un pedido mientras está pendiente", 409);
  }

  MockDB.pedidos[idx] = { ...pedido, ...cambios };

  NotifService.push({
    tipo:      NOTIF_TIPOS.PEDIDO_MODIFICADO,
    mensaje:   `✏️ Pedido #${pedido.id} (Mesa ${pedido.mesa}) fue modificado por el mesero`,
    roles:     ["cocinero", "jefe_cocina"],
    pedido_id: pedido.id,
    mesa_num:  pedido.mesa,
  });

  return apiResponse(MockDB.pedidos[idx], 200, "Pedido actualizado");
}

/**
 * PUT /api/pedidos/:id/accion
 *
 * PUNTO DE ENTRADA UNIFICADO para todas las transiciones de pedido.
 * Valida la transición, actualiza estado y dispara notificaciones.
 *
 * @param {number} pedidoId
 * @param {string} accion    — clave de TRANSICIONES_PEDIDO
 * @param {string} rolUsuario
 * @param {number} usuarioId
 *
 * Acciones válidas:
 *   tomar_pedido | marcar_listo | retirar_pedido | entregar_pedido |
 *   solicitar_cuenta | marcar_pagado | cancelar_pedido
 */
export async function ejecutarAccionPedido(pedidoId, accion, rolUsuario, usuarioId) {
  await delay();

  const idx = MockDB.pedidos.findIndex(p => p.id === parseInt(pedidoId));
  if (idx === -1) return apiError("Pedido no encontrado", 404);

  const pedido = MockDB.pedidos[idx];
  const validacion = validarTransicionPedido(pedido.estado, accion, rolUsuario);

  if (!validacion.ok) {
    return apiError(validacion.error, 403);
  }

  const estadoAnterior = pedido.estado;
  const nuevoEstado    = validacion.transicion.hasta;

  // ── Actualizar estado ──
  MockDB.pedidos[idx].estado = nuevoEstado;
  MockDB.pedidos[idx].historial = MockDB.pedidos[idx].historial || [];
  MockDB.pedidos[idx].historial.push({
    estado:    nuevoEstado,
    timestamp: new Date().toISOString(),
    usuario_id: usuarioId,
  });

  const pedidoActualizado = MockDB.pedidos[idx];

  // ── Notificaciones automáticas ──
  const t = validacion.transicion;
  if (t.notifica?.length > 0 && t.notifTipo) {
    NotifService.push({
      tipo:      t.notifTipo,
      mensaje:   t.mensaje(pedidoActualizado),
      roles:     t.notifica,
      pedido_id: pedidoActualizado.id,
      mesa_num:  pedidoActualizado.mesa,
    });
  }

  // ── Transiciones automáticas de mesa ──
  _sincronizarEstadoMesa(pedidoActualizado, nuevoEstado, estadoAnterior);

  return apiResponse(pedidoActualizado, 200, `Pedido actualizado: ${estadoAnterior} → ${nuevoEstado}`);
}

/**
 * Sincroniza el estado de la mesa según el estado del pedido.
 * Llamada internamente, no expuesta directamente al cliente.
 */
function _sincronizarEstadoMesa(pedido, nuevoEstado, estadoAnterior) {
  const mesaIdx = MockDB.mesas.findIndex(m => m.numero === parseInt(pedido.mesa));
  if (mesaIdx === -1) return;

  const mesa = MockDB.mesas[mesaIdx];

  if (nuevoEstado === PEDIDO_ESTADOS.ENTREGADO ||
      nuevoEstado === PEDIDO_ESTADOS.CUENTA_SOLICITADA) {
    // Mesa entra a flujo de pago
    if (mesa.estado !== MESA_ESTADOS.PENDIENTE_PAGO) {
      MockDB.mesas[mesaIdx].estado = MESA_ESTADOS.PENDIENTE_PAGO;
    }
  }

  if (nuevoEstado === PEDIDO_ESTADOS.PAGADO ||
      nuevoEstado === PEDIDO_ESTADOS.CANCELADO) {
    // Mesa pasa a liberable
    MockDB.mesas[mesaIdx].estado = MESA_ESTADOS.LIBERABLE;

    // Notificar al portero
    NotifService.push({
      tipo:    NOTIF_TIPOS.MESA_LIBERABLE,
      mensaje: `🪑 Mesa ${pedido.mesa} lista para ser liberada`,
      roles:   ["portero", "jefe_meseros"],
      mesa_num: pedido.mesa,
    });
  }
}

/**
 * GET /api/pedidos/listos-para-mesero/:meseroId
 * Devuelve los pedidos LISTOS del mesero (para alertas).
 */
export async function getPedidosListosParaMesero(meseroId) {
  await delay(60);
  const listos = MockDB.pedidos.filter(p =>
    p.mesero_id === parseInt(meseroId) &&
    p.estado === PEDIDO_ESTADOS.LISTO
  );
  return apiResponse(listos);
}

/**
 * POST /api/mesas/:id/solicitar-atencion
 * Cualquier rol con visibilidad de mesas puede marcar que una
 * mesa requiere atención del mesero (botón de "llamar mesero").
 */
export async function solicitarAtencionMesa(mesaId, motivo = "") {
  await delay(60);
  const mesa = MockDB.mesas.find(m => m.id === parseInt(mesaId));
  if (!mesa) return apiError("Mesa no encontrada", 404);

  NotifService.push({
    tipo:     NOTIF_TIPOS.MESA_SOLICITA_ATENCION,
    mensaje:  `🙋 Mesa ${mesa.numero} solicita atención${motivo ? ": " + motivo : ""}`,
    roles:    ["mesero", "jefe_meseros"],
    mesa_num: mesa.numero,
  });

  return apiResponse({ ok: true }, 200, "Solicitud de atención enviada");
}

// ─────────────────────────────────────────────────────
//  MESAS
// ─────────────────────────────────────────────────────

/** GET /api/mesas */
export async function getMesas(filtros = {}) {
  await delay();
  let mesas = [...MockDB.mesas];
  if (filtros.estado) mesas = mesas.filter(m => m.estado === filtros.estado);
  if (filtros.zona)   mesas = mesas.filter(m => m.zona === filtros.zona);
  return apiResponse(mesas);
}

/**
 * GET /api/mesas/con-estado-pedido
 * Para el portero: devuelve cada mesa con el estado de su pedido activo.
 */
export async function getMesasConEstadoPedido() {
  await delay();
  const mesas = MockDB.mesas.map(mesa => {
    const pedidoActivo = MockDB.pedidos.find(p =>
      p.mesa === mesa.numero &&
      ![PEDIDO_ESTADOS.PAGADO, PEDIDO_ESTADOS.CANCELADO].includes(p.estado)
    );
    const { puede, razon } = puedeLiberarseMesa(mesa, MockDB.pedidos);
    return {
      ...mesa,
      pedido_activo: pedidoActivo ?? null,
      puede_liberarse: puede,
      razon_bloqueo:   puede ? null : razon,
    };
  });
  return apiResponse(mesas);
}

export async function updateMesa(id, data) {
  await delay();
  const idx = MockDB.mesas.findIndex(m => m.id === parseInt(id));
  if (idx === -1) return apiError("Mesa no encontrada", 404);
  MockDB.mesas[idx] = { ...MockDB.mesas[idx], ...data };
  return apiResponse(MockDB.mesas[idx]);
}

/**
 * PUT /api/mesas/:id/accion
 *
 * PUNTO DE ENTRADA UNIFICADO para transiciones de mesa.
 *
 * Acciones válidas:
 *   reservar | confirmar_llegada | ocupar_sin_reserva | liberar_mesa
 *
 * NOTA: activar_pedido, pasar_a_pago, habilitar_liberacion
 *       son acciones INTERNAS del sistema (solo desde ejecutarAccionPedido).
 */
export async function ejecutarAccionMesa(mesaId, accion, rolUsuario) {
  await delay();

  const idx = MockDB.mesas.findIndex(m => m.id === parseInt(mesaId));
  if (idx === -1) return apiError("Mesa no encontrada", 404);

  const mesa = MockDB.mesas[idx];

  // ── Regla crítica: no liberar si hay pedidos activos ──
  if (accion === "liberar_mesa") {
    const { puede, razon } = puedeLiberarseMesa(mesa, MockDB.pedidos);
    if (!puede) {
      return apiError(`No se puede liberar la mesa. ${razon}`, 409);
    }
  }

  const validacion = validarTransicionMesa(mesa.estado, accion, rolUsuario);
  if (!validacion.ok) return apiError(validacion.error, 403);

  const estadoAnterior = mesa.estado;
  const nuevoEstado = validacion.transicion.hasta;
  MockDB.mesas[idx].estado = nuevoEstado;

  // ── Timestamp para el scheduler (detectar "ocupada hace mucho rato") ──
  if (nuevoEstado === MESA_ESTADOS.OCUPADA) {
    MockDB.mesas[idx]._ocupada_desde = new Date().toISOString();
  }
  if (nuevoEstado !== MESA_ESTADOS.OCUPADA) {
    delete MockDB.mesas[idx]._ocupada_desde;
  }

  // ── Notificaciones según la acción ──
  if (accion === "confirmar_llegada") {
    NotifService.push({
      tipo:     NOTIF_TIPOS.RESERVA_CLIENTE_LLEGO,
      mensaje:  `✅ Cliente llegó a la Mesa ${mesa.numero} (reserva confirmada)`,
      roles:    ["portero", "jefe_meseros", "mesero"],
      mesa_num: mesa.numero,
    });
  }

  if (accion === "liberar_mesa") {
    NotifService.push({
      tipo:     NOTIF_TIPOS.MESA_LIBERADA,
      mensaje:  `🟢 Mesa ${mesa.numero} liberada y disponible`,
      roles:    ["mesero", "jefe_meseros", "portero"],
      mesa_num: mesa.numero,
    });
  }

  return apiResponse(
    MockDB.mesas[idx],
    200,
    `Mesa ${mesa.numero}: ${estadoAnterior} → ${nuevoEstado}`
  );
}

/**
 * Alias legacy para compatibilidad con MesaActions existente.
 * REDIRIGE internamente a ejecutarAccionMesa.
 */
export async function cambiarEstadoMesa(mesaId, estado, extraData = {}) {
  // Mapear estado simple a acción semántica
  const mapaAcciones = {
    ocupada:     "ocupar_sin_reserva",
    disponible:  "liberar_mesa",
    reservada:   "reservar",
  };

  const raw = sessionStorage.getItem("usuario");
  const usuario = raw ? JSON.parse(raw) : { rol: "administrador" };
  const accion = mapaAcciones[estado] || "ocupar_sin_reserva";

  const res = await ejecutarAccionMesa(mesaId, accion, usuario.rol);
  if (res.status === 200 && Object.keys(extraData).length > 0) {
    const idx2 = MockDB.mesas.findIndex(m => m.id === parseInt(mesaId));
    if (idx2 !== -1) {
      MockDB.mesas[idx2] = { ...MockDB.mesas[idx2], ...extraData };
    }
  }
  return res;
}

// ─────────────────────────────────────────────────────
//  HORARIOS
// ─────────────────────────────────────────────────────
export async function getHorarios(filtros = {}) {
  await delay();
  let horarios = [...MockDB.horarios];
  if (filtros.empleado_id) horarios = horarios.filter(h => h.empleado_id === parseInt(filtros.empleado_id));
  if (filtros.semana)      horarios = horarios.filter(h => h.semana === filtros.semana);
  horarios = horarios
    .filter(h => h && typeof h.empleado_id === "number")
    .map(h => {
      const emp = MockDB.usuarios.find(u => u.id === h.empleado_id);
      return { ...h, empleado_nombre: emp?.nombre ?? "Sin asignar", empleado_rol: emp?.rol ?? "desconocido" };
    });
  return apiResponse(horarios);
}

export async function createHorario(data) {
  await delay();
  const nuevo = { id: nextIds.horario++, ...data };
  MockDB.horarios.push(nuevo);
  return apiResponse(nuevo, 201, "Horario creado");
}

export async function updateHorario(id, data) {
  await delay();
  const idx = MockDB.horarios.findIndex(h => h.id === parseInt(id));
  if (idx === -1) return apiError("Horario no encontrado", 404);

  const anterior = MockDB.horarios[idx];
  MockDB.horarios[idx] = { ...anterior, ...data };
  const actualizado = MockDB.horarios[idx];

  // ── Notificar al empleado cuando su cambio de horario queda aprobado ──
  if (data.estado === "aprobado" && anterior.estado !== "aprobado") {
    const emp = MockDB.usuarios.find(u => u.id === actualizado.empleado_id);
    if (emp) {
      NotifService.push({
        tipo:    NOTIF_TIPOS.HORARIO_APROBADO,
        mensaje: `📆 Tu cambio de horario fue aprobado`,
        roles:   [emp.rol],
        meta:    { horario_id: actualizado.id, empleado_id: emp.id },
      });
    }
  }

  return apiResponse(actualizado);
}

export async function deleteHorario(id) {
  await delay();
  const idx = MockDB.horarios.findIndex(h => h.id === parseInt(id));
  if (idx === -1) return apiError("Horario no encontrado", 404);
  MockDB.horarios.splice(idx, 1);
  return apiResponse({ id }, 200, "Horario eliminado");
}

// ─────────────────────────────────────────────────────
//  STOCK / INGREDIENTES
// ─────────────────────────────────────────────────────
export async function getStock(filtros = {}) {
  await delay();
  let stock = [...MockDB.ingredientes];
  if (filtros.categoria)  stock = stock.filter(i => i.categoria === filtros.categoria);
  if (filtros.bajo_minimo) stock = stock.filter(i => i.stock <= i.stock_minimo);
  return apiResponse(stock);
}

export async function updateStock(id, cantidad) {
  await delay();
  const idx = MockDB.ingredientes.findIndex(i => i.id === parseInt(id));
  if (idx === -1) return apiError("Ingrediente no encontrado", 404);
  MockDB.ingredientes[idx].stock += parseInt(cantidad);
  return apiResponse(MockDB.ingredientes[idx]);
}

export async function createIngrediente(data) {
  await delay();
  const nuevo = { id: MockDB.ingredientes.length + 1, ...data, stock: data.stock || 0 };
  MockDB.ingredientes.push(nuevo);
  return apiResponse(nuevo, 201, "Ingrediente creado");
}

// ─────────────────────────────────────────────────────
//  SOLICITUDES
// ─────────────────────────────────────────────────────
export async function getSolicitudesPersonal(filtros = {}) {
  await delay();
  let s = [...MockDB.solicitudes_personal];
  if (filtros.estado) s = s.filter(x => x.estado === filtros.estado);
  s = s.map(x => {
    const emp = MockDB.usuarios.find(u => u.id === x.solicitante_id);
    return { ...x, solicitante_nombre: emp?.nombre ?? "N/A" };
  });
  return apiResponse(s);
}

export async function createSolicitudPersonal(data) {
  await delay();
  const nuevo = { id: nextIds.solicitud_personal++, ...data, estado: data.estado || "pendiente", fecha: new Date().toISOString() };
  MockDB.solicitudes_personal.push(nuevo);

  const solicitante = MockDB.usuarios.find(u => u.id === data.solicitante_id);

  // ── Notificar a jefe de meseros / jefe de cocina (visibilidad operativa) ──
  NotifService.push({
    tipo:    NOTIF_TIPOS.SOLICITUD_PERSONAL,
    mensaje: `👥 ${solicitante?.nombre ?? "Un encargado"} solicitó ${data.cantidad} ${data.rol_solicitado}(s): ${data.motivo}`,
    roles:   ["jefe_meseros", "jefe_cocina"].filter(r => r !== solicitante?.rol),
    meta:    { solicitud_id: nuevo.id },
  });

  // ── Notificar al dueño: toda solicitud de contratación requiere su aprobación ──
  NotifService.push({
    tipo:    NOTIF_TIPOS.CONTRATACION_PENDIENTE,
    mensaje: `📋 Solicitud de contratación pendiente: ${data.cantidad} ${data.rol_solicitado}(s) — ${data.motivo}`,
    roles:   ["dueno"],
    meta:    { solicitud_id: nuevo.id },
  });

  return apiResponse(nuevo, 201, "Solicitud creada");
}

export async function updateSolicitudPersonal(id, data) {
  await delay();
  const idx = MockDB.solicitudes_personal.findIndex(s => s.id === parseInt(id));
  if (idx === -1) return apiError("Solicitud no encontrada", 404);

  const anterior = MockDB.solicitudes_personal[idx];
  MockDB.solicitudes_personal[idx] = { ...anterior, ...data };
  const actualizada = MockDB.solicitudes_personal[idx];

  // ── Notificar resultado al solicitante (jefe_meseros o jefe_cocina) ──
  if (data.estado === "aprobada" && anterior.estado !== "aprobada") {
    NotifService.push({
      tipo:    NOTIF_TIPOS.CONTRATACION_APROBADA,
      mensaje: `✅ Solicitud de ${actualizada.cantidad} ${actualizada.rol_solicitado}(s) fue APROBADA`,
      roles:   [actualizada.solicitante_rol, "dueno"].filter(Boolean),
      meta:    { solicitud_id: actualizada.id },
    });
  }
  if (data.estado === "rechazada" && anterior.estado !== "rechazada") {
    NotifService.push({
      tipo:    NOTIF_TIPOS.CONTRATACION_RECHAZADA,
      mensaje: `❌ Solicitud de ${actualizada.cantidad} ${actualizada.rol_solicitado}(s) fue rechazada`,
      roles:   [actualizada.solicitante_rol].filter(Boolean),
      meta:    { solicitud_id: actualizada.id },
    });
  }

  return apiResponse(actualizada);
}

/**
 * POST /api/personal/reportar-problema
 * Un mesero/cocinero/portero reporta un problema operativo a su jefe directo.
 */
export async function reportarProblema(usuarioId, mensaje) {
  await delay();
  const emp = MockDB.usuarios.find(u => u.id === parseInt(usuarioId));
  if (!emp) return apiError("Usuario no encontrado", 404);

  const jefeDestino = { mesero: "jefe_meseros", portero: "jefe_meseros", cocinero: "jefe_cocina" }[emp.rol] || "administrador";

  NotifService.push({
    tipo:    NOTIF_TIPOS.PROBLEMA_REPORTADO,
    mensaje: `🚩 ${emp.nombre} (${emp.rol}) reportó: ${mensaje}`,
    roles:   [jefeDestino],
    meta:    { usuario_id: emp.id },
  });

  return apiResponse({ ok: true }, 201, "Problema reportado");
}

/**
 * POST /api/recepcion/solicitar-apoyo
 * El portero solicita apoyo adicional en recepción.
 */
export async function solicitarApoyoRecepcion(mensaje = "") {
  await delay();
  NotifService.push({
    tipo:    NOTIF_TIPOS.APOYO_RECEPCION,
    mensaje: `🆘 Recepción solicita apoyo${mensaje ? ": " + mensaje : ""}`,
    roles:   ["jefe_meseros", "administrador"],
  });
  return apiResponse({ ok: true }, 200, "Solicitud de apoyo enviada");
}

export async function getSolicitudesIngredientes(filtros = {}) {
  await delay();
  let s = [...MockDB.solicitudes_ingredientes];
  if (filtros.estado)       s = s.filter(x => x.estado === filtros.estado);
  if (filtros.solicitante_id) s = s.filter(x => x.solicitante_id === parseInt(filtros.solicitante_id));
  s = s.map(x => {
    const emp = MockDB.usuarios.find(u => u.id === x.solicitante_id);
    const ing = MockDB.ingredientes.find(i => i.id === x.ingrediente_id);
    return { ...x, solicitante_nombre: emp?.nombre ?? "N/A", ingrediente_nombre: ing?.nombre ?? "N/A" };
  });
  return apiResponse(s);
}

export async function createSolicitudIngrediente(data) {
  await delay();
  const nuevo = { id: nextIds.solicitud_ingrediente++, ...data, estado: "pendiente", fecha: new Date().toISOString() };
  MockDB.solicitudes_ingredientes.push(nuevo);

  const ing = MockDB.ingredientes.find(i => i.id === data.ingrediente_id);
  const solicitante = MockDB.usuarios.find(u => u.id === data.solicitante_id);

  NotifService.push({
    tipo:    NOTIF_TIPOS.SOLICITUD_INGREDIENTES,
    mensaje: `📦 ${solicitante?.nombre ?? "Un cocinero"} solicitó ${data.cantidad} ${data.unidad} de ${ing?.nombre ?? "ingrediente"}`,
    roles:   ["jefe_cocina"],
    meta:    { solicitud_id: nuevo.id, ingrediente_id: data.ingrediente_id },
  });

  return apiResponse(nuevo, 201, "Solicitud de ingrediente creada");
}

export async function updateSolicitudIngrediente(id, data) {
  await delay();
  const idx = MockDB.solicitudes_ingredientes.findIndex(s => s.id === parseInt(id));
  if (idx === -1) return apiError("Solicitud no encontrada", 404);

  const anterior = MockDB.solicitudes_ingredientes[idx];
  MockDB.solicitudes_ingredientes[idx] = { ...anterior, ...data };
  const actualizada = MockDB.solicitudes_ingredientes[idx];
  const ing = MockDB.ingredientes.find(i => i.id === actualizada.ingrediente_id);
  const solicitante = MockDB.usuarios.find(u => u.id === actualizada.solicitante_id);

  if (data.estado === "aprobada" && anterior.estado !== "aprobada") {
    const ingIdx = MockDB.ingredientes.findIndex(i => i.id === actualizada.ingrediente_id);
    if (ingIdx !== -1) MockDB.ingredientes[ingIdx].stock += actualizada.cantidad;

    NotifService.push({
      tipo:    NOTIF_TIPOS.SOLICITUD_INGREDIENTES_APROB,
      mensaje: `✅ Tu solicitud de ${actualizada.cantidad} ${actualizada.unidad} de ${ing?.nombre ?? "ingrediente"} fue aprobada`,
      roles:   [solicitante?.rol].filter(Boolean),
      meta:    { solicitud_id: actualizada.id },
    });
  }

  if (data.estado === "rechazada" && anterior.estado !== "rechazada") {
    NotifService.push({
      tipo:    NOTIF_TIPOS.SOLICITUD_INGREDIENTES_RECH,
      mensaje: `❌ Tu solicitud de ${actualizada.cantidad} ${actualizada.unidad} de ${ing?.nombre ?? "ingrediente"} fue rechazada`,
      roles:   [solicitante?.rol].filter(Boolean),
      meta:    { solicitud_id: actualizada.id },
    });
  }

  return apiResponse(actualizada);
}

// ─────────────────────────────────────────────────────
//  RESERVACIONES
// ─────────────────────────────────────────────────────
export async function getReservaciones(filtros = {}) {
  await delay();
  let r = [...MockDB.reservaciones];
  if (filtros.tipo)   r = r.filter(x => x.tipo === filtros.tipo);
  if (filtros.estado) r = r.filter(x => x.estado === filtros.estado);
  return apiResponse(r);
}

export async function createReservacion(data) {
  await delay();
  const id = nextIds.reservacion++;
  const nueva = { id, ...data, fecha: data.fecha || new Date().toISOString() };
  MockDB.reservaciones.push(nueva);

  if (data.tipo === "mesa") {
    NotifService.push({
      tipo:    NOTIF_TIPOS.RESERVA_NUEVA,
      mensaje: `📅 Nueva reserva de mesa: "${data.cliente}" — ${data.personas} personas`,
      roles:   ["portero"],
      meta:    { reserva_id: id },
    });

    // Reserva grande (8+ personas) se considera importante para jefe de meseros
    if (data.personas >= 8) {
      NotifService.push({
        tipo:    NOTIF_TIPOS.RESERVA_IMPORTANTE,
        mensaje: `⭐ Reserva importante: "${data.cliente}" — ${data.personas} personas`,
        roles:   ["jefe_meseros"],
        meta:    { reserva_id: id },
      });
    }
  }

  if (data.tipo === "platillo") {
    NotifService.push({
      tipo:    NOTIF_TIPOS.RESERVA_PLATILLO,
      mensaje: `🍽️ Reserva de platillos programada: "${data.cliente}" — ${data.cantidad} porciones`,
      roles:   ["jefe_cocina", "cocinero"],
      meta:    { reserva_id: id },
    });
  }

  return apiResponse(nueva, 201, "Reservación creada");
}

// ─────────────────────────────────────────────────────
//  USUARIOS
// ─────────────────────────────────────────────────────
export async function getUsuarios(filtros = {}) {
  await delay();
  let usuarios = MockDB.usuarios.map(({ password, ...u }) => u);
  if (filtros.rol)    usuarios = usuarios.filter(u => u.rol === filtros.rol);
  if (filtros.activo !== undefined) usuarios = usuarios.filter(u => u.activo === filtros.activo);
  return apiResponse(usuarios);
}

export async function createUsuario(data) {
  await delay();
  if (MockDB.usuarios.find(u => u.email === data.email))
    return apiError("El email ya está registrado", 409);
  const nuevo = { id: MockDB.usuarios.length + 1, ...data, activo: true };
  MockDB.usuarios.push(nuevo);
  const { password, ...sin_pass } = nuevo;

  NotifService.push({
    tipo:    NOTIF_TIPOS.USUARIO_CREADO,
    mensaje: `👤 Usuario creado: ${nuevo.nombre} (${nuevo.rol})`,
    roles:   ["administrador"],
    meta:    { usuario_id: nuevo.id },
  });

  return apiResponse(sin_pass, 201, "Usuario creado");
}

export async function updateUsuario(id, data) {
  await delay();
  const idx = MockDB.usuarios.findIndex(u => u.id === parseInt(id));
  if (idx === -1) return apiError("Usuario no encontrado", 404);

  const anterior = MockDB.usuarios[idx];
  MockDB.usuarios[idx] = { ...anterior, ...data };
  const actualizado = MockDB.usuarios[idx];
  const { password, ...sin_pass } = actualizado;

  // ── Bloqueo de usuario ──
  if (data.activo === false && anterior.activo !== false) {
    NotifService.push({
      tipo:    NOTIF_TIPOS.USUARIO_BLOQUEADO,
      mensaje: `🔒 Usuario bloqueado: ${actualizado.nombre}`,
      roles:   ["administrador"],
      meta:    { usuario_id: actualizado.id },
    });
  }

  // ── Cambio de rol/permisos ──
  if (data.rol && data.rol !== anterior.rol) {
    NotifService.push({
      tipo:    NOTIF_TIPOS.PERMISOS_CAMBIADOS,
      mensaje: `🛡️ Permisos cambiados: ${actualizado.nombre} pasó de ${anterior.rol} a ${actualizado.rol}`,
      roles:   ["administrador"],
      meta:    { usuario_id: actualizado.id },
    });
  }

  return apiResponse(sin_pass);
}

export async function deleteUsuario(id) {
  await delay();
  const idx = MockDB.usuarios.findIndex(u => u.id === parseInt(id));
  if (idx === -1) return apiError("Usuario no encontrado", 404);
  MockDB.usuarios[idx].activo = false;

  NotifService.push({
    tipo:    NOTIF_TIPOS.USUARIO_ELIMINADO,
    mensaje: `🗑️ Usuario eliminado: ${MockDB.usuarios[idx].nombre}`,
    roles:   ["administrador"],
    meta:    { usuario_id: id },
  });

  return apiResponse({ id }, 200, "Usuario desactivado");
}

// ─────────────────────────────────────────────────────
//  AUTH
// ─────────────────────────────────────────────────────
export async function login(email, password) {
  await delay(300);
  const usuario = MockDB.usuarios.find(u => u.email === email && u.password === password && u.activo);
  if (!usuario) return apiError("Credenciales inválidas", 401);
  const { password: _, ...userData } = usuario;
  const token = btoa(JSON.stringify({ id: usuario.id, rol: usuario.rol, exp: Date.now() + 86400000 }));
  return apiResponse({ usuario: userData, token }, 200, "Login exitoso");
}

// ─────────────────────────────────────────────────────
//  FINANZAS / MÉTRICAS
// ─────────────────────────────────────────────────────
export async function getFinanzas(periodo = "mes") {
  await delay();
  const ganancias = MockDB.finanzas.ganancias[periodo] || MockDB.finanzas.ganancias.mes;
  const gastos    = MockDB.finanzas.gastos[periodo]    || MockDB.finanzas.gastos.mes;
  const total_ganancias = ganancias.reduce((a, b) => a + b, 0);
  const total_gastos    = gastos.reduce((a, b) => a + b, 0);
  return apiResponse({ ganancias, gastos, total_ganancias, total_gastos, utilidad: total_ganancias - total_gastos, periodo });
}

export async function getMetricas() {
  await delay();
  return apiResponse(MockDB.metricas);
}

export async function getEquiposCocina() {
  await delay();
  return apiResponse(MockDB.equipos_cocina);
}

// ─────────────────────────────────────────────────────
//  TURNOS
// ─────────────────────────────────────────────────────
export async function getTurnosActivos() {
  await delay();
  const turnos = MockDB.turnos_activos.map(t => {
    const emp = MockDB.usuarios.find(u => u.id === t.empleado_id);
    return { ...t, empleado_nombre: emp?.nombre ?? "N/A" };
  });
  return apiResponse(turnos);
}

export async function tomarTurno(empleado_id) {
  await delay();
  if (MockDB.turnos_activos.find(t => t.empleado_id === empleado_id && t.estado === "activo"))
    return apiError("Ya tienes un turno activo", 409);
  const nuevo = {
    id:          MockDB.turnos_activos.length + 1,
    empleado_id,
    fecha:       new Date().toISOString().split("T")[0],
    hora_inicio: new Date().toTimeString().slice(0, 5),
    hora_fin:    null,
    estado:      "activo",
  };
  MockDB.turnos_activos.push(nuevo);

  // ── Notificar al jefe correspondiente ──
  const emp = MockDB.usuarios.find(u => u.id === empleado_id);
  if (emp) {
    const jefesPorRol = {
      mesero:   ["jefe_meseros"],
      cocinero: ["jefe_cocina"],
      portero:  ["jefe_meseros"],
    };
    const destinatarios = jefesPorRol[emp.rol];
    if (destinatarios) {
      NotifService.push({
        tipo:    NOTIF_TIPOS.TURNO_INICIADO,
        mensaje: `🟢 ${emp.nombre} (${emp.rol}) inició su turno a las ${nuevo.hora_inicio}`,
        roles:   destinatarios,
        meta:    { empleado_id },
      });
    }
  }

  return apiResponse(nuevo, 201, "Turno iniciado");
}

export async function finalizarTurno(turno_id, empleado_id) {
  await delay();
  const idx = MockDB.turnos_activos.findIndex(
    t => t.id === parseInt(turno_id) && t.empleado_id === parseInt(empleado_id)
  );
  if (idx === -1) return apiError("Turno no encontrado o ya finalizado", 404);
  const hora_fin = new Date().toTimeString().slice(0, 5);
  MockDB.turnos_activos[idx].estado  = "finalizado";
  MockDB.turnos_activos[idx].hora_fin = hora_fin;
  const turnoFinalizado = { ...MockDB.turnos_activos[idx] };
  MockDB.turnos_activos.splice(idx, 1);

  // ── Notificar al jefe + al propio empleado ("Turno finalizado") ──
  const emp = MockDB.usuarios.find(u => u.id === parseInt(empleado_id));
  if (emp) {
    const jefesPorRol = {
      mesero:   ["jefe_meseros"],
      cocinero: ["jefe_cocina"],
      portero:  ["jefe_meseros"],
    };
    const destinatarios = [...(jefesPorRol[emp.rol] || []), emp.rol];
    NotifService.push({
      tipo:    NOTIF_TIPOS.TURNO_FINALIZADO,
      mensaje: `🔴 ${emp.nombre} finalizó su turno a las ${hora_fin}`,
      roles:   destinatarios,
      meta:    { empleado_id: emp.id },
    });
  }

  return apiResponse(turnoFinalizado, 200, "Turno finalizado correctamente");
}

// ─────────────────────────────────────────────────────
//  SISTEMA / ADMINISTRACIÓN
// ─────────────────────────────────────────────────────

/**
 * POST /api/sistema/respaldo
 * Genera un respaldo manual de los datos (mock: simplemente
 * serializa MockDB a localStorage con timestamp).
 */
export async function generarRespaldo() {
  await delay(400);
  try {
    const snapshot = JSON.stringify(MockDB);
    localStorage.setItem(`RESTOS_BACKUP_${Date.now()}`, snapshot);

    NotifService.push({
      tipo:    NOTIF_TIPOS.RESPALDO_GENERADO,
      mensaje: `💾 Respaldo generado correctamente (${new Date().toLocaleString("es-CL")})`,
      roles:   ["administrador"],
    });

    return apiResponse({ ok: true }, 200, "Respaldo generado");
  } catch (e) {
    NotifService.push({
      tipo:    NOTIF_TIPOS.ERROR_SISTEMA,
      mensaje: `⚠️ Error al generar respaldo: ${e.message}`,
      roles:   ["administrador"],
    });
    return apiError("No se pudo generar el respaldo", 500);
  }
}

/**
 * Reporta un error de sistema al administrador.
 * Pensado para ser llamado desde un catch global (window.onerror,
 * o un try/catch en operaciones críticas del Mock REST API).
 */
export function reportarErrorSistema(mensaje) {
  NotifService.push({
    tipo:    NOTIF_TIPOS.ERROR_SISTEMA,
    mensaje: `⚠️ Error del sistema: ${mensaje}`,
    roles:   ["administrador"],
  });
}

// ─────────────────────────────────────────────────────
//  SYNC / POLLING
// ─────────────────────────────────────────────────────
export async function getSyncData(since = null) {
  await delay(60);

  const raw = sessionStorage.getItem("usuario");
  const usuario = raw ? JSON.parse(raw) : null;
  const rol = usuario?.rol;

  const pedidos_pendientes   = MockDB.pedidos.filter(p => p.estado === PEDIDO_ESTADOS.PENDIENTE).length;
  const pedidos_en_prep      = MockDB.pedidos.filter(p => p.estado === PEDIDO_ESTADOS.EN_PREPARACION).length;
  const pedidos_listos       = MockDB.pedidos.filter(p => p.estado === PEDIDO_ESTADOS.LISTO).length;
  const mesas_liberables     = MockDB.mesas.filter(m => m.estado === MESA_ESTADOS.LIBERABLE).length;
  const solicitudes_pend     =
    MockDB.solicitudes_personal.filter(s => s.estado === "pendiente").length +
    MockDB.solicitudes_ingredientes.filter(s => s.estado === "pendiente").length;

  // Notificaciones no leídas para el rol activo (fuente real: NotifService)
  const notifs_no_leidas = rol ? NotifService.contarNoLeidas(rol) : 0;

  return apiResponse({
    timestamp:            new Date().toISOString(),
    pedidos_pendientes,
    pedidos_en_prep,
    pedidos_listos,
    mesas_liberables,
    solicitudes_pendientes: solicitudes_pend,
    notificaciones_no_leidas: notifs_no_leidas,
    hay_novedades:          pedidos_pendientes > 0 || solicitudes_pend > 0 || mesas_liberables > 0,
  });
}
