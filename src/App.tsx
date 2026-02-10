import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "./components/layout";
import Login from "./pages/Login";
import {
  AdminDashboard,
  Devoluciones,
  ImportarProductos,
  Reportes,
  Ventas,
  Productos,
  RellenarStock,
  BaseDatos,
} from "./pages/admin";
import {
  VendedorDashboard,
  VerificarPrecios,
  CorteCaja,
} from "./pages/vendedor";

function App() {
  return (
    <BrowserRouter>
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
          <Route path="rellenar-stock" element={<RellenarStock />} />
          <Route path="reportes" element={<Reportes />} />
          <Route path="ventas" element={<Ventas />} />
          <Route path="base-datos" element={<BaseDatos />} />
        </Route>

        {/* Vendedor Routes */}
        <Route path="/vendedor" element={<MainLayout userType="vendedor" />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<VendedorDashboard />} />
          <Route path="verificar-precios" element={<VerificarPrecios />} />
          <Route path="corte-caja" element={<CorteCaja />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
