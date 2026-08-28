use crate::db::Database;
use crate::models::*;
use std::sync::Arc;

/// Estado de la aplicación
pub struct AppState {
    pub db: Arc<Database>,
    pub current_user: std::sync::Mutex<Option<Usuario>>,
}
