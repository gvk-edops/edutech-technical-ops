import { Routes, Route, Navigate } from "react-router-dom";
import SettingsHub from "./SettingsHub";
import AccountSettings from "./AccountSettings";
import PreferencesSettings from "./PreferencesSettings";
import SystemConfiguration from "./SystemConfiguration";
import RoleRoute from "../RoleRoute";

export default function SettingsRouter() {
  return (
    <Routes>
      <Route
        index
        element={
          <RoleRoute allowedRoles={["admin", "manager"]}>
            <SettingsHub />
          </RoleRoute>
        }
      />
      <Route
        path="account"
        element={
          <RoleRoute allowedRoles={["admin"]}>
            <AccountSettings />
          </RoleRoute>
        }
      />
      <Route
        path="preferences"
        element={
          <RoleRoute allowedRoles={["admin", "manager"]}>
            <PreferencesSettings />
          </RoleRoute>
        }
      />
      <Route
        path="system-configuration"
        element={
          <RoleRoute allowedRoles={["admin", "manager"]}>
            <SystemConfiguration />
          </RoleRoute>
        }
      />
      <Route path="*" element={<Navigate to="/app/settings" replace />} />
    </Routes>
  );
}
