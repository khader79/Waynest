import { Outlet } from "react-router-dom";
import "./PublicLayout.css";
import { NavbarPublic } from "./components/navbar/NavbarPublic";
import { useAuth } from "../../context/AuthContext";

const PublicLayout = () => {
  return (
    <div className="public-continer">
      <NavbarPublic />
      <main className="public-content">
        <Outlet />
      </main>
    </div>
  );
};

export default PublicLayout;
