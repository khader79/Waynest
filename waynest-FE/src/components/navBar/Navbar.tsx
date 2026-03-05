import { NavLink } from "react-router";
import { useAuth } from "../../context/AuthContext";
import "./Navbar.css";
import { GiHamburgerMenu } from "react-icons/gi";

type NavbarProps = {
  title?: string;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
};

const Navbar = ({ title, onToggleSidebar, isSidebarOpen }: NavbarProps) => {
  const { logout, user } = useAuth();
  const username = user?.username ?? "User";
  const avatarLetter = username.trim().charAt(0).toUpperCase() || "U";

  return (
    <header className="navbar">
      <div className="navbar-left">
        {onToggleSidebar && (
          <button
            className="navbar-menu"
            type="button"
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar"
            aria-expanded={isSidebarOpen ? "true" : "false"}>
            <GiHamburgerMenu />
          </button>
        )}
        <div className="navbar-title">{title ?? `Welcome, ${username}`}</div>
      </div>
      <div className="navbar-right">
        <div className="navbar-user">
          <NavLink to={`profile/${user?.username}`}>
            <span className="navbar-avatar" aria-hidden="true">
              {avatarLetter}
            </span>
            <span className="navbar-username">{username}</span>
          </NavLink>
        </div>
        <button className="navbar-logout" onClick={logout} type="button">
          Logout
        </button>
      </div>
    </header>
  );
};

export default Navbar;
