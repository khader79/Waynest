import { Link } from "react-router-dom";
import { publicNavbarLinks } from "../../../../constants/navbarPublic.links";
import "./NavbarPublic.css";
import { useTheme } from "../../../../context/ThemeContext";
import { useAuth } from "../../../../context/AuthContext";

export const NavbarPublic = () => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  const navBarRoute = () => {
    if (user?.role === "USER") {
      return (
        <Link to="/user-panel" className="navbar-btn dashboard-btn">
          User Panel
        </Link>
      );
    }

    if (user?.role === "ADMIN") {
      return (
        <Link to="/admin-panel" className="navbar-btn dashboard-btn">
          Admin Panel
        </Link>
      );
    } else {
      return (
        <>
          <Link to="/login" className="navbar-btn login-btn">
            Login
          </Link>

          <Link to="/register" className="navbar-btn register-btn">
            Sign Up
          </Link>
        </>
      );
    }
  };

  return (
    <div className="navbar-continer">
      <nav className="navbar">
        <Link to="/" className="navbar-left">
          <div className="navbar-left__logo">🌍</div>
          <div className="navbar-left__text">Waynest</div>
        </Link>

        <div className="navbar-center">
          {publicNavbarLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className="navbar-center__link">
              {link.label}
            </Link>
          ))}
        </div>

        <div className="navbar-right">
          <div className="navbar-right__auth">{navBarRoute()}</div>
          <div className="navbar-right__settings">
            <button onClick={toggleTheme}>
              {theme == "light" ? "dark" : "light"}
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
};
