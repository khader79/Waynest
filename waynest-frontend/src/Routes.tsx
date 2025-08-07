import { Route, Routes } from "react-router";
import HomePage from "./Home/HomePage";
import LoginPage from "./Home/Login/LoginPage";
import AdminLogin from "./admin/adminLogin/AdminLogin";
import DashBoard from "./admin/adminPanel/DashBoard";
import UsersPage from "./admin/adminPanel/adminPages/users/UsersPage";
import SettingsPage from "./admin/adminPanel/adminPages/settings/SettingsPage";
import Hotels from "./admin/adminPanel/adminPages/hotels/Hotels";
import AdminPanelMain from "./admin/adminPanel/AdminPanelMain";
import NotFound from "./admin/adminPanel/components/notFound/NotFound";

const RoutesComponent = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin-login" element={<AdminLogin />} />

      <Route path="/admin-panel" element={<AdminPanelMain />}>
        <Route index element={<DashBoard />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="hotels" element={<Hotels />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};

export default RoutesComponent;
