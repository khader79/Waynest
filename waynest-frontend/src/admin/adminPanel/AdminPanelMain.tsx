import OpenMenuProvider from "../../Context/OpenMenu"; // عدّل المسار حسب مكان الملف
import AdminMenu from "./adminMenu/AdminMenu";
import Navbar from "./components/navbar/Navbar";
import "./admin.css";
import { Navigate } from "react-router";

const AdminPanelMain = ({ children }: any) => {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/admin-login" replace />;
  }
  const dark = localStorage.getItem("dark") === "true";
  return (
    <OpenMenuProvider>
      <div className={`admin-container ${dark ? "dark-theme" : "light-theme"}`}>
        <AdminMenu className="adminMenu" />
        <div className="main-content">
          <Navbar className="adminNavbar" />
          <main className="content-area">{children}</main>
        </div>
      </div>
    </OpenMenuProvider>
  );
};

export default AdminPanelMain;
