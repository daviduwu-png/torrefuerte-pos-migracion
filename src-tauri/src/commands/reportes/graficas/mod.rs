// Módulo graficas — comandos Tauri para las gráficas y estadísticas del dashboard.
//
//! Submódulos:
//! - [`utils`]       — helpers compartidos (fecha base, filtros SQL, campos)
//! - [`diarias`]     — reporte_ventas_diarias    (últimos 7 días)
//! - [`semanales`]   — reporte_ventas_semanales  (últimas 4 semanas Lun–Sáb)
//! - [`mensuales`]   — reporte_ventas_mensuales  (últimos 12 meses)
//! - [`anuales`]     — reporte_ventas_anuales    (últimos 5 años)
//! - [`estadisticas`]— obtener_estadisticas      (StatCards del día seleccionado)

pub mod anuales;
pub mod diarias;
pub mod estadisticas;
pub mod mensuales;
pub mod semanales;
pub mod utils;

