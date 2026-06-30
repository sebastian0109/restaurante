/**
 * ══════════════════════════════════════════════════════
 *  RESTAUROS — SCHEDULER DE NOTIFICACIONES POR TIEMPO
 *  Archivo: js/notifScheduler.js
 *
 *  Revisa periódicamente (setInterval) condiciones de negocio
 *  que NO nacen de una acción explícita de un usuario, sino
 *  del paso del tiempo, y dispara notificaciones automáticas:
 *
 *    • Pedido retrasado (pendiente/en_preparación por mucho tiempo)
 *    • Mesa ocupada demasiado tiempo sin pedido
 *    • Cliente esperando hace más de 15 minutos (mesa reservada
 *      sin confirmar llegada, pasada la hora de reserva)
 *    • Reserva próxima a comenzar (dentro de 30 min)
 *    • Turno próximo a finalizar (30 min / 15 min antes de las 8h)
 *    • Horas extra detectadas (turno activo que superó las 8h)
 *    • Ingrediente próximo a agotarse (entre stock_minimo y 1.5x ese mínimo)
 *    • Stock crítico (igual o por debajo del mínimo)
 *
 *  Cada condición usa un "_yaNotificado" Set en memoria de
 *  sesión para no espamear la misma alerta cada ciclo —
 *  en producción esto sería una columna `ultima_alerta` por
 *  fila, o un job en el backend (cron / BullMQ) que hace
 *  exactamente este mismo chequeo contra MySQL.
 *
 *  USO:
 *    import { NotifScheduler } from './notifScheduler.js';
 *    NotifScheduler.start(); // se llama una vez en dashboard.html
 *    NotifScheduler.stop();  // al cerrar sesión, opcional
 * ══════════════════════════════════════════════════════
 */

import { MockDB } from '../api/mockData.js';
import { NotifService } from './notificationService.js';
import { NOTIF_TIPOS } from './businessLogic.js';

// Umbrales de negocio (en minutos) — fáciles de ajustar
const UMBRAL = {
  PEDIDO_RETRASO_MIN:          25, // pendiente/en_preparación más de esto = retrasado
  MESA_OCUPADA_SIN_PEDIDO_MIN: 20,
  RESERVA_PROXIMA_MIN:         30,
  RESERVA_TARDANZA_MIN:        15, // cliente "esperando" tras hora de reserva sin confirmar
  TURNO_DURACION_NORMAL_MIN:   480, // 8 horas
  TURNO_AVISO_30:              30,
  TURNO_AVISO_15:              15,
};

// Marca qué alertas ya se dispararon esta sesión, para no repetir
// la misma notificación en cada tick (clave compuesta tipo+entidad).
const _yaNotificado = new Set();

function _marcarUnaVez(clave, fn) {
  if (_yaNotificado.has(clave)) return;
  _yaNotificado.add(clave);
  fn();
}

function _minutosDesde(iso) {
  return (Date.now() - new Date(iso).getTime()) / 60000;
}

export const NotifScheduler = {
  _intervalId: null,

  /**
   * Inicia el scheduler. Por defecto revisa cada 60s — suficiente
   * para alertas de minutos sin saturar el navegador.
   */
  start(intervalMs = 60000) {
    this.stop();
    this._tick(); // primera pasada inmediata
    this._intervalId = setInterval(() => this._tick(), intervalMs);
    console.log(`[NotifScheduler] Activo cada ${intervalMs / 1000}s`);
  },

  stop() {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  },

  _tick() {
    try {
      this._revisarPedidosRetrasados();
      this._revisarMesasOcupadasLargo();
      this._revisarReservasProximas();
      this._revisarTurnosPorFinalizar();
      this._revisarHorasExtra();
      this._revisarStock();
      this._revisarVentas();
      this._revisarResumenDiario();
    } catch (e) {
      console.warn("[NotifScheduler] Error en tick:", e.message);
    }
  },

  // ── Pedido pendiente/en_preparación hace demasiado tiempo ──
  _revisarPedidosRetrasados() {
    MockDB.pedidos
      .filter(p => ["pendiente", "en_preparacion"].includes(p.estado))
      .forEach(p => {
        const minutos = _minutosDesde(p.fecha);
        if (minutos >= UMBRAL.PEDIDO_RETRASO_MIN) {
          _marcarUnaVez(`pedido_retrasado_${p.id}`, () => {
            NotifService.crearNotificacion({
              tipo: NOTIF_TIPOS.PEDIDO_RETRASADO,
              mensaje: `⏳ Pedido #${p.id} (Mesa ${p.mesa}) lleva ${Math.round(minutos)} min sin completarse`,
              roles: ["cocinero", "jefe_cocina", "jefe_meseros"],
              pedido_id: p.id,
              mesa_num: p.mesa,
            });
          });
        }
      });
  },

  // ── Mesa ocupada sin pedido activo por mucho tiempo ──
  _revisarMesasOcupadasLargo() {
    MockDB.mesas
      .filter(m => m.estado === "ocupada")
      .forEach(m => {
        // Sin timestamp de "desde cuándo está ocupada" en el modelo actual,
        // se usa el campo m._ocupada_desde si existe (lo setea ejecutarAccionMesa);
        // si no existe, se omite la alerta para esa mesa.
        if (!m._ocupada_desde) return;
        const minutos = _minutosDesde(m._ocupada_desde);
        if (minutos >= UMBRAL.MESA_OCUPADA_SIN_PEDIDO_MIN) {
          _marcarUnaVez(`mesa_ocupada_largo_${m.id}`, () => {
            NotifService.crearNotificacion({
              tipo: NOTIF_TIPOS.MESA_OCUPADA_LARGO,
              mensaje: `🪑 Mesa ${m.numero} está ocupada hace ${Math.round(minutos)} min sin pedido registrado`,
              roles: ["mesero", "jefe_meseros"],
              mesa_num: m.numero,
            });
          });
        }
      });
  },

  // ── Reservas próximas a comenzar / cliente esperando ──
  _revisarReservasProximas() {
    const ahora = Date.now();
    MockDB.reservaciones
      .filter(r => r.tipo === "mesa" && r.estado === "confirmada")
      .forEach(r => {
        const minutosParaReserva = (new Date(r.fecha).getTime() - ahora) / 60000;

        // Próxima a comenzar (dentro de la ventana de aviso)
        if (minutosParaReserva > 0 && minutosParaReserva <= UMBRAL.RESERVA_PROXIMA_MIN) {
          _marcarUnaVez(`reserva_proxima_${r.id}`, () => {
            NotifService.crearNotificacion({
              tipo: NOTIF_TIPOS.RESERVA_PROXIMA,
              mensaje: `⏰ Reserva de "${r.cliente}" comienza en ${Math.round(minutosParaReserva)} min (${r.personas} personas)`,
              roles: ["portero", "jefe_meseros"],
              meta: { reserva_id: r.id },
            });
          });
        }

        // Cliente esperando: pasó la hora reservada y la mesa sigue como "reservada"
        // (no se confirmó llegada todavía)
        if (minutosParaReserva < -UMBRAL.RESERVA_TARDANZA_MIN) {
          const mesa = MockDB.mesas.find(m => m.id === r.mesa_id);
          if (mesa && mesa.estado === "reservada") {
            _marcarUnaVez(`cliente_esperando_${r.id}`, () => {
              NotifService.crearNotificacion({
                tipo: NOTIF_TIPOS.CLIENTE_ESPERANDO,
                mensaje: `🙋 Posible cliente esperando: reserva de "${r.cliente}" sin confirmar hace más de ${UMBRAL.RESERVA_TARDANZA_MIN} min`,
                roles: ["portero", "jefe_meseros"],
                meta: { reserva_id: r.id },
              });
            });
          }
        }
      });
  },

  // ── Turnos activos próximos a cumplir su duración normal ──
  _revisarTurnosPorFinalizar() {
    MockDB.turnos_activos
      .filter(t => t.estado === "activo")
      .forEach(t => {
        const inicio = new Date(`${t.fecha}T${t.hora_inicio}:00`);
        const minutosTranscurridos = (Date.now() - inicio.getTime()) / 60000;
        const minutosRestantes = UMBRAL.TURNO_DURACION_NORMAL_MIN - minutosTranscurridos;
        const emp = MockDB.usuarios.find(u => u.id === t.empleado_id);
        if (!emp) return;

        if (minutosRestantes <= UMBRAL.TURNO_AVISO_30 && minutosRestantes > UMBRAL.TURNO_AVISO_15) {
          _marcarUnaVez(`turno_30_${t.id}`, () => {
            NotifService.crearNotificacion({
              tipo: NOTIF_TIPOS.TURNO_30MIN,
              mensaje: `🕐 Tu turno termina en 30 min`,
              roles: [emp.rol],
              meta: { empleado_id: emp.id },
            });
          });
        }

        if (minutosRestantes <= UMBRAL.TURNO_AVISO_15 && minutosRestantes > 0) {
          _marcarUnaVez(`turno_15_${t.id}`, () => {
            NotifService.crearNotificacion({
              tipo: NOTIF_TIPOS.TURNO_15MIN,
              mensaje: `🕐 Tu turno termina en 15 min`,
              roles: [emp.rol],
              meta: { empleado_id: emp.id },
            });
          });
        }
      });
  },

  // ── Turno activo que superó su duración normal (horas extra) ──
  _revisarHorasExtra() {
    MockDB.turnos_activos
      .filter(t => t.estado === "activo")
      .forEach(t => {
        const inicio = new Date(`${t.fecha}T${t.hora_inicio}:00`);
        const minutosTranscurridos = (Date.now() - inicio.getTime()) / 60000;
        if (minutosTranscurridos > UMBRAL.TURNO_DURACION_NORMAL_MIN) {
          const emp = MockDB.usuarios.find(u => u.id === t.empleado_id);
          if (!emp) return;
          _marcarUnaVez(`horas_extra_${t.id}`, () => {
            NotifService.crearNotificacion({
              tipo: NOTIF_TIPOS.HORAS_EXTRA,
              mensaje: `⏱️ ${emp.nombre} superó su jornada normal — posibles horas extra`,
              roles: ["jefe_meseros", "jefe_cocina", "administrador"],
              meta: { empleado_id: emp.id },
            });
          });
        }
      });
  },

  // ── Stock crítico / próximo a agotarse ──
  _revisarStock() {
    MockDB.ingredientes.forEach(ing => {
      if (ing.stock <= ing.stock_minimo) {
        _marcarUnaVez(`stock_critico_${ing.id}`, () => {
          NotifService.crearNotificacion({
            tipo: NOTIF_TIPOS.STOCK_CRITICO,
            mensaje: `🚨 Stock crítico: ${ing.nombre} (${ing.stock} ${ing.unidad}, mínimo ${ing.stock_minimo})`,
            roles: ["jefe_cocina", "dueno", "administrador"],
            meta: { ingrediente_id: ing.id },
          });
        });
      } else if (ing.stock <= ing.stock_minimo * 1.5) {
        _marcarUnaVez(`stock_proximo_${ing.id}`, () => {
          NotifService.crearNotificacion({
            tipo: NOTIF_TIPOS.STOCK_PROXIMO_AGOTAR,
            mensaje: `📉 ${ing.nombre} se está agotando (${ing.stock} ${ing.unidad} restantes)`,
            roles: ["jefe_cocina"],
            meta: { ingrediente_id: ing.id },
          });
        });
      }
    });
  },

  // ── Ventas récord o caída significativa (compara el día de hoy vs. promedio histórico) ──
  _revisarVentas() {
    const dias = MockDB.finanzas?.ganancias?.dia;
    if (!dias || dias.length < 3) return;

    const hoy = dias[dias.length - 1];
    const historico = dias.slice(0, -1);
    const promedio = historico.reduce((a, b) => a + b, 0) / historico.length;

    const claveDia = new Date().toISOString().split("T")[0];

    if (hoy >= promedio * 1.25) {
      _marcarUnaVez(`ventas_record_${claveDia}`, () => {
        NotifService.crearNotificacion({
          tipo: NOTIF_TIPOS.VENTAS_RECORD,
          mensaje: `🏆 Ventas récord hoy: $${hoy.toLocaleString("es-CL")} (vs. promedio de $${Math.round(promedio).toLocaleString("es-CL")})`,
          roles: ["dueno"],
        });
      });
    } else if (hoy <= promedio * 0.6) {
      _marcarUnaVez(`ventas_caida_${claveDia}`, () => {
        NotifService.crearNotificacion({
          tipo: NOTIF_TIPOS.VENTAS_CAIDA,
          mensaje: `📉 Caída significativa en ventas hoy: $${hoy.toLocaleString("es-CL")} (vs. promedio de $${Math.round(promedio).toLocaleString("es-CL")})`,
          roles: ["dueno"],
        });
      });
    }
  },

  // ── Resumen diario automático (una vez por día, al detectar el cambio de fecha) ──
  _revisarResumenDiario() {
    const claveDia = new Date().toISOString().split("T")[0];
    _marcarUnaVez(`resumen_diario_${claveDia}`, () => {
      const dias = MockDB.finanzas?.ganancias?.dia || [];
      const hoy = dias[dias.length - 1] ?? 0;
      const pedidosHoy = MockDB.pedidos.length;
      NotifService.crearNotificacion({
        tipo: NOTIF_TIPOS.RESUMEN_DIARIO,
        mensaje: `📊 Resumen del día: $${hoy.toLocaleString("es-CL")} en ventas, ${pedidosHoy} pedidos registrados`,
        roles: ["dueno"],
      });
    });

    // Resumen semanal: solo los domingos (getDay() === 0), una vez por semana
    if (new Date().getDay() === 0) {
      const claveSemana = `${claveDia}-semana`;
      _marcarUnaVez(`resumen_semanal_${claveSemana}`, () => {
        const semanas = MockDB.finanzas?.ganancias?.semana || [];
        const estaSemana = semanas[semanas.length - 1] ?? 0;
        NotifService.crearNotificacion({
          tipo: NOTIF_TIPOS.RESUMEN_SEMANAL,
          mensaje: `📈 Resumen semanal: $${estaSemana.toLocaleString("es-CL")} en ventas esta semana`,
          roles: ["dueno"],
        });
      });
    }
  },

  /** Limpia las marcas de "ya notificado" — útil tras testing o reset de datos. */
  resetMarcas() {
    _yaNotificado.clear();
  },
};

window.NotifScheduler = NotifScheduler;
