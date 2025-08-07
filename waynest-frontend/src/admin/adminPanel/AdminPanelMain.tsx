import OpenMenuProvider from "../../Context/OpenMenu"; // عدّل المسار حسب مكان الملف
import AdminMenu from "./adminMenu/AdminMenu";
import Navbar from "./components/navbar/Navbar";
import "./admin.css";
import { Navigate, Outlet } from "react-router";
import { useChangeThemeContext } from "../../Context/ChangeTheme";

const AdminPanelMain = () => {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/admin-login" replace />;
  }

  //@ts-ignore
  const { theme } = useChangeThemeContext();
  return (
    <OpenMenuProvider>
      <div
        className={`admin-container ${
          theme === "light" ? "light-theme" : "dark-theme"
        }`}
      >
        <AdminMenu className="adminMenu" />
        <div className="main-content">
          <Navbar className="adminNavbar" />
          <main className="content-area">
            <Outlet />
          </main>
        </div>
      </div>
    </OpenMenuProvider>
  );
};

export default AdminPanelMain;
