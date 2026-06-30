/**
 * SIDEBAR DINÁMICO POR ROL
 * Genera el menú lateral según el rol del usuario autenticado
 */

import AuthService from '../services/auth.js';

// Definición de menús por rol
const MENUS = {
  administrador: [
    { seccion: "Sistema", items: [
      { id: "dashboard", icon: "bi-speedometer2", label: "Dashboard", badge: null },
      { id: "usuarios", icon: "bi-people-fill", label: "Usuarios & Roles", badge: null },
    ]},
    { seccion: "Operaciones", items: [
      { id: "pedidos", icon: "bi-receipt-cutoff", label: "Pedidos", badge: "live" },
      { id: "platillos", icon: "bi-egg-fried", label: "Platillos", badge: null },
      { id: "ingredientes", icon: "bi-basket3-fill", label: "Ingredientes", badge: null },
    ]},
    { seccion: "Gestión", items: [
      { id: "horarios", icon: "bi-calendar3", label: "Horarios", badge: null },
      { id: "reservaciones", icon: "bi-bookmark-star-fill", label: "Reservaciones", badge: null },
      { id: "mesas", icon: "bi-grid-3x3-gap-fill", label: "Mesas", badge: null },
    ]},
    { seccion: "Reportes", items: [
      { id: "finanzas", icon: "bi-bar-chart-fill", label: "Finanzas", badge: null },
      { id: "stock", icon: "bi-boxes", label: "Stock General", badge: null },
      { id: "solicitudes", icon: "bi-bell-fill", label: "Solicitudes", badge: "count" },
    ]}
  ],

  dueno: [
    { seccion: "Principal", items: [
      { id: "dashboard", icon: "bi-speedometer2", label: "Dashboard", badge: null },
      { id: "finanzas", icon: "bi-bar-chart-fill", label: "Balance Financiero", badge: null },
    ]},
    { seccion: "Reportes", items: [
      { id: "pedidos", icon: "bi-receipt-cutoff", label: "Pedidos", badge: null },
      { id: "platillos_ranking", icon: "bi-trophy-fill", label: "Platillos Populares", badge: null },
      { id: "stock", icon: "bi-boxes", label: "Stock General", badge: null },
    ]},
    { seccion: "RRHH", items: [
      { id: "empleados", icon: "bi-people-fill", label: "Empleados", badge: null },
      { id: "solicitudes", icon: "bi-person-plus-fill", label: "Solicitudes Personal", badge: "count" },
      { id: "ingredientes_sol", icon: "bi-basket-fill", label: "Pedidos Ingredientes", badge: null },
    ]}
  ],

  jefe_meseros: [
    { seccion: "Principal", items: [
      { id: "dashboard", icon: "bi-speedometer2", label: "Dashboard", badge: null },
    ]},
    { seccion: "Horarios", items: [
      { id: "horarios_meseros", icon: "bi-calendar-check-fill", label: "Horarios Meseros", badge: null },
      { id: "horarios_porteros", icon: "bi-calendar2-week-fill", label: "Horarios Porteros", badge: null },
    ]},
    { seccion: "Recursos", items: [
      { id: "equipos_cocina", icon: "bi-tools", label: "Equipos de Cocina", badge: null },
      { id: "solicitudes", icon: "bi-person-plus-fill", label: "Solicitar Personal", badge: null },
    ]}
  ],

  jefe_cocina: [
    { seccion: "Principal", items: [
      { id: "dashboard", icon: "bi-speedometer2", label: "Dashboard", badge: null },
    ]},
    { seccion: "Cocina", items: [
      { id: "pedidos", icon: "bi-receipt-cutoff", label: "Pedidos", badge: "live" },
      { id: "stock", icon: "bi-boxes", label: "Stock Ingredientes", badge: null },
      { id: "reservaciones_platillos", icon: "bi-bookmark-fill", label: "Reservas Platillos", badge: null },
    ]},
    { seccion: "Gestión", items: [
      { id: "horarios_cocineros", icon: "bi-calendar-fill", label: "Horarios Cocineros", badge: null },
      { id: "solicitudes_ing", icon: "bi-cart-plus-fill", label: "Pedidos Ingredientes", badge: "count" },
      { id: "solicitudes_personal", icon: "bi-person-plus-fill", label: "Solicitar Personal", badge: null },
    ]}
  ],

  mesero: [
    { seccion: "Mi Turno", items: [
      { id: "dashboard", icon: "bi-speedometer2", label: "Dashboard", badge: null },
      { id: "turno", icon: "bi-clock-fill", label: "Mi Turno", badge: null },
      { id: "horario", icon: "bi-calendar3", label: "Mi Horario", badge: null },
    ]},
    { seccion: "Operaciones", items: [
      { id: "nuevo_pedido", icon: "bi-plus-circle-fill", label: "Nuevo Pedido", badge: null },
      { id: "pedidos", icon: "bi-receipt-cutoff", label: "Mis Pedidos", badge: "live" },
      { id: "platillos", icon: "bi-menu-button-wide-fill", label: "Carta / Platillos", badge: null },
    ]}
  ],

  cocinero: [
    { seccion: "Mi Turno", items: [
      { id: "dashboard", icon: "bi-speedometer2", label: "Dashboard", badge: null },
      { id: "turno", icon: "bi-clock-fill", label: "Mi Turno", badge: null },
      { id: "horario", icon: "bi-calendar3", label: "Mi Horario", badge: null },
    ]},
    { seccion: "Cocina", items: [
      { id: "pedidos", icon: "bi-receipt-cutoff", label: "Pedidos en Cola", badge: "live" },
      { id: "stock", icon: "bi-boxes", label: "Stock Ingredientes", badge: null },
      { id: "reservaciones_platillos", icon: "bi-bookmark-fill", label: "Reservas Platillos", badge: null },
    ]},
    { seccion: "Solicitudes", items: [
      { id: "solicitudes_ing", icon: "bi-cart-plus-fill", label: "Pedir Ingredientes", badge: null },
    ]}
  ],

  portero: [
    { seccion: "Mi Turno", items: [
      { id: "dashboard", icon: "bi-speedometer2", label: "Dashboard", badge: null },
      { id: "turno", icon: "bi-clock-fill", label: "Mi Turno", badge: null },
      { id: "horario", icon: "bi-calendar3", label: "Mi Horario", badge: null },
    ]},
    { seccion: "Operaciones", items: [
      { id: "mesas", icon: "bi-grid-3x3-gap-fill", label: "Mesas Disponibles", badge: null },
      { id: "reservaciones", icon: "bi-bookmark-star-fill", label: "Reservaciones", badge: null },
      { id: "reservaciones_platillos", icon: "bi-bookmark-fill", label: "Reservas Platillos", badge: null },
    ]}
  ]
};

export function renderSidebar(usuario) {
  const menu = MENUS[usuario.rol] || MENUS.mesero;
  const rolNombre = AuthService.getNombreRol(usuario.rol);
  const rolColor = AuthService.getColorRol(usuario.rol);
  const rolIcono = AuthService.getIconoRol(usuario.rol);

  const seccionesHTML = menu.map(seccion => `
    <div class="sidebar-section mb-1">
      <div class="sidebar-section-title px-3 py-1 text-uppercase fw-bold" style="font-size:0.65rem;letter-spacing:0.1em;color:#9ca3af;">${seccion.seccion}</div>
      ${seccion.items.map(item => `
        <a href="#" class="sidebar-link d-flex align-items-center gap-3 px-3 py-2 text-decoration-none rounded-2 mx-2 mb-1 transition-all"
           data-page="${item.id}" onclick="App.navigate('${item.id}');return false;">
          <i class="bi ${item.icon} fs-6 sidebar-icon"></i>
          <span class="sidebar-label">${item.label}</span>
          ${item.badge === "live" ? '<span class="badge bg-danger ms-auto pulse-badge">LIVE</span>' : ""}
          ${item.badge === "count" ? '<span class="badge bg-warning text-dark ms-auto" id="badge-'+item.id+'">0</span>' : ""}
        </a>
      `).join("")}
    </div>
  `).join("");

  return `
    <!-- Header usuario -->
    <div class="sidebar-user p-3 mb-2" style="border-bottom:1px solid rgba(255,255,255,0.08);">
      <div class="d-flex align-items-center gap-3">
        <div class="avatar-circle bg-${rolColor} bg-opacity-20 text-${rolColor} fw-bold d-flex align-items-center justify-content-center flex-shrink-0"
             style="width:42px;height:42px;border-radius:50%;font-size:0.85rem;border:2px solid rgba(255,255,255,0.1);">
          ${usuario.avatar}
        </div>
        <div class="overflow-hidden">
          <div class="fw-semibold text-white text-truncate" style="font-size:0.875rem;">${usuario.nombre}</div>
          <span class="badge bg-${rolColor} bg-opacity-75 mt-1" style="font-size:0.65rem;">
            <i class="bi ${rolIcono} me-1"></i>${rolNombre}
          </span>
        </div>
      </div>
    </div>
    <!-- Menú -->
    <nav class="sidebar-nav flex-grow-1 overflow-auto py-2">
      ${seccionesHTML}
    </nav>
    <!-- Footer sidebar -->
    <div class="sidebar-footer p-3 mt-auto" style="border-top:1px solid rgba(255,255,255,0.08);">
      <button onclick="App.logout()" class="btn btn-sm w-100 d-flex align-items-center justify-content-center gap-2"
              style="background:rgba(255,255,255,0.06);color:#9ca3af;border:1px solid rgba(255,255,255,0.1);">
        <i class="bi bi-box-arrow-left"></i><span>Cerrar sesión</span>
      </button>
    </div>`;
}

export function activarLink(pageId) {
  document.querySelectorAll(".sidebar-link").forEach(link => {
    link.classList.remove("active");
    if (link.dataset.page === pageId) link.classList.add("active");
  });
}
