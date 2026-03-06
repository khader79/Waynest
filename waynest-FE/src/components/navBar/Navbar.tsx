import { NavLink } from "react-router";
import { useTranslation } from "react-i18next";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import "./Navbar.css";
import { GiHamburgerMenu } from "react-icons/gi";

type NavbarProps = {
  title?: string;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
};

const Navbar = ({ title, onToggleSidebar, isSidebarOpen }: NavbarProps) => {
  const { t } = useTranslation();
  const { logout, user } = useAuth();
  const { language, toggleLanguage } = useLanguage();
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const username = user?.username ?? "User";
  const avatarLetter = username.trim().charAt(0).toUpperCase() || "U";

  const languages = [
    { code: "en", label: t("languages.en") },
    { code: "ar", label: t("languages.ar") },
    { code: "ru", label: t("languages.ru") },
    { code: "fr", label: t("languages.fr") },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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
        <div className="navbar-title">{title ?? `${t("navbar.welcome")}, ${username}`}</div>
      </div>
      <div className="navbar-right">
        {/* Language Dropdown */}
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
          <NavLink to={`profile/${user?.username}`}>
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
    </header>
  );
};

export default Navbar;
