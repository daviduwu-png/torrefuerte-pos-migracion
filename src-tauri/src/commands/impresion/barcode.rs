//! Impresión de etiquetas con código de barras para la impresora POS-58.
//!
//! Layout de cada etiqueta (papel 58 mm):
//!
//! ```text
//! ┌────────────────────────────┐
//! │ Codigo: 200xxxxx           │  ← código numérico, izquierda, negrita
//! │                            │
//! │   ▌▌▌▌ ▌ ▌▌▌ ▌ ▌▌ ▌▌▌▌   │  ← barcode Code128, centrado
//! │                            │
//! └────────────────────────────┘
//! ```
//!
//! Comandos expuestos:
//! - `imprimir_codigos_barras` — imprime una lista de etiquetas (con copias).
//! - `asignar_codigo_barras`   — asigna un código a un producto en la BD
//!                               de forma atómica, garantizando integridad.

use crate::commands::productos::AppState;
use crate::models::ApiResponse;
use crate::commands::impresion::{driver::send_to_printer, escpos::EscPos};
use rusqlite::params;
use serde::Deserialize;
use tauri::{command, State};

/// Asigna un código de barras a un producto existente.
///
/// Garantías de integridad:
/// - El producto debe existir en la BD (verificado por ID).
/// - El código de barras debe ser único (constraint UNIQUE en la tabla).
/// - El producto debe existir en la BD (verificado por ID).
/// - El código de barras debe ser único (constraint UNIQUE en la tabla).
/// - Si el producto ya tenía un código, se devuelve error para evitar sobrescrituras.
/// - Nunca puede existir un código de barras que no esté ligado a un producto.
#[command]
pub fn asignar_codigo_barras(
    producto_id: i64,
    codigo_barras: String,
    state: State<AppState>,
) -> ApiResponse<String> {
    let conn = state.db.conn.lock().unwrap();

    // 1. Verificar que el producto existe
    let producto_res: Result<(Option<String>, String), _> = conn.query_row(
        "SELECT codigo_barras, nombre FROM producto WHERE id = ?",
        params![producto_id],
        |row| Ok((row.get(0)?, row.get(1)?)),
    );

    let (barras_actual, nombre) = match producto_res {
        Ok(r) => r,
        Err(_) => return ApiResponse::error(&format!("Producto con ID {} no encontrado.", producto_id)),
    };

    // 2. Validar que el código no esté vacío y tenga longitud razonable
    let codigo = codigo_barras.trim().to_string();
    if codigo.is_empty() {
        return ApiResponse::error("El código de barras no puede estar vacío.");
    }
    if codigo.len() > 50 {
        return ApiResponse::error("El código de barras es demasiado largo (máx 50 chars).");
    }

    // 3. Si ya tiene un código, bloquear permanentemente en este endpoint
    if let Some(ref actual) = barras_actual {
        if !actual.is_empty() {
            return ApiResponse::error(
                "Este producto ya tiene un código de barras. Modifíquelo desde la sección de Productos.",
            );
        }
    }

    // 4. Verificar unicidad global, el mismo código no puede estar en otro producto
    let conflicto: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM producto WHERE codigo_barras = ? AND id != ?",
            params![&codigo, producto_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    if conflicto > 0 {
        return ApiResponse::error(&format!(
            "El código '{}' ya está asignado a otro producto.",
            codigo
        ));
    }

    // 5. Asignar el código en la BD (UPDATE atómico)
    match conn.execute(
        "UPDATE producto SET codigo_barras = ? WHERE id = ?",
        params![&codigo, producto_id],
    ) {
        Ok(_) => ApiResponse::success(
            &format!("Código '{}' asignado a '{}'", codigo, nombre),
            codigo,
        ),
        Err(e) => ApiResponse::error(&format!("Error al guardar el código: {}", e)),
    }
}


/// Un ítem a etiquetar. El frontend envía la lista de productos seleccionados.
#[derive(Debug, Deserialize)]
pub struct ItemEtiqueta {
    /// Código de barras a imprimir (EAN-13, Code128, código interno, etc.).
    /// Si viene vacío se omite el barcode.
    pub codigo: String,
    pub codigo_interno: Option<String>,
    /// Número de copias de esta etiqueta (mínimo 1).
    #[serde(default = "default_copias")]
    pub copias: u8,
}

fn default_copias() -> u8 {
    1
}

/// Imprime una o más etiquetas de código de barras.
///
/// Parámetros:
/// - `items`: lista de productos con su código y nombre.
///
/// Cada etiqueta ocupa ~30 mm de papel (altura del barcode + texto).
#[command]
pub fn imprimir_codigos_barras(items: Vec<ItemEtiqueta>, impresora: Option<String>) -> ApiResponse<()> {
    if items.is_empty() {
        return ApiResponse::error("No se proporcionaron ítems para imprimir.");
    }

    let mut p = EscPos::new();
    p.init();
    p.padding();
    p.feed(1);

    for item in &items {
        let copias = item.copias.max(1);
        for _ in 0..copias {
            imprimir_etiqueta(&mut p, item);
        }
    }

    // Avance final para que la última etiqueta salga completamente del cabezal
    p.feed(4);
    // Sin corte: las etiquetas suelen imprimirse en rollo continuo.
    // Si se desea corte por etiqueta, mover p.cut() dentro del loop.

    match send_to_printer(&p.buffer, impresora.as_deref()) {
        Ok(_) => ApiResponse::success("Etiquetas enviadas a impresión", ()),
        Err(e) => ApiResponse::error(&e),
    }
}

/// Genera los bytes ESC/POS de una sola etiqueta y los agrega al buffer de `p`.
fn imprimir_etiqueta(p: &mut EscPos, item: &ItemEtiqueta) {
    // ── Línea 1: código interno (esquina superior izquierda, negrita) ────────
    p.left();
    p.bold(true);
    if let Some(ref interno) = item.codigo_interno {
        if !interno.is_empty() {
            let display = if interno.len() > 24 { &interno[..24] } else { interno };
            p.text_raw(&format!("Codigo: {}\n", display));
        } else {
            p.text_raw("\n");
        }
    } else {
        p.text_raw("\n");
    }
    p.bold(false);

    // ── Barcode centrado ──────────────────────────────────────────────────────
    if !item.codigo.is_empty() {
        p.center();
        p.barcode_code128(&item.codigo);
        p.text_raw(&format!("{}\n", item.codigo));
        p.feed(1);
    }

    // ── Separador entre etiquetas ─────────────────────────────────────────────
    p.feed(2);
}
