import { Outlet } from "react-router-dom";
import { MainLayout } from "@/components/social";
import { NavbarPublic } from "@/components/public/navbar/NavbarPublic";
import GuestFooter from "@/components/public/footer/GuestFooter";
import "./GuestLayout.css";

const GuestLayout = ({
  children,
  showRail = true,
  showFooter = true,
  fullWidth = false,
}) => {
  const content = children ?? <Outlet />;

  return (
    <div className={`guest-layout${showRail ? " guest-layout--rail" : ""}`}>
      <NavbarPublic />
      <main className="guest-layout__content">
        {showRail ? (
          <MainLayout variant="guest-discovery">{content}</MainLayout>
        ) : (
          <div
            className={`guest-layout__frame${
              fullWidth ? " guest-layout__frame--fullwidth" : ""
            }`}>
            {content}
          </div>
        )}
      </main>
      {showFooter ? <GuestFooter /> : null}
    </div>
  );
};

export default GuestLayout;
