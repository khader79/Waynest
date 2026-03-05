import { NavLink } from "react-router-dom";
import "./SideBar..css";

type Role = "user" | "provider" | "admin";

type SidebarLink = {
  name: string;
  path: string;
};

type SidebarProps = {
  role: Role;
  isOpen: boolean;
  onClose: () => void;
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

const Sidebar = ({ role, isOpen, onClose }: SidebarProps) => {
  const links = sidebarLinks[role];
  const roleLabel = `${role.charAt(0).toUpperCase()}${role.slice(1)}`;

  return (
    <aside className={`sidebar ${isOpen ? "is-open" : ""}`}>
      <div className="sidebar-header">
        <div className="sidebar-title">{roleLabel} Panel</div>
        <button
          type="button"
          className="sidebar-close"
          onClick={onClose}
          aria-label="Close sidebar"
        >
          ✕
        </button>
      </div>

      <nav className="sidebar-nav">
        {links.map((link) => (
          <NavLink
            key={link.path}
            className={({ isActive }) =>
              `sidebar-link${isActive ? " active" : ""}`
            }
            to={link.path}
            onClick={onClose}
          >
            {link.name}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
