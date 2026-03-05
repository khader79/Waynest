import { Link } from "react-router-dom";
import "./SideBar..css";

type Role = "user" | "provider" | "admin";

type SidebarLink = {
  name: string;
  path: string;
};

type SidebarProps = {
  role: Role;
};

const sidebarLinks: Record<Role, SidebarLink[]> = {
  user: [
    { name: "Dashboard", path: "/user-panel" },
    { name: "Profile", path: "/user-panel/profile" },
    { name: "Bookings", path: "/user-panel/bookings" },
    { name: "Wishlist", path: "/user-panel/wishlist" },
  ],
  provider: [
    { name: "Dashboard", path: "/provider-panel" },
    { name: "Profile", path: "/provider-panel/profile" },
    { name: "My Places", path: "/provider-panel/places" },
    { name: "Bookings", path: "/provider-panel/bookings" },
  ],
  admin: [
    { name: "Dashboard", path: "/admin" },
    { name: "Users", path: "/admin/users" },
    { name: "Providers", path: "/admin/providers" },
    { name: "Places", path: "/admin/places" },
  ],
};

const Sidebar = ({ role }: SidebarProps) => {
  const links = sidebarLinks[role];

  return (
    <aside className="sidebar">
      <div className="sidebar-title">{role} Panel</div>

      <nav className="sidebar-nav">
        {links.map((link) => (
          <Link key={link.path} className="sidebar-link" to={link.path}>
            {link.name}
          </Link>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
