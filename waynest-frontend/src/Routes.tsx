import { Route, Routes } from "react-router";
import HomePage from "./Home/HomePage";
import LoginPage from "./Home/Login/LoginPage";
import AdminLogin from "./admin/adminLogin/AdminLogin";
import DashBoard from "./admin/adminPanel/DashBoard";
import UsersPage from "./admin/adminPanel/adminPages/users/UsersPage";

const RoutesComponent = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin-login" element={<AdminLogin />} />
      <Route path="/admin-panel" element={<DashBoard />} />
      <Route path="/admin-panel/users" element={<UsersPage />} />
    </Routes>
  );
};

export default RoutesComponent;
