import { Link, useLocation } from "react-router-dom";
import { publicNavbarLinks } from "../../../../constants/navbarPublic.links";
import "./NavbarPublic.css";
import { useTheme } from "../../../../context/ThemeContext";
import { useAuth } from "../../../../context/AuthContext";
import { useLanguage } from "../../../../context/LanguageContext";
import logo from "../../../../../public/images/waynest icon.svg";
import { useTranslation } from "react-i18next";

export const NavbarPublic = () => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const location = useLocation();
  const { language, toggleLanguage } = useLanguage();
  const { t } = useTranslation();

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

  const languages = [
    { code: "en", label: t("languages.en") },
    { code: "ar", label: t("languages.ar") },
    { code: "ru", label: t("languages.ru") },
    { code: "fr", label: t("languages.fr") },
  ];

  return (
    <div className="public-navbar-container">
      <nav className="public-navbar">
        {/* Logo */}
        <Link to="/" className="public-navbar-left">
          <img
            className="public-navbar-left__logo"
            src={logo}
            alt="Waynest logo"
          />
          <div className="public-navbar-left__text">Waynest</div>
        </Link>

        {/* Center Links */}
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

        {/* Right Side */}
        <div className="public-navbar-right">
          <div className="public-navbar-right__auth">{renderAuthButtons()}</div>

          <div className="public-navbar-right__settings">
            {/* Theme Toggle */}
            <button onClick={toggleTheme}>
              {theme === "light" ? "Dark" : "Light"}
            </button>

            {/* Language Dropdown */}
            <div className="language-dropdown">
              <button className="language-dropdown__button">
                {language.toUpperCase()} ▼
              </button>
              <ul className="language-dropdown__menu">
                {languages.map((lang) => (
                  <li
                    key={lang.code}
                    onClick={() => toggleLanguage(lang.code)}
                    className={language === lang.code ? "active" : ""}>
                    {lang.label}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
};
