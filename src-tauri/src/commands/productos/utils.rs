use crate::models::Producto;

// Helper para evitar duplicar código de mapeo
pub fn parse_producto_row(row: &rusqlite::Row) -> rusqlite::Result<Producto> {
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
        precio_compra_incluye_iva: row.get::<_, i64>(15)? == 1,
    })
}
