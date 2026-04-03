import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { GiHamburgerMenu } from "react-icons/gi";
import { IoClose } from "react-icons/io5";
import { FiChevronDown } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { fetchProviderProfile } from "@/api/provider";
import { NavbarPublicSearchDropdown } from "./NavbarPublicSearchDropdown";
import { NavbarMessagesMenu } from "./NavbarMessagesMenu";
import "./NavbarPublic.css";

const logo = "/images/waynest icon.svg";

const navItems = [
  { key: "home", labelKey: "navbar.home", to: "/" },
  { key: "explore", labelKey: "navbar.explore", to: "/explore" },
  { key: "destinations", labelKey: "navbar.destinations", to: "/destinations", defaultLabel: "Destinations" },
  { key: "planner", labelKey: "navbar.planner", to: "/plan" },
  { key: "about", labelKey: "navbar.about", to: "/about" },
];

const joinClassNames = (...classNames) => classNames.filter(Boolean).join(" ");

export const NavbarPublic = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const location = useLocation();
  const containerRef = useRef(null);
  const accountClusterRef = useRef(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [accountMenu, setAccountMenu] = useState(/** @type {'user' | 'messages' | null} */ (null));
  const [isMobileAccountOpen, setIsMobileAccountOpen] = useState(false);
  const [providerPublicSlug, setProviderPublicSlug] = useState(null);

  const username = user?.username ?? "User";
  const avatarLetter = username.trim().charAt(0).toUpperCase() || "U";
  const panelPath =
    user?.role === "ADMIN"
      ? "/admin-panel"
      : user?.role === "PROVIDER"
        ? "/provider-panel"
        : "/dashboard";

  useEffect(() => {
    if (user?.role !== "PROVIDER") {
      setProviderPublicSlug(null);
      return;
    }

    let active = true;

    void fetchProviderProfile()
      .then((payload) => {
        if (!active) {
          return;
        }

        const slug =
          payload &&
          typeof payload === "object" &&
          typeof payload.slug === "string"
            ? payload.slug
            : null;

        setProviderPublicSlug(slug);
      })
      .catch(() => {
        if (active) {
          setProviderPublicSlug(null);
        }
      });

    return () => {
      active = false;
    };
  }, [user?.role, user?.userId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (accountClusterRef.current && !accountClusterRef.current.contains(event.target)) {
        setAccountMenu(null);
      }

      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsMobileAccountOpen(false);
    setAccountMenu(null);
  }, [location.pathname]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
        setIsMobileAccountOpen(false);
        setAccountMenu(null);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const socialProfilePath =
    user?.role === "PROVIDER" && providerPublicSlug
      ? `/p/${encodeURIComponent(providerPublicSlug)}`
      : `/u/${encodeURIComponent(user?.username ?? "")}`;

  const closeMenus = () => {
    setIsMobileMenuOpen(false);
    setIsMobileAccountOpen(false);
    setIsUserMenuOpen(false);
  };

  const accountLinks = [
    { label: t("navbar.dashboard", { defaultValue: "Dashboard" }), to: panelPath },
    { label: t("user.sidebar.profile", { defaultValue: "Profile" }), to: "/profile" },
    { label: t("user.sidebar.wishlist", { defaultValue: "Wishlist" }), to: "/wishlist" },
    { label: t("user.sidebar.bookings", { defaultValue: "Bookings" }), to: "/bookings" },
    { label: t("tripPlanner.savedPlans", { defaultValue: "Saved Plans" }), to: "/saved-plans" },
    {
      label: t("navbar.messagesTitle", { defaultValue: "Messages" }),
      to: "/social",
    },
    { label: t("navbar.notifications", { defaultValue: "Notifications" }), to: "/notifications" },
    { label: t("social.profile", { defaultValue: "My Posts" }), to: socialProfilePath },
  ];

  const renderAccessButtons = (isMobile = false) => {
    const baseClass = "public-navbar-btn";

    if (user?.role === "USER" || user?.role === "PROVIDER") {
      if (isMobile) {
        return null;
      }

      return (
        <div className="public-navbar-user-cluster" ref={accountClusterRef}>
          <NavbarMessagesMenu
            open={accountMenu === "messages"}
            onToggle={() =>
              setAccountMenu((current) => (current === "messages" ? null : "messages"))
            }
            onNavigate={closeMenus}
          />
          <div className="public-navbar-user-menu">
          <button
            type="button"
            className="public-navbar-user-trigger"
            onClick={() =>
              setAccountMenu((current) => (current === "user" ? null : "user"))
            }
            aria-expanded={accountMenu === "user"}
            aria-haspopup="menu"
          >
            <span className="public-navbar-user-avatar">{avatarLetter}</span>
            <span className="public-navbar-user-name">{username}</span>
            <FiChevronDown />
          </button>

          {accountMenu === "user" ? (
            <div className="public-navbar-user-dropdown" role="menu">
              {accountLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={closeMenus}
                  className="public-navbar-user-link"
                >
                  {link.label}
                </Link>
              ))}
              <button
                type="button"
                className="public-navbar-user-link public-navbar-user-logout"
                onClick={() => {
                  void logout();
                  closeMenus();
                }}
              >
                {t("navbar.logout")}
              </button>
            </div>
          ) : null}
        </div>
        </div>
      );
    }

    if (user?.role === "ADMIN") {
      return (
        <Link
          to="/admin-panel"
          onClick={closeMenus}
          className={joinClassNames(baseClass, "dashboard-btn", isMobile && "is-mobile")}
        >
          {t("navbar.adminPanel", { defaultValue: "Admin Panel" })}
        </Link>
      );
    }

    if (location.pathname === "/login") {
      return (
        <Link
          to="/register"
          onClick={closeMenus}
          className={joinClassNames(baseClass, "register-btn", isMobile && "is-mobile")}
        >
          {t("navbar.signUp")}
        </Link>
      );
    }

    return (
      <>
        <Link
          to="/login"
          onClick={closeMenus}
          className={joinClassNames(baseClass, "login-btn", isMobile && "is-mobile")}
        >
          {t("navbar.login")}
        </Link>
        <Link
          to="/register"
          onClick={closeMenus}
          className={joinClassNames(baseClass, "register-btn", isMobile && "is-mobile")}
        >
          {t("navbar.signUp")}
        </Link>
      </>
    );
  };

  const mobileAccess = renderAccessButtons(true);

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
                {navItems.map((item) => (
                  <NavLink
                    key={item.key}
                    to={item.to}
                    end={item.to === "/"}
                    onClick={closeMenus}
                    className={({ isActive }) =>
                      joinClassNames("public-navbar-center__link", isActive && "is-active")
                    }
                  >
                    {t(item.labelKey, { defaultValue: item.defaultLabel ?? item.key })}
                  </NavLink>
                ))}
              </div>
            </div>

            <div className="public-navbar-right">
              <div className="public-navbar-right__auth">{renderAccessButtons()}</div>
            </div>

            <button
              type="button"
              className="public-navbar-mobile-menu-btn"
              onClick={() => setIsMobileMenuOpen((current) => !current)}
              aria-label="Toggle mobile menu"
              aria-expanded={isMobileMenuOpen}
              aria-controls={isMobileMenuOpen ? "public-navbar-mobile-panel" : undefined}
            >
              {isMobileMenuOpen ? <IoClose /> : <GiHamburgerMenu />}
            </button>
          </nav>

          {isMobileMenuOpen ? (
            <>
              <button
                type="button"
                className="public-navbar-mobile-backdrop"
                aria-label="Close mobile menu"
                onClick={closeMenus}
              />

              <div
                id="public-navbar-mobile-panel"
                className="public-navbar-mobile-panel"
                role="region"
                aria-label={t("navbar.mainNavigation", { defaultValue: "Navigation menu" })}
              >
                <div className="public-navbar-mobile-drawer-body">
                  <section className="public-navbar-mobile-section">
                    <p className="public-navbar-mobile-section-title">
                      {t("navbar.mainNavigation", { defaultValue: "Main" })}
                    </p>
                    <div className="public-navbar-mobile-section-links">
                      {navItems.map((item) => (
                        <NavLink
                          key={item.key}
                          to={item.to}
                          end={item.to === "/"}
                          onClick={closeMenus}
                          className={({ isActive }) =>
                            joinClassNames("public-navbar-mobile-row", isActive && "is-active")
                          }
                        >
                          {t(item.labelKey, { defaultValue: item.defaultLabel ?? item.key })}
                        </NavLink>
                      ))}
                    </div>
                  </section>

                  <section className="public-navbar-mobile-section">
                    <p className="public-navbar-mobile-section-title">
                      {t("search.label", { defaultValue: "Search" })}
                    </p>
                    <NavbarPublicSearchDropdown variant="mobile" onAfterNavigate={closeMenus} />
                  </section>

                  {user?.role === "USER" || user?.role === "PROVIDER" ? (
                    <section className="public-navbar-mobile-section">
                      <button
                        type="button"
                        className={joinClassNames(
                          "public-navbar-mobile-account-trigger",
                          isMobileAccountOpen && "is-open",
                        )}
                        onClick={() => setIsMobileAccountOpen((current) => !current)}
                        aria-expanded={isMobileAccountOpen}
                        aria-controls="mobile-account-actions"
                      >
                        <span>{t("navbar.account", { defaultValue: "Account" })}</span>
                        <FiChevronDown />
                      </button>

                      <div
                        id="mobile-account-actions"
                        className={joinClassNames(
                          "public-navbar-mobile-account-links-wrap",
                          isMobileAccountOpen && "is-open",
                        )}
                        aria-hidden={!isMobileAccountOpen}
                      >
                        <div className="public-navbar-mobile-account-links">
                          {accountLinks.map((link) => (
                            <Link
                              key={link.to}
                              to={link.to}
                              onClick={closeMenus}
                              className="public-navbar-mobile-row"
                            >
                              {link.label}
                            </Link>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              void logout();
                              closeMenus();
                            }}
                            className={joinClassNames(
                              "public-navbar-mobile-row",
                              "public-navbar-mobile-row-danger",
                            )}
                          >
                            {t("navbar.logout")}
                          </button>
                        </div>
                      </div>
                    </section>
                  ) : null}

                  {mobileAccess ? (
                    <section className="public-navbar-mobile-section">
                      <p className="public-navbar-mobile-section-title">
                        {t("navbar.access", { defaultValue: "Access" })}
                      </p>
                      <div className="public-navbar-mobile-auth">{mobileAccess}</div>
                    </section>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
};
