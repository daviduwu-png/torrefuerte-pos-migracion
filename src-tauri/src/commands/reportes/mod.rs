//! Módulo de reportes para TorreFuerte POS.
//!
//! Submódulos:
//! - [`utils`]      — Utilidades compartidas (`get_home_dir`).
//! - [`corte`]      — Comandos `obtener_corte_caja` y `exportar_corte_excel`.
//! - [`financiero`] — Comando `exportar_reporte_financiero`.
//! - [`graficas`]   — Comandos `reporte_ventas_diarias`, `reporte_ventas_semanales`,
//!                    `reporte_ventas_mensuales`, `reporte_ventas_anuales` y `obtener_estadisticas`.

pub mod utils;
pub mod corte;
pub mod financiero;
pub mod graficas;

pub use corte::*;
pub use financiero::*;
