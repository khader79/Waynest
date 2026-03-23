import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { GiHamburgerMenu } from "react-icons/gi";
import { IoClose, IoLanguage } from "react-icons/io5";
import { FaMoon } from "react-icons/fa";
import { IoMdSunny } from "react-icons/io";
import { FiChevronDown } from "react-icons/fi";
import { useTheme } from "@/core/providers/ThemeContext";
import { useAuth } from "@/core/providers/AuthContext";
import { useLanguage } from "@/core/providers/LanguageContext";
import { getLanguages } from "@/core/constants/language.const";
import { useTranslation } from "react-i18next";
import "./NavbarPublic.css";

const logo = "/images/waynest icon.svg";

const navItems = [
  { key: "home", labelKey: "navbar.home", to: "/" },
  { key: "explore", labelKey: "navbar.explore", to: "/explore" },
  { key: "planner", labelKey: "navbar.planner", to: "/plan" },
  { key: "about", labelKey: "navbar.about", to: "/about" },
  { key: "contact", labelKey: "navbar.contact", to: "/contact" },
];

const joinClassNames = (...classNames: Array<string | false | undefined>) =>
  classNames.filter(Boolean).join(" ");

export const NavbarPublic = () => {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { language, toggleLanguage } = useLanguage();
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const languageMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const languages = getLanguages();
  const username = user?.username ?? "User";
  const avatarLetter = username.trim().charAt(0).toUpperCase() || "U";

  const closeMenus = () => {
    setIsMobileMenuOpen(false);
    setIsLanguageMenuOpen(false);
    setIsUserMenuOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        isLanguageMenuOpen &&
        languageMenuRef.current &&
        !languageMenuRef.current.contains(target)
      ) {
        setIsLanguageMenuOpen(false);
      }

      if (isUserMenuOpen && userMenuRef.current && !userMenuRef.current.contains(target)) {
        setIsUserMenuOpen(false);
      }

      if (
        isMobileMenuOpen &&
        containerRef.current &&
        !containerRef.current.contains(target)
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isLanguageMenuOpen, isMobileMenuOpen, isUserMenuOpen]);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1000) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const renderAuthButtons = (isMobile = false) => {
    const baseClass = "public-navbar-btn";
    const authLinkClass = joinClassNames("public-navbar-auth-link", isMobile && "is-mobile");

    if (user?.role === "USER") {
      return (
        isMobile ? (
          <>
            <Link to="/profile" onClick={closeMenus} className={authLinkClass}>
              {t("user.sidebar.profile", { defaultValue: "Profile" })}
            </Link>
            <Link to="/wishlist" onClick={closeMenus} className={authLinkClass}>
              {t("user.sidebar.wishlist", { defaultValue: "Wishlist" })}
            </Link>
            <Link to="/plan" onClick={closeMenus} className={authLinkClass}>
              {t("navbar.planner", { defaultValue: "Planner" })}
            </Link>
            <Link to="/bookings" onClick={closeMenus} className={authLinkClass}>
              {t("user.sidebar.bookings", { defaultValue: "Bookings" })}
            </Link>
            <Link to="/saved-plans" onClick={closeMenus} className={authLinkClass}>
              {t("tripPlanner.savedPlans", { defaultValue: "Saved Plans" })}
            </Link>
            <button
              type="button"
              onClick={() => {
                void logout();
                closeMenus();
              }}
              className={joinClassNames(baseClass, "logout-btn", isMobile && "is-mobile")}>
              {t("navbar.logout")}
            </button>
          </>
        ) : (
          <div className="public-navbar-user-menu" ref={userMenuRef}>
            <button
              type="button"
              className="public-navbar-user-trigger"
              onClick={() => setIsUserMenuOpen((current) => !current)}
              aria-expanded={isUserMenuOpen}
              aria-haspopup="menu">
              <span className="public-navbar-user-avatar">{avatarLetter}</span>
              <span className="public-navbar-user-name">{username}</span>
              <FiChevronDown />
            </button>
            {isUserMenuOpen ? (
              <div className="public-navbar-user-dropdown" role="menu">
                <Link to="/profile" onClick={closeMenus} className="public-navbar-user-link">
                  {t("user.sidebar.profile", { defaultValue: "Profile" })}
                </Link>
                <Link to="/wishlist" onClick={closeMenus} className="public-navbar-user-link">
                  {t("user.sidebar.wishlist", { defaultValue: "Wishlist" })}
                </Link>
                <Link to="/bookings" onClick={closeMenus} className="public-navbar-user-link">
                  {t("user.sidebar.bookings", { defaultValue: "Bookings" })}
                </Link>
                <Link to="/saved-plans" onClick={closeMenus} className="public-navbar-user-link">
                  {t("tripPlanner.savedPlans", { defaultValue: "Saved Plans" })}
                </Link>
                <Link to="/plan" onClick={closeMenus} className="public-navbar-user-link">
                  {t("navbar.planner", { defaultValue: "Planner" })}
                </Link>
                <button
                  type="button"
                  className="public-navbar-user-link public-navbar-user-logout"
                  onClick={() => {
                    void logout();
                    closeMenus();
                  }}>
                  {t("navbar.logout")}
                </button>
              </div>
            ) : null}
          </div>
        )
      );
    }

    if (user?.role === "ADMIN") {
      return (
        <Link
          to="/admin-panel"
          onClick={closeMenus}
          className={joinClassNames(baseClass, "dashboard-btn", isMobile && "is-mobile")}>
          {t("navbar.adminPanel")}
        </Link>
      );
    }

    if (location.pathname === "/login") {
      return (
        <Link
          to="/register"
          onClick={closeMenus}
          className={joinClassNames(baseClass, "register-btn", isMobile && "is-mobile")}>
          {t("navbar.signUp")}
        </Link>
      );
    }

    return (
      <>
        <Link
          to="/login"
          onClick={closeMenus}
          className={joinClassNames(baseClass, "login-btn", isMobile && "is-mobile")}>
          {t("navbar.login")}
        </Link>
        <Link
          to="/register"
          onClick={closeMenus}
          className={joinClassNames(baseClass, "register-btn", isMobile && "is-mobile")}>
          {t("navbar.signUp")}
        </Link>
      </>
    );
  };

  return (
    <div className="public-navbar-container">
      <div className="public-navbar-shell" ref={containerRef}>
        <nav className="public-navbar" aria-label="Public navigation">
          <Link to="/" className="public-navbar-left" onClick={closeMenus}>
            <img className="public-navbar-left__logo" src={logo} alt="Waynest logo" />
            <span className="public-navbar-left__text">Waynest</span>
          </Link>

          <div className="public-navbar-center">
            {navItems.map((item) => (
              <NavLink
                key={item.key}
                to={item.to}
                end={item.to === "/"}
                onClick={closeMenus}
                className={({ isActive }) =>
                  joinClassNames(
                    "public-navbar-center__link",
                    isActive && "is-active",
                  )
                }>
                {t(item.labelKey)}
              </NavLink>
            ))}
          </div>

          <div className="public-navbar-right">
            <div className="public-navbar-right__auth">{renderAuthButtons()}</div>

            <div className="public-navbar-right__settings">
              <button
                type="button"
                className="public-navbar-settings-btn"
                onClick={toggleTheme}
                aria-label={theme === "light" ? t("navbar.dark") : t("navbar.light")}>
                {theme === "light" ? <FaMoon /> : <IoMdSunny />}
              </button>

              <div className="language-dropdown" ref={languageMenuRef}>
                <button
                  type="button"
                  className="language-dropdown__button"
                  onClick={() => setIsLanguageMenuOpen((current) => !current)}
                  aria-expanded={isLanguageMenuOpen}
                  aria-haspopup="menu">
                  <IoLanguage />
                  <span>{language.toUpperCase()}</span>
                </button>

                {isLanguageMenuOpen ? (
                  <ul className="language-dropdown__menu" role="menu">
                    {languages.map((lang) => (
                      <li key={lang.code} role="none">
                        <button
                          type="button"
                          role="menuitemradio"
                          aria-checked={language === lang.code}
                          className={joinClassNames(
                            "language-dropdown__option",
                            language === lang.code && "active",
                          )}
                          onClick={() => {
                            toggleLanguage(lang.code);
                            closeMenus();
                          }}>
                          {lang.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="public-navbar-mobile-menu-btn"
            onClick={() => setIsMobileMenuOpen((current) => !current)}
            aria-label="Toggle mobile menu"
            aria-expanded={isMobileMenuOpen}>
            {isMobileMenuOpen ? <IoClose /> : <GiHamburgerMenu />}
          </button>
        </nav>

        {isMobileMenuOpen ? (
          <div className="public-navbar-mobile-menu">
            <div className="public-navbar-mobile-menu-content">
              <div className="public-navbar-mobile-center">
                {navItems.map((item) => (
                  <NavLink
                    key={item.key}
                    to={item.to}
                    end={item.to === "/"}
                    onClick={closeMenus}
                    className={({ isActive }) =>
                      joinClassNames(
                        "public-navbar-mobile-link",
                        isActive && "is-active",
                      )
                    }>
                    {t(item.labelKey)}
                  </NavLink>
                ))}
              </div>

              <div className="public-navbar-mobile-auth">{renderAuthButtons(true)}</div>

              <div className="public-navbar-mobile-settings">
                <button
                  type="button"
                  className="public-navbar-mobile-theme-btn"
                  onClick={toggleTheme}>
                  {theme === "light" ? t("navbar.dark") : t("navbar.light")}
                </button>

                <div className="public-navbar-mobile-language-list">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      className={joinClassNames(
                        "public-navbar-mobile-language-option",
                        language === lang.code && "active",
                      )}
                      onClick={() => {
                        toggleLanguage(lang.code);
                        closeMenus();
                      }}>
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
