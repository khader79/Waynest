import { Link, useLocation } from "react-router-dom";
import { publicNavbarLinks } from "../../../../constants/navbarPublic.links";
import "./NavbarPublic.css";
import { useTheme } from "../../../../context/ThemeContext";
import { useAuth } from "../../../../context/AuthContext";

export const NavbarPublic = () => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const location = useLocation();

  const renderAuthButtons = () => {
    if (user?.role === "USER") {
      return (
        <Link to="/user-panel" className="public-navbar-btn dashboard-btn">
          User Panel
        </Link>
      );
    }

    if (user?.role === "ADMIN") {
      return (
        <Link to="/admin-panel" className="public-navbar-btn dashboard-btn">
          Admin Panel
        </Link>
      );
    }

    if (location.pathname === "/login") {
      return (
        <Link to="/register" className="public-navbar-btn register-btn">
          Sign Up
        </Link>
      );
    }

    return (
      <>
        <Link to="/login" className="public-navbar-btn login-btn">
          Login
        </Link>

        <Link to="/register" className="public-navbar-btn register-btn">
          Sign Up
        </Link>
      </>
    );
  };

  return (
    <div className="public-navbar-container">
      <nav className="public-navbar">
        <Link to="/" className="public-navbar-left">
          <div className="public-navbar-left__logo">🌍</div>
          <div className="public-navbar-left__text">Waynest</div>
        </Link>

        <div className="public-navbar-center">
          {publicNavbarLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className="public-navbar-center__link">
              {link.label}
            </Link>
          ))}
        </div>

        <div className="public-navbar-right">
          <div className="public-navbar-right__auth">{renderAuthButtons()}</div>

          <div className="public-navbar-right__settings">
            <button onClick={toggleTheme}>
              {theme === "light" ? "Dark" : "Light"}
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
};
