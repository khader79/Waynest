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
import { fetchProviderProfile } from "@/modules/provider/api";
import "./NavbarPublic.css";
import { NavbarPublicSearchDropdown } from "./NavbarPublicSearchDropdown";

const logo = "/images/waynest icon.svg";

const navItems = [
{ key: "home", labelKey: "navbar.home", to: "/" },
{ key: "explore", labelKey: "navbar.explore", to: "/explore" },
{ key: "planner", labelKey: "navbar.planner", to: "/plan" },
{ key: "about", labelKey: "navbar.about", to: "/about" },
{ key: "contact", labelKey: "navbar.contact", to: "/contact" }];


const joinClassNames = (...classNames) =>
classNames.filter(Boolean).join(" ");

export const NavbarPublic = () => {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { language, toggleLanguage } = useLanguage();
  const location = useLocation();
  const containerRef = useRef(null);
  const languageMenuRef = useRef(null);
  const userMenuRef = useRef(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileAccountOpen, setIsMobileAccountOpen] = useState(false);
  const [providerPublicSlug, setProviderPublicSlug] = useState(null);
  const languages = getLanguages();
  const username = user?.username ?? "User";
  const avatarLetter = username.trim().charAt(0).toUpperCase() || "U";

  useEffect(() => {
    if (user?.role !== "PROVIDER") {
      setProviderPublicSlug(null);
      return;
    }
    let active = true;
    void fetchProviderProfile().
    then((payload) => {
      if (!active) {
        return;
      }
      const slug =
      payload &&
      typeof payload === "object" &&
      "slug" in payload &&
      typeof payload.slug === "string" ?
      payload.slug :
      null;
      setProviderPublicSlug(slug);
    }).
    catch(() => {
      if (active) {
        setProviderPublicSlug(null);
      }
    });
    return () => {
      active = false;
    };
  }, [user?.role, user?.userId]);

  const socialProfilePath =
  user?.role === "PROVIDER" && providerPublicSlug ?
  `/p/${encodeURIComponent(providerPublicSlug)}` :
  `/u/${encodeURIComponent(user?.username ?? "")}`;

  const closeMenus = () => {
    setIsMobileMenuOpen(false);
    setIsLanguageMenuOpen(false);
    setIsUserMenuOpen(false);
    setIsMobileAccountOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      const target = event.target;

      if (
      isLanguageMenuOpen &&
      languageMenuRef.current &&
      !languageMenuRef.current.contains(target))
      {
        setIsLanguageMenuOpen(false);
      }

      if (isUserMenuOpen && userMenuRef.current && !userMenuRef.current.contains(target)) {
        setIsUserMenuOpen(false);
      }

      if (
      isMobileMenuOpen &&
      containerRef.current &&
      !containerRef.current.contains(target))
      {
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
      setIsMobileAccountOpen(false);
    }
  }, [isMobileMenuOpen]);

  useEffect(() => {
    setIsMobileAccountOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1024) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        closeMenus();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const renderAuthButtons = (isMobile = false) => {
    const baseClass = "public-navbar-btn";

    if (user?.role === "USER" || user?.role === "PROVIDER") {
      if (isMobile) {
        return null;
      }
      return (
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
          {isUserMenuOpen ?
          <div className="public-navbar-user-dropdown" role="menu">
              <Link to="/profile" onClick={closeMenus} className="public-navbar-user-link">
                {t("user.sidebar.profile", { defaultValue: "Profile" })}
              </Link>
              <Link to="/wishlist" onClick={closeMenus} className="public-navbar-user-link">
                {t("user.sidebar.wishlist", { defaultValue: "Wishlist" })}
              </Link>
              <Link to={socialProfilePath} onClick={closeMenus} className="public-navbar-user-link">
                {t("social.profile", { defaultValue: "My Posts" })}
              </Link>
              <Link to="/bookings" onClick={closeMenus} className="public-navbar-user-link">
                {t("user.sidebar.bookings", { defaultValue: "Bookings" })}
              </Link>
              <Link to="/saved-plans" onClick={closeMenus} className="public-navbar-user-link">
                {t("tripPlanner.savedPlans", { defaultValue: "Saved Plans" })}
              </Link>
              <Link to="/inbox" onClick={closeMenus} className="public-navbar-user-link">
                {t("navbar.inbox", { defaultValue: "Inbox" })}
              </Link>
              <Link to="/notifications" onClick={closeMenus} className="public-navbar-user-link">
                {t("navbar.notifications", { defaultValue: "Notifications" })}
              </Link>
              <Link to="/plan" onClick={closeMenus} className="public-navbar-user-link">
                {t("navbar.planner", { defaultValue: "Planner" })}
              </Link>
              <Link to="/profile" onClick={closeMenus} className="public-navbar-user-link">
                {t("social.settings", { defaultValue: "Settings" })}
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
            </div> :
          null}
        </div>);

    }

    if (user?.role === "ADMIN") {
      return (
        <Link
          to="/admin-panel"
          onClick={closeMenus}
          className={joinClassNames(baseClass, "dashboard-btn", isMobile && "is-mobile")}>
          {t("navbar.adminPanel")}
        </Link>);

    }

    if (location.pathname === "/login") {
      return (
        <Link
          to="/register"
          onClick={closeMenus}
          className={joinClassNames(baseClass, "register-btn", isMobile && "is-mobile")}>
          {t("navbar.signUp")}
        </Link>);

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
      </>);

  };

  const mobileAuthActions = renderAuthButtons(true);

  return (
    <header className="public-navbar-topbar" ref={containerRef}>
      <div className="public-navbar-container">
        <div className="public-navbar-shell">
          <nav className="public-navbar" aria-label="Public navigation">
            <Link to="/" className="public-navbar-left" onClick={closeMenus}>
              <img className="public-navbar-left__logo" src={logo} alt="Waynest logo" />
              <span className="public-navbar-left__text">Waynest</span>
            </Link>

            <div className="public-navbar-mid">
              <NavbarPublicSearchDropdown onAfterNavigate={closeMenus} />
              <div className="public-navbar-center">
                {navItems.map((item) =>
                <NavLink
                  key={item.key}
                  to={item.to}
                  end={item.to === "/"}
                  onClick={closeMenus}
                  className={({ isActive }) =>
                  joinClassNames(
                    "public-navbar-center__link",
                    isActive && "is-active"
                  )
                  }>
                    {t(item.labelKey)}
                  </NavLink>
                )}
              </div>
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

                  {isLanguageMenuOpen ?
                  <ul className="language-dropdown__menu" role="menu">
                      {languages.map((lang) =>
                    <li key={lang.code} role="none">
                          <button
                        type="button"
                        role="menuitemradio"
                        aria-checked={language === lang.code}
                        className={joinClassNames(
                          "language-dropdown__option",
                          language === lang.code && "active"
                        )}
                        onClick={() => {
                          toggleLanguage(lang.code);
                          closeMenus();
                        }}>
                            {lang.label}
                          </button>
                        </li>
                    )}
                    </ul> :
                  null}
                </div>
              </div>
            </div>

            <button
              type="button"
              className="public-navbar-mobile-menu-btn"
              onClick={() => setIsMobileMenuOpen((current) => !current)}
              aria-label="Toggle mobile menu"
              aria-expanded={isMobileMenuOpen}
              aria-controls={isMobileMenuOpen ? "public-navbar-mobile-panel" : undefined}>
              {isMobileMenuOpen ? <IoClose /> : <GiHamburgerMenu />}
            </button>
          </nav>

          {isMobileMenuOpen ?
          <>
              <button
              type="button"
              className="public-navbar-mobile-backdrop"
              aria-label="Close mobile menu"
              onClick={closeMenus} />
            
              <div
              id="public-navbar-mobile-panel"
              className="public-navbar-mobile-panel"
              role="region"
              aria-label={t("navbar.mainNavigation", { defaultValue: "Navigation menu" })}>
                <div className="public-navbar-mobile-drawer-body">
                <section className="public-navbar-mobile-section">
                  <p className="public-navbar-mobile-section-title">
                    {t("navbar.mainNavigation", { defaultValue: "Main" })}
                  </p>
                  <div className="public-navbar-mobile-section-links">
                    {navItems.map((item) =>
                    <NavLink
                      key={item.key}
                      to={item.to}
                      end={item.to === "/"}
                      onClick={closeMenus}
                      className={({ isActive }) =>
                      joinClassNames(
                        "public-navbar-mobile-row",
                        isActive && "is-active"
                      )
                      }>
                        {t(item.labelKey)}
                      </NavLink>
                    )}
                  </div>
                </section>

                <section className="public-navbar-mobile-section">
                  <p className="public-navbar-mobile-section-title">
                    {t("search.label", { defaultValue: "Search" })}
                  </p>
                  <NavbarPublicSearchDropdown
                    variant="mobile"
                    onAfterNavigate={closeMenus} />
                  
                </section>

                {user?.role === "USER" || user?.role === "PROVIDER" ?
                <section className="public-navbar-mobile-section">
                    <button
                    type="button"
                    className={joinClassNames(
                      "public-navbar-mobile-account-trigger",
                      isMobileAccountOpen && "is-open"
                    )}
                    onClick={() => setIsMobileAccountOpen((current) => !current)}
                    aria-expanded={isMobileAccountOpen}
                    aria-controls="mobile-account-actions">
                      <span>{t("navbar.account", { defaultValue: "Account" })}</span>
                      <FiChevronDown />
                    </button>
                    <div
                    id="mobile-account-actions"
                    className={joinClassNames(
                      "public-navbar-mobile-account-links-wrap",
                      isMobileAccountOpen && "is-open"
                    )}
                    aria-hidden={!isMobileAccountOpen}>
                      <div className="public-navbar-mobile-account-links">
                        <Link to="/profile" onClick={closeMenus} className="public-navbar-mobile-row">
                          {t("user.sidebar.profile", { defaultValue: "Profile" })}
                        </Link>
                        <Link to={socialProfilePath} onClick={closeMenus} className="public-navbar-mobile-row">
                          {t("social.profile", { defaultValue: "My Posts" })}
                        </Link>
                        <Link to="/wishlist" onClick={closeMenus} className="public-navbar-mobile-row">
                          {t("user.sidebar.wishlist", { defaultValue: "Wishlist" })}
                        </Link>
                        <Link to="/bookings" onClick={closeMenus} className="public-navbar-mobile-row">
                          {t("user.sidebar.bookings", { defaultValue: "Bookings" })}
                        </Link>
                        <Link to="/saved-plans" onClick={closeMenus} className="public-navbar-mobile-row">
                          {t("tripPlanner.savedPlans", { defaultValue: "Saved Plans" })}
                        </Link>
                        <Link to="/inbox" onClick={closeMenus} className="public-navbar-mobile-row">
                          {t("navbar.inbox", { defaultValue: "Inbox" })}
                        </Link>
                        <Link to="/notifications" onClick={closeMenus} className="public-navbar-mobile-row">
                          {t("navbar.notifications", { defaultValue: "Notifications" })}
                        </Link>
                        <Link to="/profile" onClick={closeMenus} className="public-navbar-mobile-row">
                          {t("social.settings", { defaultValue: "Settings" })}
                        </Link>
                        <button
                        type="button"
                        onClick={() => {
                          void logout();
                          closeMenus();
                        }}
                        className={joinClassNames(
                          "public-navbar-mobile-row",
                          "public-navbar-mobile-row-danger"
                        )}>
                          {t("navbar.logout")}
                        </button>
                      </div>
                    </div>
                  </section> :
                null}

                {mobileAuthActions ?
                <section className="public-navbar-mobile-section">
                    <p className="public-navbar-mobile-section-title">
                      {t("navbar.access", { defaultValue: "Access" })}
                    </p>
                    <div className="public-navbar-mobile-auth">{mobileAuthActions}</div>
                  </section> :
                null}

                <section className="public-navbar-mobile-section public-navbar-mobile-section-preferences">
                  <p className="public-navbar-mobile-section-title">
                    {t("navbar.preferences", { defaultValue: "Preferences" })}
                  </p>
                  <div className="public-navbar-mobile-settings">
                    <button
                      type="button"
                      className="public-navbar-mobile-theme-btn"
                      onClick={toggleTheme}>
                      {theme === "light" ? t("navbar.dark") : t("navbar.light")}
                    </button>

                    <div className="public-navbar-mobile-language-list">
                      {languages.map((lang) =>
                      <button
                        key={lang.code}
                        type="button"
                        className={joinClassNames(
                          "public-navbar-mobile-language-option",
                          language === lang.code && "active"
                        )}
                        onClick={() => {
                          toggleLanguage(lang.code);
                          closeMenus();
                        }}>
                          {lang.label}
                        </button>
                      )}
                    </div>
                  </div>
                </section>
                </div>
              </div>
            </> :
          null}
        </div>
      </div>
    </header>);

};