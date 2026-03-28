import { Outlet } from "react-router-dom";
import { NavbarPublic } from "@/components/public/navbar/NavbarPublic";
import GuestFooter from "@/components/public/footer/GuestFooter";
import "./AuthLayout.css";

const AuthLayout = ({ children }) => {
  return (
    <div className="auth-layout">
      <NavbarPublic />
      <main className="auth-layout__content">{children ?? <Outlet />}</main>
      <GuestFooter />
    </div>
  );
};

export default AuthLayout;
