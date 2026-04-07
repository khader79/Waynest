import { useState } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "@/components/panel/Navbar";
import Sidebar from "@/components/panel/Sidebar";
import "./PanelLayout.css";

const PanelLayout = ({ role, title }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleToggleSidebar = () => {
    setIsSidebarOpen((current) => !current);
  };

  const handleCloseSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div
      className={`layout${role === "admin" ? " layout--admin" : ""}${
        role === "provider" ? " layout--provider" : ""
      }`}
    >
      <Sidebar
        role={role}
        isOpen={isSidebarOpen}
        onClose={handleCloseSidebar}
      />
      <div
        className={`sidebar-overlay ${isSidebarOpen ? "is-visible" : ""}`}
        onClick={handleCloseSidebar}
        aria-hidden={!isSidebarOpen}
      />
      <div className="layout-main">
        <Navbar
          role={role}
          title={title}
          onToggleSidebar={handleToggleSidebar}
          isSidebarOpen={isSidebarOpen}
        />
        <div className="layout-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default PanelLayout;
