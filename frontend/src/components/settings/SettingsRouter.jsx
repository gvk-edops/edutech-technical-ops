import { Routes, Route, Navigate } from 'react-router-dom';
import SettingsHub from './SettingsHub';
import AccountSettings from './AccountSettings';
import PreferencesSettings from './PreferencesSettings';
import SystemConfiguration from './SystemConfiguration';

export default function SettingsRouter() {
  return (
    <Routes>
      <Route index element={<SettingsHub />} />
      <Route path="account" element={<AccountSettings />} />
      <Route path="preferences" element={<PreferencesSettings />} />
      <Route path="system-configuration" element={<SystemConfiguration />} />
      <Route path="*" element={<Navigate to="/app/settings" replace />} />
    </Routes>
  );
}
