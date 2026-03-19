import { NavLink } from "react-router";
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

type NavbarProps = {
  title?: string;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
};

const Navbar = ({ title, onToggleSidebar, isSidebarOpen }: NavbarProps) => {
  const { t } = useTranslation();
  const { logout, user } = useAuth();
  const { language, toggleLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const username = user?.username ?? "User";
  const avatarLetter = username.trim().charAt(0).toUpperCase() || "U";
  const languages = getLanguages();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsLanguageDropdownOpen(false);
      }
    };

    if (isLanguageDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isLanguageDropdownOpen]);

  return (
    <header className="navbar">
      <div className="navbar-left">
        {onToggleSidebar && (
          <button
            className="navbar-menu"
            type="button"
            onClick={onToggleSidebar}
            aria-label={t("navbar.toggleSidebar")}
            aria-expanded={isSidebarOpen ? "true" : "false"}>
            <GiHamburgerMenu />
          </button>
        )}
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
        <div className="navbar-language-dropdown" ref={dropdownRef}>
          <button
            className="navbar-language-button"
            type="button"
            onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
            aria-label="Select language">
            {language.toUpperCase()} ▼
          </button>
          {isLanguageDropdownOpen && (
            <ul className="navbar-language-menu">
              {languages.map((lang) => (
                <li
                  key={lang.code}
                  onClick={() => {
                    toggleLanguage(lang.code);
                    setIsLanguageDropdownOpen(false);
                  }}
                  className={language === lang.code ? "active" : ""}>
                  {lang.label}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="navbar-user">
          <NavLink to={`/user-panel/profile/${user?.username}`}>
            <span className="navbar-avatar" aria-hidden="true">
              {avatarLetter}
            </span>
            <span className="navbar-username">{username}</span>
          </NavLink>
        </div>
        <button className="navbar-logout" onClick={logout} type="button">
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
      {isMobileMenuOpen && (
        <div className="navbar-mobile-menu">
          <div className="navbar-mobile-menu-content">
            <div className="navbar-mobile-user">
              <NavLink
                to={`/user-panel/profile/${user?.username}`}
                onClick={() => setIsMobileMenuOpen(false)}>
                <span className="navbar-avatar">{avatarLetter}</span>
                <span className="navbar-username">{username}</span>
              </NavLink>
            </div>
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
            <div className="navbar-mobile-language-dropdown" ref={dropdownRef}>
              <button
                className="navbar-language-button"
                type="button"
                onClick={() =>
                  setIsLanguageDropdownOpen(!isLanguageDropdownOpen)
                }>
                {t("navbar.language")}: {language.toUpperCase()} ▼
              </button>
              {isLanguageDropdownOpen && (
                <ul className="navbar-language-menu navbar-language-menu-mobile">
                  {languages.map((lang) => (
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
                  ))}
                </ul>
              )}
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
      )}
    </header>
  );
};

export default Navbar;

