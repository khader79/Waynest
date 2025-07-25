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
        <Navbar className="adminNavbar" />

        <div className="main-content">
          <AdminMenu className="adminMenu" />
          <main className="content-area">{children}</main>
        </div>
      </div>
    </OpenMenuProvider>
  );
}
