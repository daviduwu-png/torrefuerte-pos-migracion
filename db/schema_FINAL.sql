-- ============================================
-- SCHEMA OPTIMIZADO FINAL - POS TORRE FUERTE
-- Basado en estructura actual + mejoras necesarias
-- ============================================

PRAGMA foreign_keys = ON;

-- ============================================
-- 1. Tabla Categorías
-- ============================================
CREATE TABLE IF NOT EXISTS categoria (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE
);

-- ============================================
-- 2. Tabla Productos (OPTIMIZADA)
-- ============================================
CREATE TABLE IF NOT EXISTS producto (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Identificadores
    codigo_barras TEXT UNIQUE,
    codigo_interno TEXT UNIQUE,
    
    -- Info
    nombre TEXT NOT NULL,
    descripcion TEXT,
    marca TEXT,
    proveedor TEXT NOT NULL DEFAULT 'MANUAL',
    
    -- MEDIDAS: Agregamos litro, galon, caja, tramo
    tipo_medida TEXT NOT NULL CHECK(tipo_medida IN ('UNIDAD','ROLLO','METRO','KILO','JUEGO','SET','LITRO','GALON','CAJA','TRAMO')),
    categoria_id INTEGER NOT NULL,
    
    -- Precios
    precio_compra NUMERIC(10, 2) NOT NULL DEFAULT 0,
    precio_venta NUMERIC(10, 2) NOT NULL,
    precio_mayoreo NUMERIC(10, 2),
    precio_distribuidor NUMERIC(10, 2),
    
    -- STOCK CON DECIMALES
    facturable INTEGER NOT NULL DEFAULT 1,
    stock NUMERIC(10, 3) NOT NULL DEFAULT 0, -- Cambiado de INTEGER a NUMERIC
    
    FOREIGN KEY (categoria_id) REFERENCES categoria(id)
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_codigo_barras ON producto(codigo_barras);
CREATE INDEX IF NOT EXISTS idx_codigo_interno ON producto(codigo_interno);
CREATE INDEX IF NOT EXISTS idx_proveedor ON producto(proveedor);
CREATE INDEX IF NOT EXISTS idx_nombre ON producto(nombre);
CREATE INDEX IF NOT EXISTS idx_producto_categoria_id ON producto(categoria_id);
CREATE INDEX IF NOT EXISTS idx_producto_marca ON producto(marca);

-- ============================================
-- 3. Tabla Usuarios
-- ============================================
CREATE TABLE IF NOT EXISTS usuario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    contraseña TEXT NOT NULL,
    rol TEXT NOT NULL CHECK(rol IN ('admin', 'normal'))
);

-- ============================================
-- 4. Tabla Tickets
-- ============================================
CREATE TABLE IF NOT EXISTS ticket (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    folio_fiscal TEXT NOT NULL,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    metodo_pago TEXT NOT NULL,
    total NUMERIC(10, 2) NOT NULL,
    direccion_local TEXT NOT NULL,
    nombre_local TEXT NOT NULL,
    dinero_recibido NUMERIC(10, 2),
    cambio NUMERIC(10, 2),
    usuario_id INTEGER,
    FOREIGN KEY (usuario_id) REFERENCES usuario(id)
);

CREATE INDEX IF NOT EXISTS idx_ticket_fecha ON ticket(fecha);

-- ============================================
-- 5. Tabla Intermedia Ticket-Producto
-- ============================================
CREATE TABLE IF NOT EXISTS ticket_producto (
    ticket_id INTEGER,
    producto_id INTEGER,
    cantidad NUMERIC(10, 2) NOT NULL,
    precio_unitario NUMERIC(10, 2) NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL,
    PRIMARY KEY (ticket_id, producto_id),
    FOREIGN KEY (ticket_id) REFERENCES ticket(id),
    FOREIGN KEY (producto_id) REFERENCES producto(id)
);

CREATE INDEX IF NOT EXISTS idx_ticket_producto_ticket_id ON ticket_producto(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_producto_producto_id ON ticket_producto(producto_id);

-- ============================================
-- 6. Tabla Devoluciones
-- ============================================
CREATE TABLE IF NOT EXISTS devolucion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL,
    producto_id INTEGER NOT NULL,
    cantidad NUMERIC(10, 2) NOT NULL,
    motivo TEXT,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    usuario_id INTEGER,
    FOREIGN KEY (ticket_id) REFERENCES ticket(id),
    FOREIGN KEY (producto_id) REFERENCES producto(id),
    FOREIGN KEY (usuario_id) REFERENCES usuario(id)
);

CREATE INDEX IF NOT EXISTS idx_devolucion_ticket_id ON devolucion(ticket_id);

-- ============================================
-- DATOS INICIALES
-- ============================================

INSERT OR IGNORE INTO categoria (nombre) VALUES 
    ('FERRETERIA'),
    ('MANGUERA'),
    ('MALLAS'),
    ('ELECTRICO');

INSERT OR IGNORE INTO usuario (nombre, email, contraseña, rol) VALUES 
    ('administrador', 'admin@torrefuerte.com', '$2y$10$XYXG6aJqWs.qhbIZRsjxo.KIwYdFnwAYlCT0SLgxBLj06KHx5NBAC', 'admin'), -- password123
    ('vendedor', 'vendedor@torrefuerte.com', '$2y$10$XYXG6aJqWs.qhbIZRsjxo.KIwYdFnwAYlCT0SLgxBLj06KHx5NBAC', 'normal'); -- password123

