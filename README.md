# RestaurOS v2 — Flujo Operativo Real

## Arquitectura implementada

### Archivos nuevos / modificados

| Archivo | Acción | Descripción |
|---|---|---|
| `js/businessLogic.js` | **NUEVO** | Enums, máquinas de estado, validadores |
| `js/notificationService.js` | **NUEVO** | Notificaciones automáticas por rol |
| `api/mockData.js` | **REEMPLAZAR** | MockDB con nuevos estados |
| `services/api.js` | **REEMPLAZAR** | API con validación de transiciones |
| `js/pages_v2_fragments.js` | **NUEVO** | Fragmentos para reemplazar en pages.js |
| `css_additions.css` | **AGREGAR** | Estilos para nuevos estados |

---

## Máquina de estados — PEDIDOS

```
MESERO crea pedido
       ↓
   [PENDIENTE]
       ↓ cocinero/jefe_cocina: tomar_pedido
   [EN_PREPARACION]
       ↓ cocinero/jefe_cocina: marcar_listo → notifica mesero
   [LISTO]
       ↓ mesero: retirar_pedido
   [RETIRADO]
       ↓ mesero: entregar_pedido
   [ENTREGADO]
       ↓ mesero: solicitar_cuenta
   [CUENTA_SOLICITADA]
       ↓ mesero/admin: marcar_pagado → notifica portero
   [PAGADO]

   Desde casi cualquier estado:
       ↓ mesero/admin/jefe_meseros: cancelar_pedido → notifica portero
   [CANCELADO]
```

## Máquina de estados — MESAS

```
[DISPONIBLE]
     ↓ portero: reservar
[RESERVADA]
     ↓ portero: confirmar_llegada
[OCUPADA]
     ↓ sistema (al crear pedido): activar_pedido
[CON_PEDIDO]
     ↓ sistema (al entregar/solicitar_cuenta): pasar_a_pago
[PENDIENTE_PAGO]
     ↓ sistema (al pagar/cancelar): habilitar_liberacion
[LIBERABLE]
     ↓ portero: liberar_mesa (SOLO si no hay pedidos activos)
[DISPONIBLE]
```

---

## Reglas de negocio críticas

### Mesa NO puede liberarse si:
- Existe un pedido en estado: `pendiente`, `en_preparacion`, `listo`, `retirado`, `entregado`, o `cuenta_solicitada`
- La validación ocurre en `puedeLiberarseMesa()` → `ejecutarAccionMesa()` → devuelve error 409

### Pedido NO puede saltar estados:
- La validación en `validarTransicionPedido()` verifica que el estado actual esté en el array `desde`
- Si no corresponde → devuelve error 403 con mensaje legible

### Solo roles autorizados:
- Cada transición tiene un array `roles` — si el rol del usuario no está → error 403

---

## Notificaciones automáticas

| Evento | Quién recibe |
|---|---|
| Pedido creado | cocinero, jefe_cocina |
| Pedido listo | mesero, jefe_meseros |
| Pedido entregado | administrador, jefe_meseros |
| Cuenta solicitada | administrador, dueno |
| Cuenta pagada | portero, jefe_meseros |
| Mesa liberable | portero, jefe_meseros |
| Pedido cancelado | portero |

---

## Pasos de integración

### 1. Copiar archivos nuevos
```
js/businessLogic.js       → tu proyecto
js/notificationService.js → tu proyecto
api/mockData.js           → reemplaza el existente
services/api.js           → reemplaza el existente
```

### 2. Agregar CSS
Copiar el contenido de `css_additions.css` al final de `css/styles.css`.

### 3. Modificar pages.js

**Al inicio del archivo, agregar imports:**
```js
import { ejecutarAccionPedido, ejecutarAccionMesa, getMesasConEstadoPedido, getPedidosListosParaMesero } from '../services/api.js';
import { PEDIDO_ESTADOS, MESA_ESTADOS, labelEstado } from '../js/businessLogic.js';
import { NotifService } from '../js/notificationService.js';
```

**Reemplazar `renderPedidos`** con la versión en `pages_v2_fragments.js`

**Reemplazar `MesaActions`** con `MesaActionsV2`

**Agregar a `PageActions`** las funciones de `PageActionsV2`

**Reemplazar `renderMesas`** con `renderMesasV2`

**Agregar `badgeEstadoPedidoV2`** y `badgeEstadoMesa` (también actualizar `components/ui.js`)

### 4. Modificar dashboard.html

En el bloque `<script type="module">`:

```js
// Reemplazar
window.Mesas = MesaActions;
// Por
window.Mesas = MesaActionsV2;

// En el switch de navigate, reemplazar
case "mesas": await renderMesas(contenedor); break;
// Por
case "mesas": await renderMesasV2(contenedor, usuario); break;

// Actualizar el botón de notificaciones
// id="btn-notif" onclick="abrirPanelNotificaciones(usuario)"
```

---

## Preparación para migración a Node.js + MySQL

### Endpoints REST implementados (comentados en api.js)

```
POST   /api/pedidos                        Crear pedido
PUT    /api/pedidos/:id/tomar              Cocinero toma pedido
PUT    /api/pedidos/:id/listo              Cocinero marca listo
PUT    /api/pedidos/:id/retirar            Mesero retira
PUT    /api/pedidos/:id/entregar           Mesero entrega
PUT    /api/pedidos/:id/solicitar-cuenta   Solicitar cuenta
PUT    /api/pedidos/:id/pagar              Marcar pagado
PUT    /api/pedidos/:id/cancelar           Cancelar

PUT    /api/mesas/:id/reservar             Reservar
PUT    /api/mesas/:id/confirmar-llegada    Confirmar llegada
PUT    /api/mesas/:id/ocupar               Ocupar sin reserva
PUT    /api/mesas/:id/liberar              Portero libera (con validación)

GET    /api/notificaciones?rol=mesero      Notif por rol
POST   /api/notificaciones/:id/leida       Marcar leída
```

### Estructura MySQL sugerida

```sql
-- Estados como ENUM
ALTER TABLE pedidos ADD COLUMN estado ENUM(
  'pendiente','en_preparacion','listo','retirado',
  'entregado','cuenta_solicitada','pagado','cancelado'
) NOT NULL DEFAULT 'pendiente';

ALTER TABLE mesas ADD COLUMN estado ENUM(
  'disponible','reservada','ocupada',
  'con_pedido','pendiente_pago','liberable'
) NOT NULL DEFAULT 'disponible';

-- Historial de pedido
CREATE TABLE pedido_historial (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT NOT NULL,
  estado VARCHAR(30) NOT NULL,
  usuario_id INT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id)
);

-- Notificaciones
CREATE TABLE notificaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipo VARCHAR(40) NOT NULL,
  mensaje TEXT NOT NULL,
  roles JSON NOT NULL,
  pedido_id INT,
  mesa_num INT,
  leida BOOLEAN DEFAULT FALSE,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## Posibles errores de lógica identificados (y cómo se resuelven)

| Problema | Solución implementada |
|---|---|
| Portero libera mesa con pedido activo | `puedeLiberarseMesa()` bloquea con error 409 |
| Mesero entrega pedido que no retiró | Transición `listo → entregado` eliminada; ahora es `listo → retirado → entregado` |
| Cocinero salta a "listo" sin "en_preparacion" | Máquina de estados solo permite `pendiente → en_preparacion` |
| Dos cocineros toman el mismo pedido | `tomar_pedido` solo funciona desde `pendiente`; el segundo encuentra estado diferente |
| Mesa queda en "con_pedido" después de pago | `_sincronizarEstadoMesa()` actualiza automáticamente a `liberable` |
| Rol sin permiso cambia estado | `validarTransicionPedido()` retorna error 403 antes de ejecutar |
