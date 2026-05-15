import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "@/components/panel/Navbar";
import Sidebar from "@/components/panel/Sidebar";
import "./PanelLayout.css";

const COLLAPSE_KEY = "waynest-sidebar-collapsed";

const PanelLayout = ({ role, title }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === "true";
    } catch {
      return false;
    }
  });

  const handleToggleSidebar = () => {
    setIsSidebarOpen((current) => !current);
  };

  const handleCloseSidebar = () => {
    setIsSidebarOpen(false);
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 900 && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isSidebarOpen]);

  return (
    <div
      className={`layout${role === "admin" ? " layout--admin" : ""}${
        role === "provider" ? " layout--provider" : ""
      }${collapsed ? " layout--sidebar-collapsed" : ""}`}
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