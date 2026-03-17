import { Link, useLocation } from "react-router-dom";
import "./NavbarPublic.css";
import { useTheme } from "../../../../context/ThemeContext";
import { useAuth } from "../../../../context/AuthContext";
import { useLanguage } from "../../../../context/LanguageContext";
import { useTranslation } from "react-i18next";
import { useState, useEffect, useRef } from "react";
import { GiHamburgerMenu } from "react-icons/gi";
import { IoClose } from "react-icons/io5";

const logo = "/images/waynest icon.svg";

export const NavbarPublic = () => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const location = useLocation();
  const { language, toggleLanguage } = useLanguage();
  const { t } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const renderAuthButtons = () => {
    if (user?.role === "USER") {
      return (
        <Link to="/user-panel" className="public-navbar-btn dashboard-btn">
          {t("navbar.userPanel")}
        </Link>
      );
    }
    if (user?.role === "ADMIN") {
      return (
        <Link to="/admin-panel" className="public-navbar-btn dashboard-btn">
          {t("navbar.adminPanel")}
        </Link>
      );
    }
    if (location.pathname === "/login") {
      return (
        <Link to="/register" className="public-navbar-btn register-btn">
          {t("navbar.signUp")}
        </Link>
      );
    }
    return (
      <>
        <Link to="/login" className="public-navbar-btn login-btn">
          {t("navbar.login")}
        </Link>
        <Link to="/register" className="public-navbar-btn register-btn">
          {t("navbar.signUp")}
        </Link>
      </>
    );
  };

  const languages = [
    { code: "en", label: t("languages.en") },
    { code: "ar", label: t("languages.ar") },
    { code: "ru", label: t("languages.ru") },
    { code: "fr", label: t("languages.fr") },
    { code: "tr", label: t("languages.tr") },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsLanguageDropdownOpen(false);
      }
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node)
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isLanguageDropdownOpen || isMobileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isLanguageDropdownOpen, isMobileMenuOpen]);

  return (
    <div className="public-navbar-container" ref={mobileMenuRef}>
      <nav className="public-navbar">
        {/* Logo */}
        <Link
          to="/"
          className="public-navbar-left"
          onClick={() => setIsMobileMenuOpen(false)}>
          <img
            className="public-navbar-left__logo"
            src={logo}
            alt="Waynest logo"
          />
          <div className="public-navbar-left__text">Waynest</div>
        </Link>

        {/* Center Links */}
        <div className="public-navbar-center">
          <Link
            to="/"
            className="public-navbar-center__link"
            onClick={() => setIsMobileMenuOpen(false)}>
            {t("navbar.home")}
          </Link>
          <Link
            to="/explore"
            className="public-navbar-center__link"
            onClick={() => setIsMobileMenuOpen(false)}>
            {t("navbar.explore")}
          </Link>
          <Link
            to="/plan"
            className="public-navbar-center__link"
            onClick={() => setIsMobileMenuOpen(false)}>
            {t("navbar.planner")}
          </Link>
          <Link
            to="/about"
            className="public-navbar-center__link"
            onClick={() => setIsMobileMenuOpen(false)}>
            {t("navbar.about")}
          </Link>
          <Link
            to="/contact"
            className="public-navbar-center__link"
            onClick={() => setIsMobileMenuOpen(false)}>
            {t("navbar.contact")}
          </Link>
        </div>

        {/* Right Side */}
        <div className="public-navbar-right">
          <div className="public-navbar-right__auth">{renderAuthButtons()}</div>

          <div className="public-navbar-right__settings">
            {/* Theme Toggle */}
            <button onClick={toggleTheme}>
              {theme === "light" ? t("navbar.dark") : t("navbar.light")}
            </button>

            {/* Language Dropdown */}
            <div className="language-dropdown" ref={dropdownRef}>
              <button
                className="language-dropdown__button"
                onClick={() =>
                  setIsLanguageDropdownOpen(!isLanguageDropdownOpen)
                }>
                {language.toUpperCase()} ▼
              </button>
              {isLanguageDropdownOpen && (
                <ul className="language-dropdown__menu">
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
          </div>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="public-navbar-mobile-menu-btn"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle mobile menu"
          aria-expanded={isMobileMenuOpen ? "true" : "false"}>
          {isMobileMenuOpen ? <IoClose /> : <GiHamburgerMenu />}
        </button>
      </nav>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="public-navbar-mobile-menu">
          <div className="public-navbar-mobile-menu-content">
            {/* Mobile Links */}
            <div className="public-navbar-mobile-center">
              <Link
                to="/"
                className="public-navbar-mobile-link"
                onClick={() => setIsMobileMenuOpen(false)}>
                {t("navbar.home")}
              </Link>
              <Link
                to="/explore"
                className="public-navbar-mobile-link"
                onClick={() => setIsMobileMenuOpen(false)}>
                {t("navbar.explore")}
              </Link>
              <Link
                to="/plan"
                className="public-navbar-mobile-link"
                onClick={() => setIsMobileMenuOpen(false)}>
                {t("navbar.planner")}
              </Link>
              <Link
                to="/about"
                className="public-navbar-mobile-link"
                onClick={() => setIsMobileMenuOpen(false)}>
                {t("navbar.about")}
              </Link>
              <Link
                to="/contact"
                className="public-navbar-mobile-link"
                onClick={() => setIsMobileMenuOpen(false)}>
                {t("navbar.contact")}
              </Link>
            </div>

            {/* Mobile Auth Buttons */}
            <div className="public-navbar-mobile-auth">
              {renderAuthButtons()}
            </div>

            {/* Mobile Settings */}
            <div className="public-navbar-mobile-settings">
              <button
                className="public-navbar-mobile-theme-btn"
                onClick={toggleTheme}>
                {theme === "light" ? t("navbar.dark") : t("navbar.light")}
              </button>

              <div
                className="language-dropdown language-dropdown-mobile"
                ref={dropdownRef}>
                <button
                  className="language-dropdown__button"
                  onClick={() =>
                    setIsLanguageDropdownOpen(!isLanguageDropdownOpen)
                  }>
                  {t("navbar.language")}: {language.toUpperCase()} ▼
                </button>
                {isLanguageDropdownOpen && (
                  <ul className="language-dropdown__menu language-dropdown__menu-mobile">
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
