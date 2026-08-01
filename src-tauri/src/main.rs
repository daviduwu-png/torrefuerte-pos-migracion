// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Solución para el problema de "ruido/granulado" en Linux Mint y otros Linux
    // (A causa del renderizador DMABUF de WebKit2GTK en algunas GPUs)
    #[cfg(target_os = "linux")]
    std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");

    torrefuerte_lib::run()
}
