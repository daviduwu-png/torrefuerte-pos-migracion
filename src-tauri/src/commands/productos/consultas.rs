use crate::commands::AppState;
use super::utils::parse_producto_row;
use crate::models::*;
use rusqlite::params;
use tauri::State;

/// Buscar productos por código de barras, código interno o nombre.
///
/// Prioridad:
///   1. Código de barras (exacto)
///   2. Código interno   (exacto)
///   3. Nombre           (todas las palabras del query deben aparecer en el nombre,
///                        en cualquier orden — p.ej. "malla negra" encuentra
///                        "ROLLO DE MALLA MOSQUITERA NEGRA")
#[tauri::command]
pub fn buscar_producto(query: String, state: State<AppState>) -> ApiResponse<Vec<Producto>> {
    let conn = state.db.conn.lock().unwrap();

    // --- Búsqueda exacta por códigos ---
    let sql_exacto = r#"
        SELECT id, codigo_barras, codigo_interno, nombre, descripcion, marca, proveedor,
               tipo_medida, categoria_id, precio_compra, precio_venta, precio_mayoreo,
               precio_distribuidor, facturable, stock, precio_compra_incluye_iva
        FROM producto
        WHERE codigo_barras = ?1
           OR codigo_interno = ?1
        ORDER BY
            CASE
                WHEN codigo_barras = ?1 THEN 1
                WHEN codigo_interno = ?1 THEN 2
                ELSE 3
            END
        LIMIT 10
    "#;

    let mut stmt_exacto = conn.prepare(sql_exacto).unwrap();
    let exactos: Vec<Producto> = stmt_exacto
        .query_map(params![&query], |row| parse_producto_row(row))
        .unwrap()
        .filter_map(|r| r.ok())
        .collect();

    if !exactos.is_empty() {
        return ApiResponse::success("Productos encontrados", exactos);
    }

    // --- Búsqueda por nombre con tokens ---
    let tokens: Vec<String> = query
        .split_whitespace()
        .filter(|t| !t.is_empty())
        .map(|t| format!("%{}%", t))
        .collect();

    if tokens.is_empty() {
        return ApiResponse::error("No se encontraron productos.");
    }

    let conditions: String = (0..tokens.len())
        .map(|i| format!("nombre LIKE ?{}", i + 1))
        .collect::<Vec<_>>()
        .join(" AND ");

    let sql_nombre = format!(
        r#"SELECT id, codigo_barras, codigo_interno, nombre, descripcion, marca, proveedor,
                  tipo_medida, categoria_id, precio_compra, precio_venta, precio_mayoreo,
                  precio_distribuidor, facturable, stock, precio_compra_incluye_iva
           FROM producto
           WHERE {conditions}
           ORDER BY nombre
           LIMIT 50"#
    );

    let mut stmt_nombre = conn.prepare(&sql_nombre).unwrap();

    let params_refs: Vec<&dyn rusqlite::types::ToSql> = tokens
        .iter()
        .map(|t| t as &dyn rusqlite::types::ToSql)
        .collect();

    let productos: Vec<Producto> = stmt_nombre
        .query_map(params_refs.as_slice(), |row| parse_producto_row(row))
        .unwrap()
        .filter_map(|r| r.ok())
        .collect();

    if productos.is_empty() {
        ApiResponse::error("No se encontraron productos.")
    } else {
        ApiResponse::success("Productos encontrados", productos)
    }
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
                  precio_distribuidor, facturable, stock, precio_compra_incluye_iva 
           FROM producto WHERE 1=1"#,
    );

    if let Some(ref categoria) = filtros.categoria {
        // Buscar ID de categoría
        let cat_id: Option<i64> = conn
            .query_row(
                "SELECT id FROM categoria WHERE nombre = ? COLLATE NOCASE",
                params![categoria],
                |row| row.get(0),
            )
            .ok();

        if let Some(id) = cat_id {
            sql.push_str(&format!(" AND categoria_id = {}", id));
        }
    }

    if let Some(ref marca) = filtros.marca {
        sql.push_str(&format!(
            " AND marca = '{}' COLLATE NOCASE",
            marca.replace("'", "''")
        ));
    }

    if let Some(ref proveedor) = filtros.proveedor {
        sql.push_str(&format!(
            " AND proveedor = '{}' COLLATE NOCASE",
            proveedor.replace("'", "''")
        ));
    }

    sql.push_str(" ORDER BY nombre ASC");

    if let Some(limit) = filtros.limit {
        if limit > 0 {
            sql.push_str(&format!(" LIMIT {}", limit));
        }
    }

    let mut stmt = conn.prepare(&sql).unwrap();

    let productos: Vec<Producto> = stmt
        .query_map([], |row| parse_producto_row(row))
        .unwrap()
        .filter_map(|r| r.ok())
        .collect();

    ApiResponse::success(
        &format!("{} productos encontrados", productos.len()),
        productos,
    )
}

/// Obtener un producto por ID
#[tauri::command]
pub fn obtener_producto(id: i64, state: State<AppState>) -> ApiResponse<Producto> {
    let conn = state.db.conn.lock().unwrap();

    let result = conn.query_row(
        r#"SELECT id, codigo_barras, codigo_interno, nombre, descripcion, marca, proveedor, 
                  tipo_medida, categoria_id, precio_compra, precio_venta, precio_mayoreo, 
                  precio_distribuidor, facturable, stock, precio_compra_incluye_iva 
           FROM producto WHERE id = ?"#,
        params![id],
        |row| parse_producto_row(row),
    );

    match result {
        Ok(producto) => ApiResponse::success("Producto encontrado", producto),
        Err(_) => ApiResponse::error("Producto no encontrado"),
    }
}

/// Consultar productos paginados con filtros server-side (optimizado para grandes volúmenes)
#[tauri::command]
pub fn consultar_productos_paginado(
    filtros: Option<ProductoFiltrosPaginado>,
    state: State<AppState>,
) -> ApiResponse<ProductosPaginados> {
    let conn = state.db.conn.lock().unwrap();
    let filtros = filtros.unwrap_or_default();

    let page = filtros.page.unwrap_or(1).max(1);
    let page_size = filtros.page_size.unwrap_or(50).clamp(1, 200);
    let offset = (page - 1) * page_size;

    // ─── Construir cláusula WHERE compartida ───────────────────────────────────
    let mut where_parts: Vec<String> = vec!["1=1".to_string()];

    // Filtro facturable
    if let Some(facturable) = filtros.facturable {
        where_parts.push(format!("facturable = {}", if facturable { 1 } else { 0 }));
    }

    // Filtro categoría
    if let Some(categoria_id) = filtros.categoria_id {
        where_parts.push(format!("categoria_id = {}", categoria_id));
    }

    // Filtro marca (exact, case-insensitive)
    if let Some(ref marca) = filtros.marca {
        if !marca.is_empty() {
            where_parts.push(format!(
                "marca = '{}' COLLATE NOCASE",
                marca.replace('\'', "''")
            ));
        }
    }

    // Filtro proveedor (exact, case-insensitive)
    if let Some(ref proveedor) = filtros.proveedor {
        if !proveedor.is_empty() {
            where_parts.push(format!(
                "proveedor = '{}' COLLATE NOCASE",
                proveedor.replace('\'', "''")
            ));
        }
    }

    // Búsqueda por nombre / código (tokens inline en SQL)
    if let Some(ref busqueda) = filtros.busqueda {
        let b = busqueda.trim();
        if !b.is_empty() {
            let tokens: Vec<String> = b
                .split_whitespace()
                .filter(|t| !t.is_empty())
                .map(|t| format!("%{}%", t.replace("'", "''")))
                .collect();

            if !tokens.is_empty() {
                let nombre_conds: String = tokens
                    .iter()
                    .map(|tok| format!("nombre LIKE '{}'", tok))
                    .collect::<Vec<_>>()
                    .join(" AND ");

                let escaped = b.replace("'", "''");
                where_parts.push(format!(
                    "(codigo_barras = '{esc}' OR codigo_interno = '{esc}' OR ({nombre_conds}))",
                    esc = escaped,
                    nombre_conds = nombre_conds
                ));
            }
        }
    }

    let where_clause = where_parts.join(" AND ");

    // ─── Contar total ──────────────────────────────────────────────────────────
    let count_sql = format!(
        "SELECT COUNT(*) FROM producto WHERE {}",
        where_clause
    );
    let total: i64 = conn
        .query_row(&count_sql, [], |row| row.get(0))
        .unwrap_or(0);

    // ─── Datos paginados ───────────────────────────────────────────────────────
    let data_sql = format!(
        r#"SELECT id, codigo_barras, codigo_interno, nombre, descripcion, marca, proveedor,
                  tipo_medida, categoria_id, precio_compra, precio_venta, precio_mayoreo,
                  precio_distribuidor, facturable, stock, precio_compra_incluye_iva
           FROM producto
           WHERE {}
           ORDER BY nombre ASC
           LIMIT {} OFFSET {}"#,
        where_clause, page_size, offset
    );

    let mut stmt = conn.prepare(&data_sql).unwrap();
    let productos: Vec<Producto> = stmt
        .query_map([], |row| parse_producto_row(row))
        .unwrap()
        .filter_map(|r| r.ok())
        .collect();

    let total_pages = ((total as f64) / (page_size as f64)).ceil() as i64;

    ApiResponse::success(
        &format!("{} productos encontrados", total),
        ProductosPaginados {
            productos,
            total,
            page,
            page_size,
            total_pages,
        },
    )
}

/// Obtener conteo de productos facturables y no facturables
#[tauri::command]
pub fn conteo_productos_facturable(state: State<AppState>) -> ApiResponse<ConteoFacturable> {
    let conn = state.db.conn.lock().unwrap();

    let facturables: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM producto WHERE facturable = 1",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let no_facturables: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM producto WHERE facturable = 0",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    ApiResponse::success(
        "Conteo obtenido",
        ConteoFacturable {
            facturables,
            no_facturables,
            total: facturables + no_facturables,
        },
    )
}
