import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import Login from "./components/Login";
import DashboardLayout from "./pages/DashboardLayout";
import Dashboard from "./components/Dashboard";
import SettingsHub from "./components/settings/SettingsHub";
import SettingsRouter from "./components/settings/SettingsRouter";
import Clients from "./components/Clients";

function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route path="/app" element={<DashboardLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="settings/*" element={<SettingsRouter />} />
          <Route path="clients" element={<Clients />} />

          {/* TODO: add as implemented */}
          {/* <Route path="users"          element={<Users />} /> */}
          {/* <Route path="catalogs/*"     element={<Catalogs />} /> */}
          {/* <Route path="inventory/*"    element={<Inventory />} /> */}
          {/* <Route path="software-keys"  element={<SoftwareKeys />} /> */}
          {/* <Route path="jobs"           element={<Jobs />} /> */}
          {/* <Route path="jobs/:id/assembly" element={<AssemblyWizard />} /> */}
          {/* <Route path="repairs"        element={<Repairs />} /> */}
          {/* <Route path="reports"        element={<Reports />} /> */}
          {/* <Route path="audit"          element={<AuditLog />} /> */}
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      <Toaster position="top-right" richColors />
    </>
  );
}

export default App;
