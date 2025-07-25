import OpenMenuProvider from "@/app/Context/openMenu";
import AdminMenu from "./adminMenu/AdminMenu";
import Navbar from "./components/navbar/Navbar";
import "./admin.css";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OpenMenuProvider>
      <div className="admin-container">
        <AdminMenu className="adminMenu" />
        <div className="main-content">
          <Navbar className="adminNavbar" />
          <main className="content-area">{children}</main>
        </div>
      </div>
    </OpenMenuProvider>
  );
}
