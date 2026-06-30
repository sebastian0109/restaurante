/**
 * COMPONENTES UI REUTILIZABLES
 * Toast, Modal, Loader, Tabla, Badges, etc.
 */

// ══════════════════════════════════════════════════════
//  TOAST NOTIFICATIONS
// ══════════════════════════════════════════════════════
export const Toast = {
  container: null,

  init() {
    if (!this.container) {
      this.container = document.createElement("div");
      this.container.id = "toast-container";
      this.container.className = "toast-container position-fixed top-0 end-0 p-3";
      this.container.style.zIndex = "9999";
      document.body.appendChild(this.container);
    }
  },

  show(mensaje, tipo = "success", duracion = 3500) {
    this.init();
    const iconos = { success: "bi-check-circle-fill", danger: "bi-x-circle-fill", warning: "bi-exclamation-triangle-fill", info: "bi-info-circle-fill" };
    const id = "toast-" + Date.now();
    const html = `
      <div id="${id}" class="toast align-items-center text-bg-${tipo} border-0 shadow" role="alert" aria-live="assertive" aria-atomic="true" data-bs-autohide="true" data-bs-delay="${duracion}">
        <div class="d-flex">
          <div class="toast-body d-flex align-items-center gap-2">
            <i class="bi ${iconos[tipo] || 'bi-info-circle-fill'} fs-5"></i>
            <span>${mensaje}</span>
          </div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
      </div>`;
    this.container.insertAdjacentHTML("beforeend", html);
    const el = document.getElementById(id);
    const toast = new bootstrap.Toast(el);
    toast.show();
    el.addEventListener("hidden.bs.toast", () => el.remove());
  },

  success: (msg) => Toast.show(msg, "success"),
  error: (msg) => Toast.show(msg, "danger"),
  warning: (msg) => Toast.show(msg, "warning"),
  info: (msg) => Toast.show(msg, "info")
};

// ══════════════════════════════════════════════════════
//  LOADER / SPINNER
// ══════════════════════════════════════════════════════
export const Loader = {
  show(containerId = null, msg = "Cargando...") {
    const html = `<div class="loader-overlay d-flex flex-column align-items-center justify-content-center gap-3 py-5">
      <div class="spinner-border text-primary" role="status" style="width:3rem;height:3rem;"></div>
      <p class="text-muted mb-0 fw-medium">${msg}</p>
    </div>`;
    if (containerId) {
      const el = document.getElementById(containerId);
      if (el) el.innerHTML = html;
    } else {
      let overlay = document.getElementById("global-loader");
      if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "global-loader";
        overlay.className = "position-fixed top-0 start-0 w-100 h-100 bg-white bg-opacity-75 d-flex align-items-center justify-content-center";
        overlay.style.zIndex = "9998";
        overlay.innerHTML = `<div class="text-center"><div class="spinner-border text-primary" style="width:3.5rem;height:3.5rem;"></div><p class="mt-3 fw-semibold text-primary">${msg}</p></div>`;
        document.body.appendChild(overlay);
      }
    }
  },

  hide(containerId = null) {
    if (containerId) {
      const el = document.getElementById(containerId);
      if (el) el.innerHTML = "";
    } else {
      const overlay = document.getElementById("global-loader");
      if (overlay) overlay.remove();
    }
  }
};

// ══════════════════════════════════════════════════════
//  MODAL GENÉRICO
// ══════════════════════════════════════════════════════
export const Modal = {
  show({ id = "modal-gen", titulo = "", cuerpo = "", pie = "", size = "", onShow = null }) {
    let modal = document.getElementById(id);
    if (modal) modal.remove();
    const html = `
      <div class="modal fade" id="${id}" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog ${size ? 'modal-' + size : ''} modal-dialog-centered modal-dialog-scrollable">
          <div class="modal-content border-0 shadow-lg">
            <div class="modal-header bg-primary text-white border-0">
              <h5 class="modal-title fw-bold">${titulo}</h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">${cuerpo}</div>
            ${pie ? `<div class="modal-footer border-0">${pie}</div>` : ""}
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML("beforeend", html);
    const modalEl = document.getElementById(id);
    const bsModal = new bootstrap.Modal(modalEl);
    bsModal.show();
    if (onShow) modalEl.addEventListener("shown.bs.modal", onShow);
    modalEl.addEventListener("hidden.bs.modal", () => modalEl.remove());
    return bsModal;
  },

  confirm({ titulo = "¿Confirmar?", mensaje = "", onConfirm }) {
    const id = "modal-confirm-" + Date.now();
    const html = `
      <div class="modal fade" id="${id}" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-sm modal-dialog-centered">
          <div class="modal-content border-0 shadow-lg">
            <div class="modal-header bg-warning border-0">
              <h5 class="modal-title fw-bold"><i class="bi bi-exclamation-triangle-fill me-2"></i>${titulo}</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body text-center py-4"><p class="mb-0">${mensaje}</p></div>
            <div class="modal-footer border-0 justify-content-center">
              <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
              <button class="btn btn-danger" id="${id}-confirm">Confirmar</button>
            </div>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML("beforeend", html);
    const modalEl = document.getElementById(id);
    const bsModal = new bootstrap.Modal(modalEl);
    bsModal.show();
    document.getElementById(id + "-confirm").onclick = () => { bsModal.hide(); onConfirm(); };
    modalEl.addEventListener("hidden.bs.modal", () => modalEl.remove());
  }
};

// ══════════════════════════════════════════════════════
//  BADGE DE ESTADO PEDIDO
// ══════════════════════════════════════════════════════
export function badgeEstadoPedido(estado) {
  const config = {
    pendiente: { color: "warning", icon: "bi-clock-fill", texto: "Pendiente" },
    en_preparacion: { color: "info", icon: "bi-fire", texto: "En Preparación" },
    listo: { color: "success", icon: "bi-check-circle-fill", texto: "Listo" },
    entregado: { color: "secondary", icon: "bi-bag-check-fill", texto: "Entregado" },
    cancelado: { color: "danger", icon: "bi-x-circle-fill", texto: "Cancelado" }
  };
  const c = config[estado] || { color: "light", icon: "bi-question", texto: estado };
  return `<span class="badge bg-${c.color} d-inline-flex align-items-center gap-1 px-2 py-1"><i class="bi ${c.icon}"></i>${c.texto}</span>`;
}

// ══════════════════════════════════════════════════════
//  BADGE STOCK
// ══════════════════════════════════════════════════════
export function badgeStock(stock, minimo) {
  if (stock <= 0) return `<span class="badge bg-danger">Sin stock</span>`;
  if (stock <= minimo) return `<span class="badge bg-warning text-dark">Stock bajo: ${stock}</span>`;
  return `<span class="badge bg-success">${stock}</span>`;
}

// ══════════════════════════════════════════════════════
//  TABLA GENÉRICA
// ══════════════════════════════════════════════════════
export function crearTabla({ columnas, datos, acciones = null, vacio = "No hay datos disponibles" }) {
  if (!datos || datos.length === 0) {
    return `<div class="text-center py-5 text-muted"><i class="bi bi-inbox display-4 d-block mb-2"></i>${vacio}</div>`;
  }
  const thead = columnas.map(c => `<th scope="col">${c.titulo}</th>`).join("");
  const tbody = datos.map(fila => {
    const celdas = columnas.map(c => {
      let val = c.render ? c.render(fila[c.campo], fila) : (fila[c.campo] ?? "-");
      return `<td>${val}</td>`;
    }).join("");
    const accs = acciones ? `<td>${acciones(fila)}</td>` : "";
    return `<tr>${celdas}${accs}</tr>`;
  }).join("");
  const thAcciones = acciones ? `<th scope="col">Acciones</th>` : "";
  return `
    <div class="table-responsive">
      <table class="table table-hover align-middle mb-0">
        <thead class="table-dark"><tr>${thead}${thAcciones}</tr></thead>
        <tbody>${tbody}</tbody>
      </table>
    </div>`;
}

// ══════════════════════════════════════════════════════
//  TARJETA MÉTRICA (KPI Card)
// ══════════════════════════════════════════════════════
export function kpiCard({ titulo, valor, icono, color = "primary", subtitulo = "" }) {
  return `
    <div class="card border-0 shadow-sm h-100">
      <div class="card-body">
        <div class="d-flex align-items-center justify-content-between mb-2">
          <span class="text-muted small fw-semibold text-uppercase">${titulo}</span>
          <span class="bg-${color} bg-opacity-10 text-${color} rounded-circle d-flex align-items-center justify-content-center" style="width:42px;height:42px;">
            <i class="bi ${icono} fs-5"></i>
          </span>
        </div>
        <div class="h3 fw-bold mb-1">${valor}</div>
        ${subtitulo ? `<div class="text-muted small">${subtitulo}</div>` : ""}
      </div>
    </div>`;
}

// ══════════════════════════════════════════════════════
//  FORMATTERS
// ══════════════════════════════════════════════════════
export const fmt = {
  moneda: (v) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }).format(v),
  fecha: (iso) => new Date(iso).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" }),
  hora: (iso) => new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }),
  fechaHora: (iso) => `${fmt.fecha(iso)} ${fmt.hora(iso)}`,
  numero: (v) => new Intl.NumberFormat("es-CL").format(v)
};

// ══════════════════════════════════════════════════════
//  EMPTY STATE
// ══════════════════════════════════════════════════════
export function emptyState(mensaje = "No hay datos", icono = "bi-inbox") {
  return `<div class="d-flex flex-column align-items-center justify-content-center py-5 text-muted">
    <i class="bi ${icono} display-3 mb-3 opacity-50"></i>
    <p class="fw-medium">${mensaje}</p>
  </div>`;
}
