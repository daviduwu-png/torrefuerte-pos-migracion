use crate::db::Database;
use crate::models::*;
use bcrypt::verify;
use rusqlite::params;
use std::sync::Arc;
use tauri::State;

/// Estado de la aplicación
pub struct AppState {
    pub db: Arc<Database>,
    pub current_user: std::sync::Mutex<Option<Usuario>>,
}

// ==================== AUTENTICACIÓN ====================

/// Login de usuario (busca por nombre o email)
#[tauri::command]
pub fn login(
    username: String,
    password: String,
    state: State<AppState>,
) -> LoginResponse {
    let conn = state.db.conn.lock().unwrap();
    
    let result = conn.query_row(
        "SELECT id, nombre, email, contraseña, rol FROM usuario WHERE nombre = ? OR email = ?",
        params![&username, &username],
        |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
            ))
        },
    );

    match result {
        Ok((id, nombre, email, hash_password, rol)) => {
            // Verificar contraseña con bcrypt
            match verify(&password, &hash_password) {
                Ok(true) => {
                    let user = Usuario {
                        id,
                        nombre: nombre.clone(),
                        email,
                        rol: rol.clone(),
                    };
                    
                    // Guardar usuario en estado
                    *state.current_user.lock().unwrap() = Some(user.clone());
                    
                    LoginResponse {
                        success: true,
                        message: "Inicio de sesión exitoso.".to_string(),
                        user: Some(user),
                    }
                }
                _ => LoginResponse {
                    success: false,
                    message: "Contraseña incorrecta.".to_string(),
                    user: None,
                },
            }
        }
        Err(_) => LoginResponse {
            success: false,
            message: "Usuario no encontrado.".to_string(),
            user: None,
        },
    }
}

/// Logout de usuario
#[tauri::command]
pub fn logout(state: State<AppState>) -> ApiResponse<()> {
    *state.current_user.lock().unwrap() = None;
    ApiResponse::success("Sesión cerrada correctamente.", ())
}

/// Obtener usuario actual
#[tauri::command]
pub fn get_current_user(state: State<AppState>) -> Option<Usuario> {
    state.current_user.lock().unwrap().clone()
}

// ==================== PRODUCTOS ====================

/// Buscar productos por código o nombre
#[tauri::command]
pub fn buscar_producto(query: String, state: State<AppState>) -> ApiResponse<Vec<Producto>> {
    let conn = state.db.conn.lock().unwrap();
    let like_query = format!("%{}%", query);
    
    // Intentar parsear query como ID numérico para optimización
    let id_val = query.parse::<i64>().ok();
    
    let sql = if id_val.is_some() {
        r#"SELECT id, codigo_barras, codigo_interno, nombre, descripcion, marca, proveedor, 
                  tipo_medida, categoria_id, precio_compra, precio_venta, precio_mayoreo, 
                  precio_distribuidor, facturable, stock 
           FROM producto 
           WHERE id = ?1
              OR codigo_barras = ?2 
              OR codigo_interno = ?2 
              OR nombre LIKE ?3
           ORDER BY 
               CASE 
                   WHEN id = ?1 THEN 1
                   WHEN codigo_barras = ?2 THEN 2
                   WHEN codigo_interno = ?2 THEN 3
                   ELSE 4
               END, nombre
           LIMIT 50"#
    } else {
        r#"SELECT id, codigo_barras, codigo_interno, nombre, descripcion, marca, proveedor, 
                  tipo_medida, categoria_id, precio_compra, precio_venta, precio_mayoreo, 
                  precio_distribuidor, facturable, stock 
           FROM producto 
           WHERE codigo_barras = ?1 
              OR codigo_interno = ?1 
              OR nombre LIKE ?2
           ORDER BY 
               CASE 
                   WHEN codigo_barras = ?1 THEN 1
                   WHEN codigo_interno = ?1 THEN 2
                   ELSE 3
               END, nombre
           LIMIT 50"#
    };

    let mut stmt = conn.prepare(sql).unwrap();
    
    let productos: Vec<Producto> = if let Some(id) = id_val {
        stmt.query_map(params![id, &query, &like_query], |row| parse_producto_row(row))
            .unwrap()
            .filter_map(|r| r.ok())
            .collect()
    } else {
        stmt.query_map(params![&query, &like_query], |row| parse_producto_row(row))
            .unwrap()
            .filter_map(|r| r.ok())
            .collect()
    };

    if productos.is_empty() {
        ApiResponse::error("No se encontraron productos.")
    } else {
        ApiResponse::success("Productos encontrados", productos)
    }
}

// Helper para evitar duplicar código de mapeo
fn parse_producto_row(row: &rusqlite::Row) -> rusqlite::Result<Producto> {
    Ok(Producto {
        id: row.get(0)?,
        codigo_barras: row.get(1)?,
        codigo_interno: row.get(2)?,
        nombre: row.get(3)?,
        descripcion: row.get(4)?,
        marca: row.get(5)?,
        proveedor: row.get(6)?,
        tipo_medida: row.get(7)?,
        categoria_id: row.get(8)?,
        precio_compra: row.get(9)?,
        precio_venta: row.get(10)?,
        precio_mayoreo: row.get(11)?,
        precio_distribuidor: row.get(12)?,
        facturable: row.get::<_, i64>(13)? == 1,
        stock: row.get(14)?,
    })
}


/// Consultar todos los productos con filtros opcionales
#[tauri::command]
pub fn consultar_productos(
    filtros: Option<ProductoFiltros>,
    state: State<AppState>,
) -> ApiResponse<Vec<Producto>> {
    let conn = state.db.conn.lock().unwrap();
    let filtros = filtros.unwrap_or_default();
    
    let mut sql = String::from(
        r#"SELECT id, codigo_barras, codigo_interno, nombre, descripcion, marca, proveedor, 
                  tipo_medida, categoria_id, precio_compra, precio_venta, precio_mayoreo, 
                  precio_distribuidor, facturable, stock 
           FROM producto WHERE 1=1"#
    );
    

    
    if let Some(ref categoria) = filtros.categoria {
        // Buscar ID de categoría
        let cat_id: Option<i64> = conn.query_row(
            "SELECT id FROM categoria WHERE nombre = ? COLLATE NOCASE",
            params![categoria],
            |row| row.get(0)
        ).ok();
        
        if let Some(id) = cat_id {
            sql.push_str(&format!(" AND categoria_id = {}", id));
        }
    }
    
    if let Some(ref marca) = filtros.marca {
        sql.push_str(&format!(" AND marca = '{}' COLLATE NOCASE", marca.replace("'", "''")));
    }
    
    if let Some(ref proveedor) = filtros.proveedor {
        sql.push_str(&format!(" AND proveedor = '{}' COLLATE NOCASE", proveedor.replace("'", "''")));
    }
    
    sql.push_str(" ORDER BY nombre ASC");
    
    if let Some(limit) = filtros.limit {
        if limit > 0 {
            sql.push_str(&format!(" LIMIT {}", limit));
        }
    }
    
    let mut stmt = conn.prepare(&sql).unwrap();
    
    let productos: Vec<Producto> = stmt
        .query_map([], |row| {
            Ok(Producto {
                id: row.get(0)?,
                codigo_barras: row.get(1)?,
                codigo_interno: row.get(2)?,
                nombre: row.get(3)?,
                descripcion: row.get(4)?,
                marca: row.get(5)?,
                proveedor: row.get(6)?,
                tipo_medida: row.get(7)?,
                categoria_id: row.get(8)?,
                precio_compra: row.get(9)?,
                precio_venta: row.get(10)?,
                precio_mayoreo: row.get(11)?,
                precio_distribuidor: row.get(12)?,
                facturable: row.get::<_, i64>(13)? == 1,
                stock: row.get(14)?,
            })
        })
        .unwrap()
        .filter_map(|r| r.ok())
        .collect();

    ApiResponse::success(&format!("{} productos encontrados", productos.len()), productos)
}

/// Obtener un producto por ID
#[tauri::command]
pub fn obtener_producto(id: i64, state: State<AppState>) -> ApiResponse<Producto> {
    let conn = state.db.conn.lock().unwrap();
    
    let result = conn.query_row(
        r#"SELECT id, codigo_barras, codigo_interno, nombre, descripcion, marca, proveedor, 
                  tipo_medida, categoria_id, precio_compra, precio_venta, precio_mayoreo, 
                  precio_distribuidor, facturable, stock 
           FROM producto WHERE id = ?"#,
        params![id],
        |row| {
            Ok(Producto {
                id: row.get(0)?,
                codigo_barras: row.get(1)?,
                codigo_interno: row.get(2)?,
                nombre: row.get(3)?,
                descripcion: row.get(4)?,
                marca: row.get(5)?,
                proveedor: row.get(6)?,
                tipo_medida: row.get(7)?,
                categoria_id: row.get(8)?,
                precio_compra: row.get(9)?,
                precio_venta: row.get(10)?,
                precio_mayoreo: row.get(11)?,
                precio_distribuidor: row.get(12)?,
                facturable: row.get::<_, i64>(13)? == 1,
                stock: row.get(14)?,
            })
        },
    );

    match result {
        Ok(producto) => ApiResponse::success("Producto encontrado", producto),
        Err(_) => ApiResponse::error("Producto no encontrado"),
    }
}

/// Crear nuevo producto
#[tauri::command]
pub fn ingresar_producto(producto: ProductoInput, state: State<AppState>) -> ApiResponse<i64> {
    let conn = state.db.conn.lock().unwrap();
    
    // Validar tipo_medida
    if !TIPOS_MEDIDA.contains(&producto.tipo_medida.as_str()) {
        return ApiResponse::error(&format!(
            "Tipo de medida inválido. Valores válidos: {}",
            TIPOS_MEDIDA.join(", ")
        ));
    }
    
    // Verificar código de barras único
    if let Some(ref codigo) = producto.codigo_barras {
        if !codigo.is_empty() {
            let exists: i64 = conn.query_row(
                "SELECT COUNT(*) FROM producto WHERE codigo_barras = ?",
                params![codigo],
                |row| row.get(0)
            ).unwrap_or(0);
            
            if exists > 0 {
                return ApiResponse::error("El código de barras ya existe");
            }
        }
    }
    
    // Verificar código interno único
    if let Some(ref codigo) = producto.codigo_interno {
        if !codigo.is_empty() {
            let exists: i64 = conn.query_row(
                "SELECT COUNT(*) FROM producto WHERE codigo_interno = ?",
                params![codigo],
                |row| row.get(0)
            ).unwrap_or(0);
            
            if exists > 0 {
                return ApiResponse::error("El código interno ya existe");
            }
        }
    }
    
    let marca = producto.marca.map(|m| m.to_uppercase());
    let proveedor = producto.proveedor
        .map(|p| p.to_uppercase())
        .unwrap_or_else(|| "MANUAL".to_string());
    
    let result = conn.execute(
        r#"INSERT INTO producto (codigo_barras, codigo_interno, nombre, descripcion, marca, 
                                  proveedor, tipo_medida, categoria_id, precio_compra, precio_venta, 
                                  precio_mayoreo, precio_distribuidor, facturable, stock)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"#,
        params![
            producto.codigo_barras,
            producto.codigo_interno,
            producto.nombre,
            producto.descripcion,
            marca,
            proveedor,
            producto.tipo_medida,
            producto.categoria_id,
            producto.precio_compra,
            producto.precio_venta,
            producto.precio_mayoreo,
            producto.precio_distribuidor,
            if producto.facturable { 1 } else { 0 },
            producto.stock
        ]
    );
    
    match result {
        Ok(_) => {
            let id = conn.last_insert_rowid();
            ApiResponse::success("Producto ingresado exitosamente", id)
        }
        Err(e) => ApiResponse::error(&format!("Error al ingresar producto: {}", e)),
    }
}

/// Actualizar producto existente
#[tauri::command]
pub fn guardar_producto(producto: ProductoInput, state: State<AppState>) -> ApiResponse<()> {
    let conn = state.db.conn.lock().unwrap();
    
    let id = match producto.id {
        Some(id) => id,
        None => return ApiResponse::error("ID de producto requerido"),
    };
    
    // Validar tipo_medida
    if !TIPOS_MEDIDA.contains(&producto.tipo_medida.as_str()) {
        return ApiResponse::error(&format!(
            "Tipo de medida inválido. Valores válidos: {}",
            TIPOS_MEDIDA.join(", ")
        ));
    }
    
    // Verificar código de barras único (excluyendo el actual)
    if let Some(ref codigo) = producto.codigo_barras {
        if !codigo.is_empty() {
            let exists: i64 = conn.query_row(
                "SELECT COUNT(*) FROM producto WHERE codigo_barras = ? AND id != ?",
                params![codigo, id],
                |row| row.get(0)
            ).unwrap_or(0);
            
            if exists > 0 {
                return ApiResponse::error("El código de barras ya está asignado a otro producto");
            }
        }
    }
    
    let marca = producto.marca.map(|m| m.to_uppercase());
    let proveedor = producto.proveedor
        .map(|p| p.to_uppercase())
        .unwrap_or_else(|| "MANUAL".to_string());
    
    let result = conn.execute(
        r#"UPDATE producto SET 
               codigo_barras = ?, codigo_interno = ?, nombre = ?, descripcion = ?, 
               marca = ?, proveedor = ?, tipo_medida = ?, categoria_id = ?, 
               precio_compra = ?, precio_venta = ?, precio_mayoreo = ?, 
               precio_distribuidor = ?, facturable = ?, stock = ?
           WHERE id = ?"#,
        params![
            producto.codigo_barras,
            producto.codigo_interno,
            producto.nombre,
            producto.descripcion,
            marca,
            proveedor,
            producto.tipo_medida,
            producto.categoria_id,
            producto.precio_compra,
            producto.precio_venta,
            producto.precio_mayoreo,
            producto.precio_distribuidor,
            if producto.facturable { 1 } else { 0 },
            producto.stock,
            id
        ]
    );
    
    match result {
        Ok(_) => ApiResponse::success("Producto actualizado correctamente", ()),
        Err(e) => ApiResponse::error(&format!("Error al actualizar: {}", e)),
    }
}

/// Eliminar producto
#[tauri::command]
pub fn eliminar_producto(id: i64, state: State<AppState>) -> ApiResponse<()> {
    let conn = state.db.conn.lock().unwrap();
    
    // Verificar que el producto existe
    let exists: i64 = conn.query_row(
        "SELECT COUNT(*) FROM producto WHERE id = ?",
        params![id],
        |row| row.get(0)
    ).unwrap_or(0);
    
    if exists == 0 {
        return ApiResponse::error("El producto no existe");
    }
    
    // Verificar que no tenga ventas asociadas
    let ventas: i64 = conn.query_row(
        "SELECT COUNT(*) FROM ticket_producto WHERE producto_id = ?",
        params![id],
        |row| row.get(0)
    ).unwrap_or(0);
    
    if ventas > 0 {
        return ApiResponse::error("No se puede eliminar: el producto tiene ventas asociadas");
    }
    
    let result = conn.execute("DELETE FROM producto WHERE id = ?", params![id]);
    
    match result {
        Ok(_) => ApiResponse::success("Producto eliminado correctamente", ()),
        Err(e) => ApiResponse::error(&format!("Error al eliminar: {}", e)),
    }
}

// ==================== CATEGORÍAS ====================

/// Obtener todas las categorías
#[tauri::command]
pub fn obtener_categorias(state: State<AppState>) -> ApiResponse<Vec<Categoria>> {
    let conn = state.db.conn.lock().unwrap();
    
    let mut stmt = conn.prepare("SELECT id, nombre FROM categoria ORDER BY nombre").unwrap();
    
    let categorias: Vec<Categoria> = stmt
        .query_map([], |row| {
            Ok(Categoria {
                id: row.get(0)?,
                nombre: row.get(1)?,
            })
        })
        .unwrap()
        .filter_map(|r| r.ok())
        .collect();

    ApiResponse::success("Categorías obtenidas", categorias)
}

/// Crear nueva categoría
#[tauri::command]
pub fn crear_categoria(nombre: String, state: State<AppState>) -> ApiResponse<i64> {
    let conn = state.db.conn.lock().unwrap();
    
    let nombre_upper = nombre.to_uppercase();
    
    let result = conn.execute(
        "INSERT INTO categoria (nombre) VALUES (?)",
        params![nombre_upper]
    );
    
    match result {
        Ok(_) => {
            let id = conn.last_insert_rowid();
            ApiResponse::success("Categoría creada", id)
        }
        Err(e) => {
            if e.to_string().contains("UNIQUE") {
                ApiResponse::error("La categoría ya existe")
            } else {
                ApiResponse::error(&format!("Error al crear categoría: {}", e))
            }
        }
    }
}

/// Obtener marcas únicas
#[tauri::command]
pub fn obtener_marcas(state: State<AppState>) -> ApiResponse<Vec<String>> {
    let conn = state.db.conn.lock().unwrap();
    
    let mut stmt = conn.prepare(
        "SELECT DISTINCT marca FROM producto WHERE marca IS NOT NULL AND marca != '' ORDER BY marca"
    ).unwrap();
    
    let marcas: Vec<String> = stmt
        .query_map([], |row| row.get(0))
        .unwrap()
        .filter_map(|r| r.ok())
        .collect();

    ApiResponse::success("Marcas obtenidas", marcas)
}

/// Obtener proveedores únicos
#[tauri::command]
pub fn obtener_proveedores(state: State<AppState>) -> ApiResponse<Vec<String>> {
    let conn = state.db.conn.lock().unwrap();
    
    let mut stmt = conn.prepare(
        "SELECT DISTINCT proveedor FROM producto WHERE proveedor IS NOT NULL AND proveedor != '' ORDER BY proveedor"
    ).unwrap();
    
    let proveedores: Vec<String> = stmt
        .query_map([], |row| row.get(0))
        .unwrap()
        .filter_map(|r| r.ok())
        .collect();

    ApiResponse::success("Proveedores obtenidos", proveedores)
}

/// Importar productos masivos (Específico para catálogo TRUPER)
#[tauri::command]
pub fn importar_productos_truper(
    productos: Vec<ProductoInput>,
    state: State<AppState>,
) -> ApiResponse<String> {
    let mut conn = state.db.conn.lock().unwrap();
    
    // Iniciar transacción para mejorar rendimiento y consistencia
    let tx = match conn.transaction() {
        Ok(tx) => tx,
        Err(e) => return ApiResponse::error(&format!("Error al iniciar transacción: {}", e)),
    };

    let mut inserted = 0;
    let mut updated = 0;
    let mut skipped = 0; 

    {
        // Preparar statements
        let mut check_stmt = tx.prepare("SELECT id, proveedor FROM producto WHERE codigo_interno = ?").unwrap();
        
        // Nota: Asumimos que los parametros coinciden con los del execute
        let mut insert_stmt = tx.prepare(
            r#"INSERT INTO producto (
                codigo_barras, codigo_interno, nombre, descripcion, marca, 
                proveedor, tipo_medida, categoria_id, precio_compra, precio_venta, 
                precio_mayoreo, precio_distribuidor, facturable, stock
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"#
        ).unwrap();

        let mut update_stmt = tx.prepare(
            r#"UPDATE producto SET 
                codigo_barras = ?, nombre = ?, descripcion = ?, marca = ?, 
                tipo_medida = ?, precio_compra = ?, precio_venta = ?, 
                precio_mayoreo = ?, precio_distribuidor = ?
               WHERE id = ?"#
        ).unwrap();

        for p in productos {
            let codigo_interno = match &p.codigo_interno {
                Some(c) if !c.is_empty() => c,
                _ => continue, 
            };

            // Verificar si existe
            let existing: Option<(i64, String)> = check_stmt.query_row(
                params![codigo_interno],
                |row| Ok((row.get(0)?, row.get(1)?))
            ).ok();

            if let Some((id, proveedor)) = existing {
                if proveedor.to_uppercase() == "TRUPER" {
                    let marca = p.marca.as_ref().map(|m| m.to_uppercase());
                    
                    update_stmt.execute(params![
                        p.codigo_barras,
                        p.nombre,
                        p.descripcion,
                        marca,
                        p.tipo_medida,
                        p.precio_compra,
                        p.precio_venta,
                        p.precio_mayoreo,
                        p.precio_distribuidor,
                        id
                    ]).unwrap_or_default();
                    updated += 1;
                } else {
                    skipped += 1;
                }
            } else {
                let marca = p.marca.as_ref().map(|m| m.to_uppercase());
                let proveedor = p.proveedor.clone().unwrap_or_else(|| "TRUPER".to_string()).to_uppercase();

                insert_stmt.execute(params![
                    p.codigo_barras,
                    p.codigo_interno,
                    p.nombre,
                    p.descripcion,
                    marca,
                    proveedor,
                    p.tipo_medida,
                    p.categoria_id,
                    p.precio_compra,
                    p.precio_venta,
                    p.precio_mayoreo,
                    p.precio_distribuidor,
                    if p.facturable { 1 } else { 0 },
                    p.stock
                ]).unwrap_or_default();
                inserted += 1;
            }
        }
    } 

    match tx.commit() {
        Ok(_) => ApiResponse::success(
            &format!("Importación completada: {} insertados, {} actualizados, {} omitidos (no son Truper)", inserted, updated, skipped),
            format!("Insertados: {}, Actualizados: {}", inserted, updated)
        ),
        Err(e) => ApiResponse::error(&format!("Error al confirmar transacción: {}", e)),
    }
}

/// Rellenar stock masivo (Herramienta de desarrollo)
#[tauri::command]
pub fn rellenar_stock_masivo(
    state: State<AppState>,
) -> ApiResponse<String> {
    let conn = state.db.conn.lock().unwrap();
    
    // Ejecutar UPDATE masivo
    match conn.execute("UPDATE producto SET stock = 100", []) {
        Ok(rows) => ApiResponse::success(
            &format!("Stock actualizado correctamente en {} productos", rows),
            format!("Updated: {}", rows)
        ),
        Err(e) => ApiResponse::error(&format!("Error al actualizar stock: {}", e)),
    }
}
