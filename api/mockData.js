/**
 * ══════════════════════════════════════════════════════
 *  RESTAUROS — MOCK API DATA  (versión v2 — flujo real)
 *  Archivo: api/mockData.js
 *
 *  CAMBIOS vs v1:
 *    • Pedidos: nuevos estados retirado, cuenta_solicitada, pagado
 *    • Mesas: nuevos estados con_pedido, pendiente_pago, liberable
 *    • Nueva tabla: notificaciones
 *    • Pedidos con campo mesa_id para FK (además de mesa número)
 * ══════════════════════════════════════════════════════
 */

export const MockDB = {
  usuarios: [
    { id: 1, nombre: "Admin Sistema",   email: "admin@resto.com",          password: "admin123", rol: "administrador", activo: true, avatar: "AS" },
    { id: 2, nombre: "Carlos Mendoza",  email: "dueno@resto.com",          password: "dueno123", rol: "dueno",         activo: true, avatar: "CM" },
    { id: 3, nombre: "Laura Jiménez",   email: "jefe.meseros@resto.com",   password: "jm123",    rol: "jefe_meseros",  activo: true, avatar: "LJ" },
    { id: 4, nombre: "Roberto Soto",    email: "jefe.cocina@resto.com",    password: "jc123",    rol: "jefe_cocina",   activo: true, avatar: "RS" },
    { id: 5, nombre: "Ana Torres",      email: "mesero1@resto.com",        password: "m123",     rol: "mesero",        activo: true, avatar: "AT" },
    { id: 6, nombre: "Pedro Ruiz",      email: "mesero2@resto.com",        password: "m123",     rol: "mesero",        activo: true, avatar: "PR" },
    { id: 7, nombre: "Miguel Flores",   email: "cocinero1@resto.com",      password: "c123",     rol: "cocinero",      activo: true, avatar: "MF" },
    { id: 8, nombre: "Sofía Castro",    email: "cocinero2@resto.com",      password: "c123",     rol: "cocinero",      activo: true, avatar: "SC" },
    { id: 9, nombre: "Juan Pérez",      email: "portero1@resto.com",       password: "p123",     rol: "portero",       activo: true, avatar: "JP" },
    { id: 10, nombre: "María López",    email: "portero2@resto.com",       password: "p123",     rol: "portero",       activo: true, avatar: "ML" },
  ],

  platillos: [
    { id: 1,  nombre: "Cazuela de Vacuno",   descripcion: "Cazuela tradicional con papas y choclo",      precio: 5900,  categoria: "Sopas",         imagen: "🍲", tiempo_prep: 20, activo: true, ingredientes: [1, 3, 9, 10] },
    { id: 2,  nombre: "Pastel de Choclo",    descripcion: "Clásico pastel con pino y choclo rallado",    precio: 6500,  categoria: "Platos Fuertes", imagen: "🫕", tiempo_prep: 25, activo: true, ingredientes: [2, 4, 6, 7]  },
    { id: 3,  nombre: "Empanadas de Pino",   descripcion: "3 empanadas horneadas con pino de vacuno",    precio: 4900,  categoria: "Entradas",       imagen: "🥟", tiempo_prep: 15, activo: true, ingredientes: [1, 3, 5, 8]  },
    { id: 4,  nombre: "Lomo a lo Pobre",     descripcion: "Lomo de vacuno con huevo frito y papas fritas",precio: 8900, categoria: "Platos Fuertes", imagen: "🥩", tiempo_prep: 20, activo: true, ingredientes: [6, 7, 11, 12] },
    { id: 5,  nombre: "Sopaipillas",         descripcion: "Sopaipillas pasadas con chancaca",             precio: 2900,  categoria: "Entradas",       imagen: "🧇", tiempo_prep: 10, activo: true, ingredientes: [7, 11, 13] },
    { id: 6,  nombre: "Chupe de Mariscos",   descripcion: "Chupe cremoso con mariscos frescos",           precio: 9900,  categoria: "Sopas",         imagen: "🦐", tiempo_prep: 20, activo: true, ingredientes: [2, 8, 14]  },
    { id: 7,  nombre: "Pollo al Horno",      descripcion: "Pollo al horno con arroz y ensalada",          precio: 7500,  categoria: "Platos Fuertes", imagen: "🍗", tiempo_prep: 30, activo: true, ingredientes: [1, 5, 15] },
    { id: 8,  nombre: "Mote con Huesillo",   descripcion: "Bebida tradicional chilena fría",              precio: 1900,  categoria: "Bebidas",        imagen: "🥤", tiempo_prep: 2,  activo: true, ingredientes: [16] },
    { id: 9,  nombre: "Leche Asada",         descripcion: "Postre cremoso tradicional chileno",           precio: 3200,  categoria: "Postres",        imagen: "🍮", tiempo_prep: 5,  activo: true, ingredientes: [17, 18] },
    { id: 10, nombre: "Kuchen de Manzana",   descripcion: "Kuchen casero estilo alemán",                  precio: 3500,  categoria: "Postres",        imagen: "🍰", tiempo_prep: 8,  activo: true, ingredientes: [19, 20] },

    // ── Entradas (nuevas) ──
    { id: 11, nombre: "Ensalada César",          descripcion: "Lechuga, pollo, crutones y aderezo César",          precio: 4800,  categoria: "Entradas",       imagen: "🥗", tiempo_prep: 8,  activo: true, ingredientes: [2, 6, 12] },
    { id: 12, nombre: "Papas Fritas Familiares", descripcion: "Papas fritas crujientes con salsa a elección",      precio: 3900,  categoria: "Entradas",       imagen: "🍟", tiempo_prep: 10, activo: true, ingredientes: [3] },
    { id: 13, nombre: "Tabla de Quesos",         descripcion: "Selección de quesos con aceitunas y galletas",      precio: 6500,  categoria: "Entradas",       imagen: "🧀", tiempo_prep: 12, activo: true, ingredientes: [13, 14] },
    { id: 14, nombre: "Camarones al Pil Pil",    descripcion: "Camarones salteados en mantequilla, ajo y ají",     precio: 7900,  categoria: "Entradas",       imagen: "🍤", tiempo_prep: 15, activo: true, ingredientes: [11, 13, 10] },

    // ── Platos de Fondo (nuevos) ──
    { id: 15, nombre: "Bistec a lo Pobre",       descripcion: "Bistec con papas fritas, cebolla caramelizada y huevo", precio: 9500,  categoria: "Platos Fuertes", imagen: "🥩", tiempo_prep: 25, activo: true, ingredientes: [1, 3, 5, 12] },
    { id: 16, nombre: "Lasaña Boloñesa",         descripcion: "Lasaña tradicional con carne y queso gratinado",        precio: 8900,  categoria: "Platos Fuertes", imagen: "🍝", tiempo_prep: 30, activo: true, ingredientes: [1, 6, 7] },
    { id: 17, nombre: "Fettuccine Alfredo",      descripcion: "Pasta con salsa Alfredo y pollo",                       precio: 8200,  categoria: "Platos Fuertes", imagen: "🍝", tiempo_prep: 20, activo: true, ingredientes: [2, 7, 14] },
    { id: 18, nombre: "Ravioles de Espinaca",    descripcion: "Ravioles rellenos con salsa pomodoro",                  precio: 7900,  categoria: "Platos Fuertes", imagen: "🥟", tiempo_prep: 18, activo: true, ingredientes: [7, 6] },
    { id: 19, nombre: "Salmón a la Plancha",     descripcion: "Salmón con verduras salteadas",                         precio: 11900, categoria: "Platos Fuertes", imagen: "🐟", tiempo_prep: 25, activo: true, ingredientes: [11, 6] },
    { id: 20, nombre: "Reineta Frita",           descripcion: "Reineta acompañada de arroz o papas",                   precio: 9500,  categoria: "Platos Fuertes", imagen: "🐠", tiempo_prep: 20, activo: true, ingredientes: [11, 3] },
    { id: 21, nombre: "Costillar BBQ",           descripcion: "Costillar de cerdo con papas rústicas",                 precio: 12500, categoria: "Platos Fuertes", imagen: "🍖", tiempo_prep: 35, activo: true, ingredientes: [1, 3] },
    { id: 22, nombre: "Chuleta de Cerdo",        descripcion: "Chuleta grillada con puré casero",                      precio: 8500,  categoria: "Platos Fuertes", imagen: "🥩", tiempo_prep: 20, activo: true, ingredientes: [1, 3] },
    { id: 23, nombre: "Pechuga Grillada",        descripcion: "Pollo grillado con ensalada mixta",                     precio: 7900,  categoria: "Platos Fuertes", imagen: "🍗", tiempo_prep: 20, activo: true, ingredientes: [2] },
    { id: 24, nombre: "Chorrillana Individual",  descripcion: "Papas fritas, carne, cebolla y huevo",                  precio: 8900,  categoria: "Platos Fuertes", imagen: "🍳", tiempo_prep: 20, activo: true, ingredientes: [1, 3, 5, 12] },
    { id: 25, nombre: "Arroz Chaufa de Pollo",   descripcion: "Arroz salteado estilo peruano con pollo",               precio: 7900,  categoria: "Platos Fuertes", imagen: "🍚", tiempo_prep: 18, activo: true, ingredientes: [9, 2] },
    { id: 26, nombre: "Lomo Saltado",            descripcion: "Lomo salteado con cebolla, tomate y papas fritas",      precio: 10500, categoria: "Platos Fuertes", imagen: "🥘", tiempo_prep: 20, activo: true, ingredientes: [1, 5, 6, 3] },
    { id: 27, nombre: "Hamburguesa Artesanal",   descripcion: "Carne de vacuno, queso cheddar y papas fritas",         precio: 8500,  categoria: "Platos Fuertes", imagen: "🍔", tiempo_prep: 18, activo: true, ingredientes: [1, 3] },
    { id: 28, nombre: "Milanesa Napolitana",     descripcion: "Milanesa gratinada con jamón, queso y salsa de tomate", precio: 9200,  categoria: "Platos Fuertes", imagen: "🍗", tiempo_prep: 25, activo: true, ingredientes: [1, 6] },
    { id: 29, nombre: "Risotto de Champiñones",  descripcion: "Arroz cremoso con champiñones y queso parmesano",       precio: 8900,  categoria: "Platos Fuertes", imagen: "🍄", tiempo_prep: 25, activo: true, ingredientes: [9, 14] },
    { id: 30, nombre: "Carne Mechada con Puré",  descripcion: "Carne mechada acompañada de puré casero",               precio: 9800,  categoria: "Platos Fuertes", imagen: "🍖", tiempo_prep: 30, activo: true, ingredientes: [1, 3] },

    // ── Postres (nuevos) ──
    { id: 31, nombre: "Tiramisú",                    descripcion: "Postre italiano con café y mascarpone",             precio: 4500, categoria: "Postres", imagen: "🍰", tiempo_prep: 5, activo: true, ingredientes: [17, 18] },
    { id: 32, nombre: "Cheesecake de Frutos Rojos",  descripcion: "Cheesecake con salsa de frutos rojos",               precio: 4900, categoria: "Postres", imagen: "🍓", tiempo_prep: 5, activo: true, ingredientes: [17, 19] },
    { id: 33, nombre: "Brownie con Helado",          descripcion: "Brownie tibio acompañado de helado de vainilla",     precio: 4500, categoria: "Postres", imagen: "🍫", tiempo_prep: 7, activo: true, ingredientes: [20, 19] },
    { id: 34, nombre: "Copa de Helado",              descripcion: "Tres sabores a elección",                            precio: 3900, categoria: "Postres", imagen: "🍨", tiempo_prep: 3, activo: true, ingredientes: [17, 19] },
    { id: 35, nombre: "Panqueques con Manjar",       descripcion: "Dos panqueques rellenos de manjar",                  precio: 4200, categoria: "Postres", imagen: "🥞", tiempo_prep: 8, activo: true, ingredientes: [7, 17, 19] },
    { id: 36, nombre: "Pie de Limón",                descripcion: "Pie de limón casero",                                precio: 3900, categoria: "Postres", imagen: "🥧", tiempo_prep: 5, activo: true, ingredientes: [8, 19] },
    { id: 37, nombre: "Torta Tres Leches",           descripcion: "Bizcocho bañado en tres tipos de leche",             precio: 4800, categoria: "Postres", imagen: "🍰", tiempo_prep: 5, activo: true, ingredientes: [17, 19] },
    { id: 38, nombre: "Flan Casero",                 descripcion: "Flan de vainilla con caramelo",                      precio: 3500, categoria: "Postres", imagen: "🍮", tiempo_prep: 5, activo: true, ingredientes: [17, 18, 19] },
    { id: 39, nombre: "Ensalada de Frutas",          descripcion: "Frutas frescas de temporada",                        precio: 3200, categoria: "Postres", imagen: "🍇", tiempo_prep: 5, activo: true, ingredientes: [15] },
    { id: 40, nombre: "Waffles con Helado",          descripcion: "Waffles recién hechos con helado y salsa de chocolate", precio: 4500, categoria: "Postres", imagen: "🧇", tiempo_prep: 6, activo: true, ingredientes: [7, 17, 20] },
  ],

  ingredientes: [
    { id: 1,  nombre: "Carne de Vacuno",   unidad: "kg",     stock: 15,  stock_minimo: 5,  precio_unitario: 7800,  categoria: "Carnes"   },
    { id: 2,  nombre: "Pechuga de Pollo",  unidad: "kg",     stock: 12,  stock_minimo: 4,  precio_unitario: 4200,  categoria: "Carnes"   },
    { id: 3,  nombre: "Papas",             unidad: "kg",     stock: 30,  stock_minimo: 10, precio_unitario: 890,   categoria: "Verduras" },
    { id: 4,  nombre: "Choclo",            unidad: "unidad", stock: 20,  stock_minimo: 8,  precio_unitario: 650,   categoria: "Verduras" },
    { id: 5,  nombre: "Cebolla",           unidad: "kg",     stock: 8,   stock_minimo: 3,  precio_unitario: 490,   categoria: "Verduras" },
    { id: 6,  nombre: "Tomate",            unidad: "kg",     stock: 6,   stock_minimo: 2,  precio_unitario: 890,   categoria: "Verduras" },
    { id: 7,  nombre: "Harina",            unidad: "kg",     stock: 25,  stock_minimo: 8,  precio_unitario: 690,   categoria: "Granos"   },
    { id: 8,  nombre: "Limones",           unidad: "kg",     stock: 5,   stock_minimo: 2,  precio_unitario: 790,   categoria: "Frutas"   },
    { id: 9,  nombre: "Arroz",             unidad: "kg",     stock: 20,  stock_minimo: 5,  precio_unitario: 990,   categoria: "Granos"   },
    { id: 10, nombre: "Ají de Color",      unidad: "kg",     stock: 4,   stock_minimo: 1,  precio_unitario: 2900,  categoria: "Especias" },
    { id: 11, nombre: "Mariscos Mixtos",   unidad: "kg",     stock: 6,   stock_minimo: 2,  precio_unitario: 12900, categoria: "Mariscos" },
    { id: 12, nombre: "Huevos",            unidad: "unidad", stock: 60,  stock_minimo: 24, precio_unitario: 180,   categoria: "Lácteos"  },
    { id: 13, nombre: "Mantequilla",       unidad: "kg",     stock: 4,   stock_minimo: 1,  precio_unitario: 5900,  categoria: "Lácteos"  },
    { id: 14, nombre: "Crema",             unidad: "litro",  stock: 8,   stock_minimo: 3,  precio_unitario: 1890,  categoria: "Lácteos"  },
    { id: 15, nombre: "Manzanas",          unidad: "kg",     stock: 10,  stock_minimo: 3,  precio_unitario: 1290,  categoria: "Frutas"   },
    { id: 16, nombre: "Huesillos",         unidad: "kg",     stock: 5,   stock_minimo: 2,  precio_unitario: 2490,  categoria: "Frutas"   },
    { id: 17, nombre: "Leche",             unidad: "litro",  stock: 15,  stock_minimo: 5,  precio_unitario: 890,   categoria: "Lácteos"  },
    { id: 18, nombre: "Vainilla",          unidad: "ml",     stock: 200, stock_minimo: 50, precio_unitario: 45,    categoria: "Especias" },
    { id: 19, nombre: "Azúcar",            unidad: "kg",     stock: 12,  stock_minimo: 4,  precio_unitario: 790,   categoria: "Dulces"   },
    { id: 20, nombre: "Chocolate",         unidad: "kg",     stock: 4,   stock_minimo: 1,  precio_unitario: 6900,  categoria: "Dulces"   },
  ],

  // ── PEDIDOS — estados ampliados v2 ──
  // Estados válidos: pendiente | en_preparacion | listo | retirado |
  //                  entregado | cuenta_solicitada | pagado | cancelado
  pedidos: [
    {
      id: 1001, mesa: 3, mesa_id: 3, mesero_id: 5,
      estado: "pendiente",
      items: [{ platillo_id: 1, cantidad: 2, notas: "sin cilantro" }, { platillo_id: 8, cantidad: 2, notas: "" }],
      total: 15600, fecha: "2024-01-15T12:30:00Z", tiempo_estimado: 15,
      historial: [{ estado: "pendiente", timestamp: "2024-01-15T12:30:00Z", usuario_id: 5 }]
    },
    {
      id: 1002, mesa: 7, mesa_id: 7, mesero_id: 6,
      estado: "en_preparacion",
      items: [{ platillo_id: 3, cantidad: 1, notas: "" }, { platillo_id: 5, cantidad: 2, notas: "extra merkén" }],
      total: 10700, fecha: "2024-01-15T12:45:00Z", tiempo_estimado: 20,
      historial: [
        { estado: "pendiente",       timestamp: "2024-01-15T12:45:00Z", usuario_id: 6 },
        { estado: "en_preparacion",  timestamp: "2024-01-15T12:47:00Z", usuario_id: 7 },
      ]
    },
    {
      id: 1003, mesa: 1, mesa_id: 1, mesero_id: 5,
      estado: "listo",
      items: [{ platillo_id: 7, cantidad: 2, notas: "" }, { platillo_id: 9, cantidad: 2, notas: "" }],
      total: 21400, fecha: "2024-01-15T11:00:00Z", tiempo_estimado: 35,
      historial: [
        { estado: "pendiente",      timestamp: "2024-01-15T11:00:00Z", usuario_id: 5 },
        { estado: "en_preparacion", timestamp: "2024-01-15T11:05:00Z", usuario_id: 7 },
        { estado: "listo",          timestamp: "2024-01-15T11:32:00Z", usuario_id: 7 },
      ]
    },
    {
      id: 1004, mesa: 5, mesa_id: 5, mesero_id: 6,
      estado: "pagado",
      items: [{ platillo_id: 4, cantidad: 1, notas: "" }, { platillo_id: 10, cantidad: 1, notas: "" }],
      total: 12400, fecha: "2024-01-15T10:00:00Z", tiempo_estimado: 30,
      historial: [
        { estado: "pendiente",          timestamp: "2024-01-15T10:00:00Z", usuario_id: 6 },
        { estado: "en_preparacion",     timestamp: "2024-01-15T10:05:00Z", usuario_id: 8 },
        { estado: "listo",              timestamp: "2024-01-15T10:28:00Z", usuario_id: 8 },
        { estado: "retirado",           timestamp: "2024-01-15T10:30:00Z", usuario_id: 6 },
        { estado: "entregado",          timestamp: "2024-01-15T10:33:00Z", usuario_id: 6 },
        { estado: "cuenta_solicitada",  timestamp: "2024-01-15T10:55:00Z", usuario_id: 6 },
        { estado: "pagado",             timestamp: "2024-01-15T11:00:00Z", usuario_id: 6 },
      ]
    },
    {
      id: 1005, mesa: 2, mesa_id: 2, mesero_id: 5,
      estado: "pendiente",
      items: [{ platillo_id: 2, cantidad: 3, notas: "" }, { platillo_id: 6, cantidad: 1, notas: "" }],
      total: 29400, fecha: "2024-01-15T13:00:00Z", tiempo_estimado: 20,
      historial: [{ estado: "pendiente", timestamp: "2024-01-15T13:00:00Z", usuario_id: 5 }]
    },
  ],

  // ── MESAS — estados ampliados v2 ──
  // Estados válidos: disponible | reservada | ocupada |
  //                  con_pedido | pendiente_pago | liberable
  mesas: [
    { id: 1,  numero: 1,  capacidad: 4,  estado: "con_pedido",   zona: "interior",      reserva_id: null },
    { id: 2,  numero: 2,  capacidad: 2,  estado: "con_pedido",   zona: "terraza",       reserva_id: null },
    { id: 3,  numero: 3,  capacidad: 6,  estado: "con_pedido",   zona: "interior",      reserva_id: null },
    { id: 4,  numero: 4,  capacidad: 4,  estado: "reservada",    zona: "interior",      reserva_id: 201  },
    { id: 5,  numero: 5,  capacidad: 8,  estado: "liberable",    zona: "salon_privado", reserva_id: null },
    { id: 6,  numero: 6,  capacidad: 2,  estado: "disponible",   zona: "terraza",       reserva_id: null },
    { id: 7,  numero: 7,  capacidad: 4,  estado: "con_pedido",   zona: "interior",      reserva_id: null },
    { id: 8,  numero: 8,  capacidad: 6,  estado: "disponible",   zona: "interior",      reserva_id: null },
    { id: 9,  numero: 9,  capacidad: 4,  estado: "reservada",    zona: "terraza",       reserva_id: 202  },
    { id: 10, numero: 10, capacidad: 10, estado: "disponible",   zona: "salon_privado", reserva_id: null },
  ],

  reservaciones: [
    { id: 201, tipo: "mesa",     cliente: "Familia García",     fecha: "2024-01-15T20:00:00Z", personas: 4,  mesa_id: 4, notas: "Cumpleaños",          estado: "confirmada" },
    { id: 202, tipo: "mesa",     cliente: "Empresa TechCorp",   fecha: "2024-01-15T14:00:00Z", personas: 6,  mesa_id: 9, notas: "Reunión de trabajo",   estado: "confirmada" },
    { id: 203, tipo: "platillo", cliente: "Bodas Martínez",     fecha: "2024-01-20T13:00:00Z", platillo_ids: [7, 3], cantidad: 50, notas: "Boda",      estado: "pendiente"  },
    { id: 204, tipo: "platillo", cliente: "Quinceañera López",  fecha: "2024-01-22T18:00:00Z", platillo_ids: [4, 9, 10], cantidad: 80, notas: "Quinceañera", estado: "confirmada" },
  ],

  horarios: [
    { id: 1, empleado_id: 5, dia: "Lunes",   entrada: "08:00", salida: "16:00", turno: "mañana", semana: "2024-W03" },
    { id: 2, empleado_id: 5, dia: "Martes",  entrada: "08:00", salida: "16:00", turno: "mañana", semana: "2024-W03" },
    { id: 3, empleado_id: 6, dia: "Lunes",   entrada: "16:00", salida: "00:00", turno: "tarde",  semana: "2024-W03" },
    { id: 4, empleado_id: 7, dia: "Lunes",   entrada: "07:00", salida: "15:00", turno: "mañana", semana: "2024-W03" },
    { id: 5, empleado_id: 7, dia: "Martes",  entrada: "07:00", salida: "15:00", turno: "mañana", semana: "2024-W03" },
    { id: 6, empleado_id: 8, dia: "Lunes",   entrada: "15:00", salida: "23:00", turno: "tarde",  semana: "2024-W03" },
    { id: 7, empleado_id: 9, dia: "Lunes",   entrada: "10:00", salida: "18:00", turno: "mañana", semana: "2024-W03" },
    { id: 8, empleado_id: 10, dia: "Lunes",  entrada: "18:00", salida: "02:00", turno: "noche",  semana: "2024-W03" },
  ],

  turnos_activos: [
    { id: 1, empleado_id: 5, fecha: "2024-01-15", hora_inicio: "08:00", hora_fin: null, estado: "activo" },
    { id: 2, empleado_id: 7, fecha: "2024-01-15", hora_inicio: "07:00", hora_fin: null, estado: "activo" },
  ],

  solicitudes_personal: [
    { id: 1, tipo: "contratacion", rol_solicitado: "mesero",   cantidad: 2, motivo: "Alta demanda fin de semana", solicitante_id: 3, estado: "pendiente", fecha: "2024-01-14T10:00:00Z" },
    { id: 2, tipo: "contratacion", rol_solicitado: "cocinero", cantidad: 1, motivo: "Cocinero de licencia",       solicitante_id: 4, estado: "aprobada",  fecha: "2024-01-13T09:00:00Z" },
  ],

  solicitudes_ingredientes: [
    { id: 1, ingrediente_id: 11, cantidad: 5,  unidad: "kg", solicitante_id: 7, motivo: "Stock bajo",           estado: "pendiente", fecha: "2024-01-15T09:00:00Z" },
    { id: 2, ingrediente_id: 2,  cantidad: 10, unidad: "kg", solicitante_id: 8, motivo: "Pedido grande mañana", estado: "aprobada",  fecha: "2024-01-14T15:00:00Z" },
  ],

  equipos_cocina: [
    { id: 1, nombre: "Platos",     cantidad: 120, minimo: 40, estado: "ok"     },
    { id: 2, nombre: "Cucharas",   cantidad: 90,  minimo: 30, estado: "ok"     },
    { id: 3, nombre: "Tenedores",  cantidad: 85,  minimo: 30, estado: "ok"     },
    { id: 4, nombre: "Cuchillos",  cantidad: 75,  minimo: 25, estado: "ok"     },
    { id: 5, nombre: "Copas",      cantidad: 60,  minimo: 40, estado: "alerta" },
    { id: 6, nombre: "Vasos",      cantidad: 100, minimo: 40, estado: "ok"     },
    { id: 7, nombre: "Cucharones", cantidad: 15,  minimo: 5,  estado: "ok"     },
    { id: 8, nombre: "Sartenes",   cantidad: 12,  minimo: 4,  estado: "ok"     },
  ],

  finanzas: {
    ganancias: {
      dia:       [85000, 67000, 98000, 75000, 115000, 145000, 128000],
      semana:    [560000, 645000, 534000, 698000, 789000, 672000, 850000],
      mes:       [2400000, 2880000, 2600000, 3080000, 2810000, 3290000, 3560000, 3015000, 3425000, 3768000, 3357000, 3975000],
      trimestre: [7880000, 9870000, 10820000, 11100000],
      semestre:  [17750000, 21920000],
      anual:     [16800000, 20400000, 21920000, 28100000, 25970000],
    },
    gastos: {
      dia:       [30800, 26000, 35600, 28100, 39700, 49300, 44500],
      semana:    [191800, 219200, 178100, 232900, 260300, 219200, 281000],
      mes:       [822000, 993000, 890000, 1062000, 959000, 1130000, 1233000, 1027000, 1164000, 1301000, 1164000, 1370000],
      trimestre: [2706500, 3391500, 3731500, 3835000],
      semestre:  [6097000, 7534000],
      anual:     [5755000, 6993000, 7534000, 9729000, 8976000],
    },
  },

  metricas: {
    pedidos_por_dia: [45, 38, 52, 41, 63, 78, 71],
    platillos_mas_pedidos: [
      { platillo_id: 3, nombre: "Empanadas de Pino",  cantidad: 342, mes: "Enero" },
      { platillo_id: 1, nombre: "Cazuela de Vacuno",  cantidad: 287, mes: "Enero" },
      { platillo_id: 4, nombre: "Lomo a lo Pobre",    cantidad: 256, mes: "Enero" },
      { platillo_id: 2, nombre: "Pastel de Choclo",   cantidad: 234, mes: "Enero" },
      { platillo_id: 6, nombre: "Chupe de Mariscos",  cantidad: 198, mes: "Enero" },
    ],
    empleados_por_rol: {
      administrador: 1, dueno: 1, jefe_meseros: 1, jefe_cocina: 1,
      mesero: 2, cocinero: 2, portero: 2,
    },
  },
};

// ── Auto-increment IDs ──
export let nextIds = {
  pedido: 1006, reservacion: 205, horario: 9,
  solicitud_personal: 3, solicitud_ingrediente: 3,
};
