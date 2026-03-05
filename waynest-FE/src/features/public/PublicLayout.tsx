import { Outlet } from "react-router-dom";
import "./PublicLayout.css";
import { NavbarPublic } from "./components/navbar/NavbarPublic";

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
