import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import Login from "./components/Login";
import DashboardLayout from "./pages/DashboardLayout";
import Dashboard from "./components/Dashboard";
import SettingsHub from "./components/settings/SettingsHub";
import SettingsRouter from "./components/settings/SettingsRouter";
import Clients from "./components/Clients";
import Jobs from "./components/Jobs";
import Inventory from "./components/Inventory";
import Assembly from "./components/Assembly";
import AfterService from "./components/AfterService";
import Delivery from "./components/Delivery";
import SoftwareKeys from "./components/SoftwareKeys";
import AuditPortal from "./components/AuditPortal";
import Users from "./components/Users";
import Reports from "./components/Reports";
import Lending from "./components/Lending";

function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/audit" element={<AuditPortal />} />
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route path="/app" element={<DashboardLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="settings/*" element={<SettingsRouter />} />
          <Route path="clients" element={<Clients />} />
          <Route path="jobs" element={<Jobs />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="assembly" element={<Assembly />} />
          <Route path="delivery" element={<Delivery />} />
          <Route path="software-keys" element={<SoftwareKeys />} />
          <Route path="afterservice" element={<AfterService />} />
          <Route path="users" element={<Users />} />
          <Route path="reports" element={<Reports />} />
          <Route path="lending" element={<Lending />} />

          {/* TODO: add as implemented */}
          {/* <Route path="users"          element={<Users />} /> */}
          {/* <Route path="catalogs/*"     element={<Catalogs />} /> */}
          {/* <Route path="repairs"        element={<Repairs />} /> */}
          {/* <Route path="audit"          element={<AuditLog />} /> */}
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      <Toaster position="top-right" richColors />
    </>
  );
}

export default App;
