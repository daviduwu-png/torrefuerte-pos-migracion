# TorreFuerte POS

Sistema de Punto de Venta (POS) diseñado especificamente para ferreterias, desarrollado con Tauri, React, Typescript y Rust.

## Caracteristicas Principales

- Gestion de inventario y productos
- Puntos de venta y generacion de tickets
- Integracion con impresoras termicas (ESC/POS)
- Control de usuarios y permisos
- Reportes financieros y exportacion a Excel
- Base de datos local SQLite para alta disponibilidad y rendimiento

## Requisitos del Sistema

- Node.js (v16 o superior recomendado)
- Rust (ultima version estable)
- Tauri CLI

## Instalacion y Ejecucion

1. Clonar el repositorio y navegar a la carpeta del proyecto.
2. Instalar dependencias del frontend:
   ```sh
   npm install
   ```
3. Configurar variables de entorno:
   Copiar el archivo `src-tauri/.env.example` a `src-tauri/.env` y configurar los datos del local (RFC, Nombre, Direccion) para los tickets impresos.
4. Ejecutar en modo desarrollo:
   ```sh
   npm run tauri dev
   ```

## Configuracion de Impresion (Linux/Windows)

El sistema se comunica directamente con las impresoras termicas.
- Windows: Requiere que la impresora este instalada y compartida (por defecto busca `\\.\POS-58`).
- Linux: Puede comunicarse directamente mediante los dispositivos `/dev/usb/lp*`, `/dev/ttyUSB*`, o a traves de CUPS. Asegurarse de que el usuario pertenezca al grupo `lp` y/o `dialout`.

## Construccion para Produccion

Para compilar la aplicacion para produccion:

```sh
npm run tauri build
```

El ejecutable generado se encontrara en la carpeta `src-tauri/target/release/bundle/`.
