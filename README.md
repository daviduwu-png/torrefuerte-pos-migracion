# TorreFuerte POS

![Tauri](https://img.shields.io/badge/Tauri-v2-24C8DB?logo=tauri&logoColor=white&style=for-the-badge)
![React](https://img.shields.io/badge/React-v19.1-61DAFB?logo=react&logoColor=black&style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-v5.8-3178C6?logo=typescript&logoColor=white&style=for-the-badge)
![Vite](https://img.shields.io/badge/Vite-v7.0-646CFF?logo=vite&logoColor=white&style=for-the-badge)
![TailwindCSS](https://img.shields.io/badge/Tailwind-v3.4-06B6D4?logo=tailwindcss&logoColor=white&style=for-the-badge)
![Rust](https://img.shields.io/badge/Rust-2021-000000?logo=rust&logoColor=white&style=for-the-badge)
![SQLite](https://img.shields.io/badge/SQLite-v3-003B57?logo=sqlite&logoColor=white&style=for-the-badge)

Sistema de Punto de Venta (POS) diseñado específicamente para ferreterías, desarrollado con **Tauri, React, TypeScript y Rust**. Proporciona una interfaz rápida y una base de datos local robusta para garantizar alta disponibilidad sin depender de conexión a internet.

## Tecnologías Utilizadas

- **Frontend:** React, TypeScript, Vite, TailwindCSS. Gráficos con Recharts, generación de códigos de barras con jsbarcode, y exportación de documentos.
- **Backend:** Rust con el framework Tauri.
- **Base de Datos:** SQLite (mediante `rusqlite`).
- **Hardware Integrado:** Soporte nativo para impresoras térmicas (ESC/POS) y lectores de código de barras.

## Características Principales

El sistema está dividido en dos módulos principales: **Administración** y **Punto de Venta (Vendedor)**.

### Módulo de Punto de Venta (Vendedor)
- **Dashboard POS:** Interfaz ágil para búsqueda de productos y gestión del carrito de compras.
- **Procesamiento de Ventas:** Cobro ágil (efectivo, tarjeta) con cálculo automático de cambio y generación de tickets.
- **Verificador de Precios:** Consulta rápida de productos y precios.
- **Corte de Caja:** Registro y generación de cortes de caja al finalizar turnos.

### Módulo de Administración
- **Dashboard Analítico:** Estadísticas generales de ventas y gráficas interactivas.
- **Gestión de Inventario (Productos):** Altas, bajas, modificaciones, y rellenado de stock.
- **Importación Masiva:** Importación ágil de catálogos de productos (ej. Truper) mediante archivos Excel.
- **Gestión Comercial:**
  - **Clientes:** Directorio y seguimiento.
  - **Cotizaciones:** Creación y gestión de presupuestos.
  - **Pedidos a Proveedores:** Seguimiento y recepción de mercancía.
  - **Apartados:** Sistema de layaways con control de abonos, liquidaciones y cancelaciones.
  - **Devoluciones:** Gestión de devoluciones de mercancía vendida.
- **Etiquetas y Códigos de Barras:** Generación, asignación e impresión de etiquetas con códigos de barras.
- **Reportes Financieros:** Visualización y exportación a Excel de reportes de ventas (diarios, semanales, mensuales, anuales).
- **Configuración del Sistema:** Datos del negocio para tickets, gestión de usuarios (roles) e impresoras.
- **Base de Datos:** Sistema integrado para crear respaldos (backups) y restaurar la base de datos local.

## Requisitos del Sistema

- **Node.js** (v18 o superior recomendado)
- **Rust** (última versión estable) y gestor de paquetes Cargo
- **Tauri CLI**

## Instalación y Ejecución

1. Clonar el repositorio y navegar a la carpeta del proyecto.
2. Instalar dependencias del frontend:
   ```sh
   npm install
   ```
3. Ejecutar en modo desarrollo:
   ```sh
   npm run tauri dev
   ```

*Nota en desarrollo: La base de datos se crea en la carpeta `db/torrefuerte.db` dentro del proyecto.*

## Configuración de Impresión (Linux/Windows)

El sistema se comunica directamente con las impresoras térmicas, permitiendo gran velocidad y personalización.
- **Windows:** Requiere que la impresora esté instalada y compartida (por defecto el sistema puede buscar configuraciones como `\\.\POS-58` o mediante la API de Windows GDI).
- **Linux:** Puede comunicarse directamente mediante los dispositivos físicos (`/dev/usb/lp*`, `/dev/ttyUSB*`), o a través de CUPS. Asegurarse de que el usuario pertenezca al grupo `lp` y/o `dialout`.

## Construcción para Producción

Para compilar la aplicación y generar el ejecutable final para producción:

```sh
npm run tauri build
```

El ejecutable generado se encontrará en la carpeta `src-tauri/target/release/bundle/`. 
*En producción, la base de datos se guarda de forma segura en la ruta del sistema del usuario, ej. `~/.torrefuerte_data/torrefuerte.db`.*
