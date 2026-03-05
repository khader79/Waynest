import { NavLink } from "react-router-dom";
import "./SideBar..css";
import panelsLinks, { type Role } from "../../constants/panels.links";
import { useAuth } from "../../context/AuthContext";
import { IoMdClose } from "react-icons/io";

type SidebarProps = {
  role: Role;
  isOpen: boolean;
  onClose: () => void;
};

const Sidebar = ({ role, isOpen, onClose }: SidebarProps) => {
  const { user } = useAuth();

  const links = panelsLinks[role].map((link) => {
    if (link.name === "Profile" && user?.username) {
      return { ...link, path: `/user-panel/profile/${user.username}` };
    }
    return link;
  });
  const roleLabel = `${role.charAt(0).toUpperCase()}${role.slice(1)}`;

  return (
    <aside className={`sidebar ${isOpen ? "is-open" : ""}`}>
      <div className="sidebar-header">
        <div className="sidebar-title">{roleLabel} Panel</div>
        <button
          type="button"
          className="sidebar-close"
          onClick={onClose}
          aria-label="Close sidebar">
          <IoMdClose />
        </button>
      </div>

      <nav className="sidebar-nav">
        {links.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            end
            className={({ isActive }) =>
              `sidebar-link${isActive ? " active" : ""}`
            }
            onClick={onClose}>
            {link.name}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
