//! Módulo de impresión ESC/POS para impresoras térmicas POS-58.
//!
//! Submódulos:
//! - [`escpos`]      — Builder de comandos ESC/POS (`EscPos`) y `sanitize_text`.
//! - [`driver`]      — Capa de transporte (Windows / Linux / fallback).
//! - [`ticket`]      — Comando `imprimir_ticket`.
//! - [`corte`]       — Comando `imprimir_corte`.
//! - [`test_page`]   — Comando `imprimir_test`.
//! - [`diagnostico`] — Comando `listar_impresoras`.
//! - [`barcode`]     — Comando `imprimir_codigos_barras`.

pub mod escpos;
pub mod driver;
pub mod ticket;
pub mod corte;
pub mod test_page;
pub mod diagnostico;
pub mod barcode;
