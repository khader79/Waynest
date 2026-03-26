import { useState } from "react";
import { Outlet } from "react-router-dom";
import "./Layout.css";
import Navbar from "../navBar/Navbar";
import Sidebar from "../sideBar/SideBar";





const Layout = ({ role }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleToggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const handleCloseSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className={`layout${role === "admin" ? " layout--admin" : ""}`}>
      <Sidebar role={role} isOpen={isSidebarOpen} onClose={handleCloseSidebar} />
      <div
        className={`sidebar-overlay ${isSidebarOpen ? "is-visible" : ""}`}
        onClick={handleCloseSidebar}
        aria-hidden={!isSidebarOpen} />
      
      <div className="layout-main">
        <Navbar
          onToggleSidebar={handleToggleSidebar}
          isSidebarOpen={isSidebarOpen} />
        
        <div className="layout-content">
          <Outlet />
        </div>
      </div>
    </div>);

};

export default Layout;