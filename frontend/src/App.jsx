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
import RoleRoute from "./components/RoleRoute";

const operationsRoles = ["admin", "manager"];
const assemblyRoles = ["admin", "manager", "technician"];

function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/audit" element={<AuditPortal />} />
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route path="/app" element={<DashboardLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route
            path="dashboard"
            element={
              <RoleRoute allowedRoles={operationsRoles}>
                <Dashboard />
              </RoleRoute>
            }
          />
          <Route path="settings/*" element={<SettingsRouter />} />
          <Route
            path="clients"
            element={
              <RoleRoute allowedRoles={operationsRoles}>
                <Clients />
              </RoleRoute>
            }
          />
          <Route
            path="jobs"
            element={
              <RoleRoute allowedRoles={operationsRoles}>
                <Jobs />
              </RoleRoute>
            }
          />
          <Route
            path="inventory"
            element={
              <RoleRoute allowedRoles={operationsRoles}>
                <Inventory />
              </RoleRoute>
            }
          />
          <Route
            path="assembly"
            element={
              <RoleRoute allowedRoles={assemblyRoles}>
                <Assembly />
              </RoleRoute>
            }
          />
          <Route
            path="delivery"
            element={
              <RoleRoute allowedRoles={operationsRoles}>
                <Delivery />
              </RoleRoute>
            }
          />
          <Route
            path="software-keys"
            element={
              <RoleRoute allowedRoles={operationsRoles}>
                <SoftwareKeys />
              </RoleRoute>
            }
          />
          <Route
            path="afterservice"
            element={
              <RoleRoute allowedRoles={operationsRoles}>
                <AfterService />
              </RoleRoute>
            }
          />
          <Route
            path="users"
            element={
              <RoleRoute allowedRoles={["admin"]}>
                <Users />
              </RoleRoute>
            }
          />
          <Route
            path="reports"
            element={
              <RoleRoute allowedRoles={operationsRoles}>
                <Reports />
              </RoleRoute>
            }
          />
          <Route
            path="lending"
            element={
              <RoleRoute allowedRoles={operationsRoles}>
                <Lending />
              </RoleRoute>
            }
          />

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
