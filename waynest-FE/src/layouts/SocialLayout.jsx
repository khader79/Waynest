import { Outlet } from "react-router-dom";
import { MainLayout } from "@/components/social";
import { NavbarPublic } from "@/components/public/navbar/NavbarPublic";
import "./SocialLayout.css";
import "./socialDesignV2.css";

const SocialLayout = ({ children, variant = "signed-in-social" }) => {
  return (
    <div className={`social-layout social-layout--v2 social-layout--${variant}`}>
      <NavbarPublic />
      <main className="social-layout__content">
        <MainLayout variant={variant}>{children ?? <Outlet />}</MainLayout>
      </main>
    </div>
  );
};

export default SocialLayout;
