import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../core/providers/AuthContext";
import { useLanguage } from "../../core/providers/LanguageContext";
import { useTheme } from "../../core/providers/ThemeContext";
import { getLanguages } from "../../core/constants/language.const";
import "./Navbar.css";
import { GiHamburgerMenu } from "react-icons/gi";
import { FaMoon } from "react-icons/fa";
import { IoMdSunny } from "react-icons/io";
import { FiChevronDown } from "react-icons/fi";







const Navbar = ({ title, onToggleSidebar, isSidebarOpen }) => {
  const { t } = useTranslation();
  const { logout, user } = useAuth();
  const { language, toggleLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const languageDropdownRef = useRef(null);
  const userMenuRef = useRef(null);
  const username = user?.username ?? "User";
  const avatarLetter = username.trim().charAt(0).toUpperCase() || "U";
  const languages = getLanguages();
  const role = user?.role ?? "USER";

  const profilePath =
  role === "PROVIDER" ?
  "/provider-panel/profile" :
  role === "ADMIN" ?
  "/admin-panel" :
  "/user-panel/profile";

  const quickLinks =
  role === "USER" ?
  [
  { label: t("user.sidebar.profile", { defaultValue: "Profile" }), to: "/user-panel/profile" },
  { label: t("user.sidebar.wishlist", { defaultValue: "Wishlist" }), to: "/user-panel/wishlist" },
  { label: t("navbar.planner", { defaultValue: "Planner" }), to: "/plan" }] :

  [{ label: t("provider.sidebar.profile", { defaultValue: "Profile" }), to: profilePath }];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
      languageDropdownRef.current &&
      !languageDropdownRef.current.contains(event.target))
      {
        setIsLanguageDropdownOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };

    if (isLanguageDropdownOpen || isUserMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isLanguageDropdownOpen, isUserMenuOpen]);

  return (
    <header className="navbar">
      <div className="navbar-left">
        {onToggleSidebar &&
        <button
          className="navbar-menu"
          type="button"
          onClick={onToggleSidebar}
          aria-label={t("navbar.toggleSidebar")}
          aria-expanded={isSidebarOpen ? "true" : "false"}>
            <GiHamburgerMenu />
          </button>
        }
        <div className="navbar-title">
          {title ?? `${t("navbar.welcome")}, ${username}`}
        </div>
      </div>
      <div className="navbar-right">
        <button
          className="navbar-theme-toggle"
          type="button"
          onClick={toggleTheme}
          aria-label={theme === "light" ? t("navbar.dark") : t("navbar.light")}
          title={theme === "light" ? t("navbar.dark") : t("navbar.light")}>
          {theme === "light" ? <FaMoon /> : <IoMdSunny />}
        </button>
        <div className="navbar-language-dropdown" ref={languageDropdownRef}>
          <button
            className="navbar-language-button"
            type="button"
            onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
            aria-label="Select language">
            {language.toUpperCase()} ▼
          </button>
          {isLanguageDropdownOpen &&
          <ul className="navbar-language-menu">
              {languages.map((lang) =>
            <li
              key={lang.code}
              onClick={() => {
                toggleLanguage(lang.code);
                setIsLanguageDropdownOpen(false);
              }}
              className={language === lang.code ? "active" : ""}>
                  {lang.label}
                </li>
            )}
            </ul>
          }
        </div>
        <div className="navbar-user-menu" ref={userMenuRef}>
          <button
            className="navbar-user"
            type="button"
            onClick={() => setIsUserMenuOpen((current) => !current)}
            aria-expanded={isUserMenuOpen ? "true" : "false"}
            aria-label={t("user.sidebar.profile", { defaultValue: "Open profile menu" })}>
            <span className="navbar-avatar" aria-hidden="true">
              {avatarLetter}
            </span>
            <span className="navbar-username">{username}</span>
            <FiChevronDown />
          </button>
          {isUserMenuOpen &&
          <div className="navbar-user-dropdown">
              {quickLinks.map((link) =>
            <NavLink key={link.to} to={link.to} onClick={() => setIsUserMenuOpen(false)}>
                  {link.label}
                </NavLink>
            )}
              <button
              className="navbar-user-logout"
              type="button"
              onClick={() => void logout()}>
                {t("navbar.logout")}
              </button>
            </div>
          }
        </div>
        <button className="navbar-logout" onClick={() => void logout()} type="button">
          {t("navbar.logout")}
        </button>
      </div>
      <button
        className="navbar-mobile-menu-btn"
        type="button"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="Toggle mobile menu"
        aria-expanded={isMobileMenuOpen ? "true" : "false"}>
        <GiHamburgerMenu />
      </button>
      {isMobileMenuOpen &&
      <div className="navbar-mobile-menu">
          <div className="navbar-mobile-menu-content">
            <div className="navbar-mobile-user">
              <NavLink
              to={profilePath}
              onClick={() => setIsMobileMenuOpen(false)}>
                <span className="navbar-avatar">{avatarLetter}</span>
                <span className="navbar-username">{username}</span>
              </NavLink>
            </div>
            {quickLinks.map((link) =>
          <NavLink
            key={link.to}
            to={link.to}
            className="navbar-mobile-link"
            onClick={() => setIsMobileMenuOpen(false)}>
                {link.label}
              </NavLink>
          )}
            <button
            className="navbar-theme-toggle navbar-theme-toggle-mobile"
            type="button"
            onClick={toggleTheme}
            aria-label={
            theme === "light" ? t("navbar.dark") : t("navbar.light")
            }
            title={theme === "light" ? t("navbar.dark") : t("navbar.light")}>
              {theme === "light" ? <FaMoon /> : <IoMdSunny />}
            </button>
            <div className="navbar-mobile-language-dropdown" ref={languageDropdownRef}>
              <button
              className="navbar-language-button"
              type="button"
              onClick={() =>
              setIsLanguageDropdownOpen(!isLanguageDropdownOpen)
              }>
                {t("navbar.language")}: {language.toUpperCase()} ▼
              </button>
              {isLanguageDropdownOpen &&
            <ul className="navbar-language-menu navbar-language-menu-mobile">
                  {languages.map((lang) =>
              <li
                key={lang.code}
                onClick={() => {
                  toggleLanguage(lang.code);
                  setIsLanguageDropdownOpen(false);
                  setIsMobileMenuOpen(false);
                }}
                className={language === lang.code ? "active" : ""}>
                      {lang.label}
                    </li>
              )}
                </ul>
            }
            </div>
            <button
            className="navbar-logout navbar-logout-mobile"
            onClick={() => {
              logout();
              setIsMobileMenuOpen(false);
            }}
            type="button">
              {t("navbar.logout")}
            </button>
          </div>
        </div>
      }
    </header>);

};

export default Navbar;