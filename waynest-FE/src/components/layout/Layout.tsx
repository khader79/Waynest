import { Outlet } from "react-router-dom";
import "./Layout.css";
import Navbar from "../navBar/Navbar";
import Sidebar from "../sideBar/SideBar";

type LayoutProps = {
  role: "user" | "provider" | "admin";
};

const Layout = ({ role }: LayoutProps) => {
  return (
    <div className="layout">
      <Sidebar role={role} />
      <div className="layout-main">
        <Navbar />
        <div className="layout-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Layout;
