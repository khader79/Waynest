import { Outlet } from "react-router-dom";
import "./PublicLayout.css";
import { NavbarPublic } from "./components/navbar/NavbarPublic";
import MainLayout from "./layout/facebook/Layout/MainLayout";

const PublicLayout = () => {
  return (
    <div className="public-continer">
      <NavbarPublic />
      <main className="public-content">
        <MainLayout>
          <Outlet />
        </MainLayout>
      </main>
    </div>
  );
};

export default PublicLayout;
