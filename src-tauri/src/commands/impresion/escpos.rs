/// Genera la secuencia de bytes ESC/POS para la impresora térmica POS-58.
pub struct EscPos {
    pub buffer: Vec<u8>,
}

impl EscPos {
    pub fn new() -> Self {
        Self { buffer: Vec::new() }
    }

    /// ESC @ — reinicia la impresora al estado por defecto.
    pub fn init(&mut self) {
        self.buffer.extend_from_slice(&[0x1B, 0x40]);
    }

    /// ESC a 1 — alineación centrada.
    pub fn center(&mut self) {
        self.buffer.extend_from_slice(&[0x1B, 0x61, 0x01]);
    }

    /// ESC a 0 — alineación izquierda.
    pub fn left(&mut self) {
        self.buffer.extend_from_slice(&[0x1B, 0x61, 0x00]);
    }

    /// ESC a 2 — alineación derecha.
    pub fn right(&mut self) {
        self.buffer.extend_from_slice(&[0x1B, 0x61, 0x02]);
    }

    /// ESC E n — negrita on/off.
    pub fn bold(&mut self, on: bool) {
        let val = if on { 1 } else { 0 };
        self.buffer.extend_from_slice(&[0x1B, 0x45, val]);
    }

    /// GS ! n — doble tamaño on/off.
    pub fn double_size(&mut self, on: bool) {
        let val = if on { 0x11 } else { 0x00 };
        self.buffer.extend_from_slice(&[0x1D, 0x21, val]);
    }

    /// Texto sanitizado (sin acentos, solo ASCII).
    pub fn text(&mut self, s: &str) {
        let sanitized = sanitize_text(s);
        self.buffer.extend_from_slice(sanitized.as_bytes());
    }

    /// Texto crudo sin sanitizar (separadores, formatos numéricos, etc.).
    pub fn text_raw(&mut self, s: &str) {
        self.buffer.extend_from_slice(s.as_bytes());
    }

    /// ESC d n — avanza n líneas en blanco.
    pub fn feed(&mut self, n: u8) {
        self.buffer.extend_from_slice(&[0x1B, 0x64, n]);
    }

    /// GS V 0 — corte de papel.
    pub fn cut(&mut self) {
        self.buffer.extend_from_slice(&[0x1D, 0x56, 0x00]);
    }

    /// ESC p — activa el cajón de dinero (puerto kick-out).
    pub fn pulse(&mut self) {
        self.buffer
            .extend_from_slice(&[0x1B, 0x70, 0x00, 0x19, 0xFA]);
    }

    /// GS k — imprime un código de barras Code128.
    ///
    /// Parámetros ESC/POS:
    ///   GS k 73 <len> <data…>   (m=73 → Code128, formato función B)
    ///
    /// Altura del barcode: GS h n  (n en puntos, ~2mm por 8 puntos)
    /// Anchura de módulo:  GS w n  (n=2 fine / n=3 normal)
    pub fn barcode_code128(&mut self, data: &str) {
        // --- Altura del barcode (GS h n) ---
        // 80 puntos ≈ 10 mm, razonable para 58 mm de papel.
        self.buffer.extend_from_slice(&[0x1D, 0x68, 80]);

        // --- Anchura de módulo (GS w n) ---
        // n=2 → estrecho (adecuado para papel 58 mm)
        self.buffer.extend_from_slice(&[0x1D, 0x77, 2]);

        // --- HRI: sin texto debajo (GS H 0) ---
        // Ya imprimimos el código numérico arriba manualmente.
        self.buffer.extend_from_slice(&[0x1D, 0x48, 0x00]);

        // --- GS k m=73 (Code128 función B) len data ---
        // El prefijo {B selecciona el juego de caracteres B (ASCII 32–127).
        let prefix = b"{B";
        let payload: Vec<u8> = prefix
            .iter()
            .chain(data.as_bytes().iter())
            .copied()
            .collect();

        self.buffer.extend_from_slice(&[0x1D, 0x6B, 73]);
        self.buffer.push(payload.len() as u8);
        self.buffer.extend_from_slice(&payload);
    }

    /// Bytes de padding: la impresora USB descarta los primeros ~50 bytes
    /// mientras inicializa el receptor; enviamos nulos para absorber esa pérdida.
    pub fn padding(&mut self) {
        self.buffer.extend_from_slice(&[0u8; 64]);
    }
}

/// Convierte texto a ASCII puro (mayúsculas, sin acentos ni ñ).
/// Se usa para todo el texto de tickets y etiquetas.
pub fn sanitize_text(s: &str) -> String {
    let s = s.to_uppercase();
    let s = s
        .replace('Á', "A")
        .replace('É', "E")
        .replace('Í', "I")
        .replace('Ó', "O")
        .replace('Ú', "U")
        .replace('Ñ', "N")
        .replace('Ü', "U");
    s.chars().filter(|c| c.is_ascii()).collect()
}
