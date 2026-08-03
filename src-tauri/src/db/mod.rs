use rusqlite::{Connection, Result};
use std::path::PathBuf;
use std::sync::Mutex;

pub struct Database {
    pub conn: Mutex<Connection>,
}

impl Database {
    pub fn new(db_path: PathBuf) -> Result<Self> {
        let conn = Connection::open(&db_path)?;
        
        // Configurar SQLite como en PHP
        conn.execute_batch(
            "PRAGMA foreign_keys = ON;
             PRAGMA journal_mode = WAL;
             PRAGMA synchronous = NORMAL;"
        )?;
        
        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    /// Inicializa las tablas si no existen (usando el esquema FINAL del usuario)
    pub fn init_tables(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        
        conn.execute_batch(
            r#"
            -- ============================================
            -- SCHEMA OPTIMIZADO FINAL - POS TORRE FUERTE
            -- ============================================

            PRAGMA foreign_keys = ON;

            -- 1. Tabla Categorías
            CREATE TABLE IF NOT EXISTS categoria (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL UNIQUE
            );

            -- 2. Tabla Productos (OPTIMIZADA)
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
                
                -- MEDIDAS: UNIDAD, ROLLO, METRO, KILO, JUEGO, SET, LITRO, GALON, CAJA, TRAMO
                tipo_medida TEXT NOT NULL CHECK(tipo_medida IN ('UNIDAD','ROLLO','METRO','KILO','JUEGO','SET','LITRO','GALON','CAJA','TRAMO')),
                categoria_id INTEGER NOT NULL,
                
                -- Precios
                precio_compra NUMERIC(10, 2) NOT NULL DEFAULT 0,
                precio_venta NUMERIC(10, 2) NOT NULL,
                precio_mayoreo NUMERIC(10, 2),
                precio_distribuidor NUMERIC(10, 2),
                
                -- Stock con decimales
                facturable INTEGER NOT NULL DEFAULT 1,
                stock NUMERIC(10, 3) NOT NULL DEFAULT 0,
                stock_reservado INTEGER NOT NULL DEFAULT 0,
                precio_compra_incluye_iva INTEGER NOT NULL DEFAULT 0,
                
                FOREIGN KEY (categoria_id) REFERENCES categoria(id)
            );

            -- Índices para búsquedas rápidas
            CREATE INDEX IF NOT EXISTS idx_codigo_barras ON producto(codigo_barras);
            CREATE INDEX IF NOT EXISTS idx_codigo_interno ON producto(codigo_interno);
            CREATE INDEX IF NOT EXISTS idx_proveedor ON producto(proveedor);
            CREATE INDEX IF NOT EXISTS idx_nombre ON producto(nombre);
            CREATE INDEX IF NOT EXISTS idx_producto_categoria_id ON producto(categoria_id);
            CREATE INDEX IF NOT EXISTS idx_producto_marca ON producto(marca);

            -- 3. Tabla Usuarios
            CREATE TABLE IF NOT EXISTS usuario (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                contraseña TEXT NOT NULL,
                rol TEXT NOT NULL CHECK(rol IN ('admin', 'normal'))
            );

            -- 4. Tabla Tickets
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

            -- 5. Tabla Intermedia Ticket-Producto
            CREATE TABLE IF NOT EXISTS ticket_producto (
                ticket_id INTEGER,
                producto_id INTEGER,
                cantidad NUMERIC(10, 2) NOT NULL,
                precio_unitario NUMERIC(10, 2) NOT NULL,
                costo_historico NUMERIC(10, 2) NOT NULL DEFAULT 0, -- Costo al momento de la venta
                subtotal NUMERIC(10, 2) NOT NULL,
                PRIMARY KEY (ticket_id, producto_id),
                FOREIGN KEY (ticket_id) REFERENCES ticket(id),
                FOREIGN KEY (producto_id) REFERENCES producto(id)
            );

            CREATE INDEX IF NOT EXISTS idx_ticket_producto_ticket_id ON ticket_producto(ticket_id);
            CREATE INDEX IF NOT EXISTS idx_ticket_producto_producto_id ON ticket_producto(producto_id);

            -- 6. Tabla Devoluciones
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

            -- 7. Tabla Clientes
            CREATE TABLE IF NOT EXISTS cliente (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre     TEXT NOT NULL,
                telefono   TEXT,
                email      TEXT,
                direccion  TEXT,
                rfc        TEXT,
                notas      TEXT,
                activo     INTEGER NOT NULL DEFAULT 1,
                fecha_alta DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_cliente_nombre ON cliente(nombre);
            CREATE INDEX IF NOT EXISTS idx_cliente_activo ON cliente(activo);

            -- 8. Tabla Cuentas por Cobrar
            CREATE TABLE IF NOT EXISTS cuenta_por_cobrar (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                cliente_id      INTEGER NOT NULL,
                ticket_id       INTEGER,
                concepto        TEXT NOT NULL,
                monto_original  NUMERIC(10,2) NOT NULL,
                monto_pendiente NUMERIC(10,2) NOT NULL,
                fecha           DATETIME DEFAULT CURRENT_TIMESTAMP,
                estado          TEXT NOT NULL DEFAULT 'pendiente'
                                CHECK(estado IN ('pendiente','abonado','saldado')),
                FOREIGN KEY (cliente_id) REFERENCES cliente(id),
                FOREIGN KEY (ticket_id)  REFERENCES ticket(id)
            );

            CREATE INDEX IF NOT EXISTS idx_cxc_cliente_id ON cuenta_por_cobrar(cliente_id);
            CREATE INDEX IF NOT EXISTS idx_cxc_estado     ON cuenta_por_cobrar(estado);

            -- 9. Tabla Abonos
            CREATE TABLE IF NOT EXISTS abono (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                cuenta_id   INTEGER NOT NULL,
                monto       NUMERIC(10,2) NOT NULL,
                metodo_pago TEXT NOT NULL DEFAULT 'EFECTIVO',
                fecha       DATETIME DEFAULT CURRENT_TIMESTAMP,
                usuario_id  INTEGER,
                notas       TEXT,
                FOREIGN KEY (cuenta_id)  REFERENCES cuenta_por_cobrar(id),
                FOREIGN KEY (usuario_id) REFERENCES usuario(id)
            );

            CREATE INDEX IF NOT EXISTS idx_abono_cuenta_id ON abono(cuenta_id);

            -- 10. Tabla Cotizaciones
            CREATE TABLE IF NOT EXISTS cotizacion (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                cliente_id  INTEGER,
                cliente_ref TEXT,
                total       NUMERIC(10,2) NOT NULL,
                notas       TEXT,
                estado      TEXT NOT NULL DEFAULT 'vigente'
                            CHECK(estado IN ('vigente','enviada','aprobada','cancelada')),
                usuario_id  INTEGER,
                fecha       DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (cliente_id) REFERENCES cliente(id),
                FOREIGN KEY (usuario_id) REFERENCES usuario(id)
            );

            CREATE INDEX IF NOT EXISTS idx_cotizacion_fecha      ON cotizacion(fecha);
            CREATE INDEX IF NOT EXISTS idx_cotizacion_cliente_id ON cotizacion(cliente_id);
            CREATE INDEX IF NOT EXISTS idx_cotizacion_estado     ON cotizacion(estado);

            -- 11. Tabla Cotizacion-Producto
            CREATE TABLE IF NOT EXISTS cotizacion_producto (
                cotizacion_id   INTEGER NOT NULL,
                producto_id     INTEGER NOT NULL,
                cantidad        NUMERIC(10,3) NOT NULL,
                precio_unitario NUMERIC(10,2) NOT NULL,
                subtotal        NUMERIC(10,2) NOT NULL,
                PRIMARY KEY (cotizacion_id, producto_id),
                FOREIGN KEY (cotizacion_id) REFERENCES cotizacion(id),
                FOREIGN KEY (producto_id)   REFERENCES producto(id)
            );

            CREATE INDEX IF NOT EXISTS idx_cot_prod_cotizacion ON cotizacion_producto(cotizacion_id);

            -- 12. Tabla Pedidos a Proveedor
            CREATE TABLE IF NOT EXISTS pedido_proveedor (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                proveedor  TEXT NOT NULL,
                marca      TEXT,
                notas      TEXT,
                estado     TEXT NOT NULL DEFAULT 'pendiente'
                           CHECK(estado IN ('pendiente','enviado','recibido','cancelado')),
                usuario_id INTEGER,
                fecha      DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (usuario_id) REFERENCES usuario(id)
            );

            CREATE INDEX IF NOT EXISTS idx_pedido_proveedor ON pedido_proveedor(proveedor);
            CREATE INDEX IF NOT EXISTS idx_pedido_fecha     ON pedido_proveedor(fecha);
            CREATE INDEX IF NOT EXISTS idx_pedido_estado    ON pedido_proveedor(estado);

            -- 13. Tabla Pedido-Producto
            CREATE TABLE IF NOT EXISTS pedido_producto (
                pedido_id         INTEGER NOT NULL,
                producto_id       INTEGER NOT NULL,
                cantidad_pedida   NUMERIC(10,3) NOT NULL,
                cantidad_recibida NUMERIC(10,3) NOT NULL DEFAULT 0,
                precio_estimado   NUMERIC(10,2),
                PRIMARY KEY (pedido_id, producto_id),
                FOREIGN KEY (pedido_id)   REFERENCES pedido_proveedor(id),
                FOREIGN KEY (producto_id) REFERENCES producto(id)
            );

            CREATE INDEX IF NOT EXISTS idx_ped_prod_pedido ON pedido_producto(pedido_id);

            -- 14. Tabla Apartados
            CREATE TABLE IF NOT EXISTS apartado (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                cliente_id      INTEGER NOT NULL,
                total           NUMERIC(10,2) NOT NULL,
                monto_pagado    NUMERIC(10,2) NOT NULL DEFAULT 0,
                monto_pendiente NUMERIC(10,2) NOT NULL,
                notas           TEXT,
                estado          TEXT NOT NULL DEFAULT 'activo'
                                CHECK(estado IN ('activo','cancelado','liquidado')),
                usuario_id      INTEGER,
                fecha           DATETIME DEFAULT CURRENT_TIMESTAMP,
                fecha_liquidado DATETIME,
                ticket_id       INTEGER,
                FOREIGN KEY (cliente_id) REFERENCES cliente(id),
                FOREIGN KEY (usuario_id) REFERENCES usuario(id),
                FOREIGN KEY (ticket_id)  REFERENCES ticket(id)
            );

            CREATE INDEX IF NOT EXISTS idx_apartado_cliente_id ON apartado(cliente_id);
            CREATE INDEX IF NOT EXISTS idx_apartado_estado     ON apartado(estado);
            CREATE INDEX IF NOT EXISTS idx_apartado_fecha      ON apartado(fecha);

            -- 15. Tabla Apartado-Producto
            CREATE TABLE IF NOT EXISTS apartado_producto (
                apartado_id     INTEGER NOT NULL,
                producto_id     INTEGER NOT NULL,
                cantidad        NUMERIC(10,3) NOT NULL,
                precio_unitario NUMERIC(10,2) NOT NULL,
                subtotal        NUMERIC(10,2) NOT NULL,
                PRIMARY KEY (apartado_id, producto_id),
                FOREIGN KEY (apartado_id) REFERENCES apartado(id),
                FOREIGN KEY (producto_id) REFERENCES producto(id)
            );

            CREATE INDEX IF NOT EXISTS idx_apart_prod_apartado ON apartado_producto(apartado_id);

            -- 16. Tabla Configuración
            CREATE TABLE IF NOT EXISTS configuracion (
                clave TEXT PRIMARY KEY,
                valor TEXT NOT NULL
            );

            -- DATOS INICIALES
            INSERT OR IGNORE INTO categoria (nombre) VALUES 
                ('FERRETERIA'),
                ('MANGUERA'),
                ('MALLAS'),
                ('ELECTRICO');

            INSERT OR IGNORE INTO usuario (nombre, email, contraseña, rol) VALUES 
                ('administrador', 'admin@torrefuerte.com', '$2y$10$XYXG6aJqWs.qhbIZRsjxo.KIwYdFnwAYlCT0SLgxBLj06KHx5NBAC', 'admin'),
                ('vendedor', 'vendedor@torrefuerte.com', '$2y$10$XYXG6aJqWs.qhbIZRsjxo.KIwYdFnwAYlCT0SLgxBLj06KHx5NBAC', 'normal');

            INSERT OR IGNORE INTO configuracion (clave, valor) VALUES 
                ('ticket_nombre_local', ''),
                ('ticket_rfc', ''),
                ('ticket_direccion_1', ''),
                ('ticket_direccion_2', ''),
                ('ticket_direccion_3', ''),
                ('ticket_mensaje', 'Gracias por su compra'),
                ('sistema_tema', 'dark');
            "#
        )?;
        
        // --- MIGRACIONES ---
        // Sanitizar datos históricos de check constraints y desactivar FK temporalmente para que los ALTER TABLE nunca fallen por datos previos
        let _ = conn.execute_batch("
            PRAGMA foreign_keys = OFF;
            UPDATE producto SET tipo_medida = UPPER(tipo_medida) WHERE tipo_medida IS NOT NULL;
            UPDATE producto SET tipo_medida = 'UNIDAD' WHERE tipo_medida NOT IN ('UNIDAD','ROLLO','METRO','KILO','JUEGO','SET','LITRO','GALON','CAJA','TRAMO');
        ");
        
        // 1. Agregar costo_historico a ticket_producto
        let _ = conn.execute("ALTER TABLE ticket_producto ADD COLUMN costo_historico NUMERIC(10, 2) NOT NULL DEFAULT 0", []);

        // 2. Flag que indica si precio_compra ya incluye IVA (para evitar doble aplicación)
        let _ = conn.execute("ALTER TABLE producto ADD COLUMN precio_compra_incluye_iva INTEGER NOT NULL DEFAULT 0", []);

        // 3. Reserva de stock para apartados
        let _ = conn.execute("ALTER TABLE producto ADD COLUMN stock_reservado INTEGER NOT NULL DEFAULT 0", []);
        
        let _ = conn.execute_batch("PRAGMA foreign_keys = ON;");

        Ok(())
    }
}
