import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sileo";
import { listen } from "@tauri-apps/api/event";
import { notify } from "./utils/sileo";
import { MainLayout } from "./components/layout";
import Login from "./pages/Login";
import {
  AdminDashboard,
  Devoluciones,
  ImportarProductos,
  Reportes,
  Ventas,
  Productos,
  BaseDatos,
  Etiquetas,
  Gestion,
  Pedidos,
  Configuracion,
} from "./pages/admin";
import { VendedorDashboard, CorteCaja } from "./pages/vendedor";

function App() {
  // Listener global para notificar silenciosamente el resultado del upload a R2
  useEffect(() => {
    const unlistenOk = listen<string>("r2-upload-ok", (event) => {
      const tipo = event.payload;
      notify.success({
        title: "Nube sincronizada",
        description: `Respaldo (${tipo}) subido a R2 correctamente.`,
        duration: 5000,
      });
    });

    const unlistenErr = listen<string>("r2-upload-error", (event) => {
      notify.error({
        title: "Error en nube",
        description: `No se pudo subir el respaldo a R2: ${event.payload}`,
        duration: 12000,
      });
    });

    return () => {
      unlistenOk.then((f) => f());
      unlistenErr.then((f) => f());
    };
  }, []);

  return (
    <BrowserRouter>
      <Toaster
        theme="dark"
        position="top-center"
        offset={{ top: 20 }}
        options={{
          fill: "#000000",
          styles: {
            // El título y su color se manejan individualmente en src/utils/sileo.ts
            description:
              "!text-slate-200 !text-base !text-center !w-full !block",
          },
        }}
      />
      <Routes>
        {/* Login as default route */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<MainLayout userType="admin" />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="productos" element={<Productos />} />
          <Route path="devoluciones" element={<Devoluciones />} />
          <Route path="importar-productos" element={<ImportarProductos />} />
          <Route path="reportes" element={<Reportes />} />
          <Route path="ventas" element={<Ventas />} />
          <Route path="base-datos" element={<BaseDatos />} />
          <Route path="etiquetas" element={<Etiquetas />} />
          <Route path="gestion" element={<Gestion />} />
          <Route path="pedidos" element={<Pedidos />} />
          <Route path="configuracion" element={<Configuracion />} />
        </Route>

        {/* Vendedor Routes */}
        <Route path="/vendedor" element={<MainLayout userType="vendedor" />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<VendedorDashboard />} />
          <Route path="corte-caja" element={<CorteCaja />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
