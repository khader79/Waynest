import { Link } from "react-router-dom";
import { publicNavbarLinks } from "../../../../constants/navbarPublic.links";
import "./NavbarPublic.css";
import { useTheme } from "../../../../context/ThemeContext";
import { useAuth } from "../../../../context/AuthContext";

export const NavbarPublic = () => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

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
          <div className="navbar-right__auth">
            {user ? (
              <Link to="/user-panel" className="navbar-btn dashboard-btn">
                User Panel
              </Link>
            ) : (
              <>
                <Link to="/login" className="navbar-btn login-btn">
                  Login
                </Link>

                <Link to="/register" className="navbar-btn register-btn">
                  Sign Up
                </Link>
              </>
            )}
          </div>
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
