/**
 * SERVICIO DE AUTENTICACIÓN
 * Maneja sesión, roles y permisos
 */

import { login as apiLogin } from './api.js';

// Permisos por rol
const PERMISOS = {
  administrador: ["*"], // Acceso total
  dueno: ["finanzas", "empleados_view", "stock_view", "pedidos_view", "solicitudes_view", "platillos_mas_pedidos"],
  jefe_meseros: ["horarios_meseros", "horarios_porteros", "solicitudes_personal", "equipos_cocina"],
  jefe_cocina: ["horarios_cocineros", "stock_view", "solicitudes_ingredientes", "solicitudes_personal", "reservaciones_platillos", "pedidos_aprobar"],
  mesero: ["pedidos_crear", "pedidos_view", "platillos_view", "horario_view", "turno"],
  cocinero: ["pedidos_view", "stock_view", "solicitudes_ingredientes", "reservaciones_platillos", "horario_view", "turno"],
  portero: ["mesas_view", "reservaciones_view", "horario_view", "turno"]
};

export const AuthService = {
  // Login
  async login(email, password) {
    try {
      const res = await apiLogin(email, password);
      if (res.status !== 200) throw new Error(res.message);
      // Guardar en sessionStorage
      sessionStorage.setItem("auth_token", res.data.token);
      sessionStorage.setItem("usuario", JSON.stringify(res.data.usuario));
      return { ok: true, usuario: res.data.usuario };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },

  // Logout
  logout() {
    sessionStorage.removeItem("auth_token");
    sessionStorage.removeItem("usuario");
    window.location.href = "index.html";
  },

  // Obtener usuario actual
  getUsuario() {
    try {
      return JSON.parse(sessionStorage.getItem("usuario"));
    } catch { return null; }
  },

  // Verificar si está autenticado
  isAuthenticated() {
    const token = sessionStorage.getItem("auth_token");
    const usuario = this.getUsuario();
    if (!token || !usuario) return false;
    try {
      const payload = JSON.parse(atob(token));
      return payload.exp > Date.now();
    } catch { return false; }
  },

  // Verificar permiso
  hasPermiso(permiso) {
    const usuario = this.getUsuario();
    if (!usuario) return false;
    const permisos = PERMISOS[usuario.rol] || [];
    return permisos.includes("*") || permisos.includes(permiso);
  },

  // Obtener nombre legible del rol
  getNombreRol(rol) {
    const nombres = {
      administrador: "Administrador", dueno: "Dueño",
      jefe_meseros: "Jefe de Meseros", jefe_cocina: "Jefe de Cocina",
      mesero: "Mesero", cocinero: "Cocinero", portero: "Portero / Recepcionista"
    };
    return nombres[rol] || rol;
  },

  // Obtener icono del rol
  getIconoRol(rol) {
    const iconos = {
      administrador: "bi-shield-fill", dueno: "bi-building-fill",
      jefe_meseros: "bi-person-fill-gear", jefe_cocina: "bi-fire",
      mesero: "bi-person-fill", cocinero: "bi-egg-fried", portero: "bi-door-open-fill"
    };
    return iconos[rol] || "bi-person";
  },

  // Color badge del rol
  getColorRol(rol) {
    const colores = {
      administrador: "danger", dueno: "dark", jefe_meseros: "primary",
      jefe_cocina: "warning", mesero: "success", cocinero: "info", portero: "secondary"
    };
    return colores[rol] || "secondary";
  },

  // Proteger página - redirigir si no autenticado
  protegerPagina() {
    if (!this.isAuthenticated()) {
      window.location.href = "index.html";
      return false;
    }
    return true;
  }
};

export default AuthService;
