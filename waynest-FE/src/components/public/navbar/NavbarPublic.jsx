import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  HiChevronDown,
  HiOutlineCheckCircle,
  HiOutlineMenu,
  HiOutlineMoon,
  HiOutlineSearch,
  HiOutlineSun,
  HiOutlineUserGroup,
  HiOutlineX,
} from "react-icons/hi";
import { TbMapPin, TbWorld } from "react-icons/tb";
import { useTranslation } from "react-i18next";
import { getLanguageDir, SUPPORTED_LANGUAGES } from "@/i18n";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationsContext";
import { fetchProviderProfile } from "@/api/provider";
import { fetchMyProviderApplication } from "@/api/providerApplications";
import { NavbarPublicSearchDropdown } from "./NavbarPublicSearchDropdown";
import { NavbarMessagesMenu } from "./NavbarMessagesMenu";
import { NavbarNotificationsMenu } from "./NavbarNotificationsMenu";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { setActiveWorkspace } from "@/utils/activeWorkspaceStorage";
import "./NavbarPublic.css";

const NAVBAR_MOBILE_BREAKPOINT = "(max-width: 1024px)";

const navItems = [
  { key: "home", labelKey: "navbar.home", to: "/" },
  { key: "explore", labelKey: "navbar.explore", to: "/explore" },
  { key: "destinations", labelKey: "navbar.destinations", to: "/destinations", defaultLabel: "Destinations" },
  { key: "planner", labelKey: "navbar.planner", to: "/plan" },
  { key: "about", labelKey: "navbar.about", to: "/about" },
];

const joinClassNames = (...classNames) => classNames.filter(Boolean).join(" ");

export const NavbarPublic = () => {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const location = useLocation();
  const containerRef = useRef(null);
  const accountClusterRef = useRef(null);
  const messagesWrapRef = useRef(null);
  const languageClusterRef = useRef(null);
  const mobilePanelRef = useRef(null);
  const isMobileNavLayout = useMediaQuery(NAVBAR_MOBILE_BREAKPOINT);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [theme, setTheme] = useState(() =>
    document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light",
  );
  const [floatDismissed, setFloatDismissed] = useState(() => {
    try {
      return localStorage.getItem("waynest-nav-float-dismissed") === "1";
    } catch {
      return false;
    }
  });
  const [accountMenu, setAccountMenu] = useState(
    /** @type {'user' | 'messages' | 'notifications' | null} */ (null),
  );
  const [isMobileAccountOpen, setIsMobileAccountOpen] = useState(false);
  const [providerDisplayName, setProviderDisplayName] = useState(null);
  const [providerApplication, setProviderApplication] = useState(null);

  const username = user?.username ?? "User";
  const avatarLetter = username.trim().charAt(0).toUpperCase() || "U";
  const currentLangCode = (i18n.language || "en").split("-")[0];
  const currentLangMeta = useMemo(
    () => SUPPORTED_LANGUAGES.find((l) => l.code === currentLangCode) ?? SUPPORTED_LANGUAGES[0],
    [currentLangCode],
  );
  const closeMenus = useCallback(() => {
    setIsMobileMenuOpen(false);
    setIsMobileAccountOpen(false);
    setLangMenuOpen(false);
    setAccountMenu(null);
    setIsMobileSearchOpen(false);
  }, []);

  const handleAccountMenuLinkClick = useCallback(
    (link) => {
      if (link.key === "provider-workspace" && user?.id) {
        setActiveWorkspace(user.id, "provider");
      }
      closeMenus();
    },
    [user?.id, closeMenus],
  );

  useEffect(() => {
    if (user?.role !== "PROVIDER") {
      setProviderDisplayName(null);
      return;
    }

    let active = true;

    void fetchProviderProfile()
      .then((payload) => {
        if (!active) {
          return;
        }

        const name =
          payload &&
          typeof payload === "object" &&
          typeof payload.displayName === "string" &&
          payload.displayName.trim()
            ? payload.displayName.trim()
            : null;

        setProviderDisplayName(name);
      })
      .catch(() => {
        if (active) {
          setProviderDisplayName(null);
        }
      });

    return () => {
      active = false;
    };
  }, [user?.role, user?.id]);

  useEffect(() => {
    if (user?.role !== "USER") {
      setProviderApplication(null);
      return;
    }

    let active = true;
    void fetchMyProviderApplication()
      .then((row) => {
        if (active) {
          setProviderApplication(row ?? null);
        }
      })
      .catch(() => {
        if (active) {
          setProviderApplication(null);
        }
      });

    return () => {
      active = false;
    };
  }, [user?.role, user?.id]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const target = event.target;
      const inAccount = accountClusterRef.current?.contains(target);
      const inMessages = messagesWrapRef.current?.contains(target);
      if (accountMenu && !inAccount && !inMessages) {
        setAccountMenu(null);
      }

      if (languageClusterRef.current && !languageClusterRef.current.contains(target)) {
        setLangMenuOpen(false);
      }

      if (containerRef.current && !containerRef.current.contains(target)) {
        setIsMobileMenuOpen(false);
        setIsMobileSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [accountMenu]);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return undefined;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return undefined;
    }
    const node = mobilePanelRef.current;
    if (!node) {
      return undefined;
    }
    node.focus();
    return undefined;
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const code = (i18n.language || "en").split("-")[0];
    document.documentElement.setAttribute("lang", code);
    document.documentElement.setAttribute("dir", getLanguageDir(code));
  }, [i18n.language]);

  useEffect(() => {
    closeMenus();
  }, [location.pathname, closeMenus]);

  useEffect(() => {
    window.addEventListener("resize", closeMenus);
    return () => {
      window.removeEventListener("resize", closeMenus);
    };
  }, [closeMenus]);

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
  }, [closeMenus]);

  const personalProfilePath = `/u/${encodeURIComponent(user?.username ?? "")}`;

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("waynest-theme", next);
    } catch {
      /* ignore */
    }
  };

  const selectLanguage = (code) => {
    void i18n.changeLanguage(code);
    closeMenus();
  };

  const dismissFloatingCard = () => {
    try {
      localStorage.setItem("waynest-nav-float-dismissed", "1");
    } catch {
      /* ignore */
    }
    setFloatDismissed(true);
  };

  const { personalLinks, applyLinks, providerWorkspaceLink } = useMemo(() => {
    const personal = [
      {
        key: "home-feed",
        label: t("navbar.home", { defaultValue: "Home" }),
        to: "/",
      },
      {
        key: "account-profile",
        label: t("user.sidebar.profile", { defaultValue: "Profile" }),
        to: "/profile",
      },
      {
        key: "wishlist",
        label: t("user.sidebar.wishlist", { defaultValue: "Wishlist" }),
        to: "/wishlist",
      },
      {
        key: "bookings",
        label: t("user.sidebar.bookings", { defaultValue: "Bookings" }),
        to: "/bookings",
      },
      {
        key: "saved-plans",
        label: t("tripPlanner.savedPlans", { defaultValue: "Saved Plans" }),
        to: "/saved-plans",
      },
      {
        key: "messages",
        label: t("navbar.messagesTitle", { defaultValue: "Messages" }),
        to: "/social",
      },
      {
        key: "notifications",
        label: t("navbar.notifications", { defaultValue: "Notifications" }),
        to: "/notifications",
      },
      {
        key: "my-posts",
        label: t("social.profile", { defaultValue: "My posts" }),
        to: personalProfilePath,
      },
    ];

    const apply = [];
    if (user?.role === "USER") {
      if (providerApplication?.status === "PENDING") {
        apply.push({
          key: "provider-apply-pending",
          label: t("navbar.providerApplyPending", {
            defaultValue: "Provider application: pending",
          }),
          to: "/account/provider/apply",
          disabled: true,
        });
      } else if (
        !providerApplication ||
        providerApplication.status === "REJECTED"
      ) {
        apply.push({
          key: "provider-apply",
          label: t("navbar.becomeProvider", {
            defaultValue: "Become a provider",
          }),
          to: "/account/provider/apply",
        });
      }
    }

    let providerWorkspace = null;
    if (user?.role === "PROVIDER") {
      providerWorkspace = {
        key: "provider-workspace",
        to: "/account/provider",
        label:
          providerDisplayName ??
          t("navbar.businessAccount", { defaultValue: "Business account" }),
      };
    }

    return {
      personalLinks: personal,
      applyLinks: apply,
      providerWorkspaceLink: providerWorkspace,
    };
  }, [
    t,
    personalProfilePath,
    user?.role,
    providerApplication,
    providerDisplayName,
  ]);

  const renderAccountMenuLink = (link, variant) => {
    if (variant === "desktop") {
      return link.disabled ? (
        <span
          key={link.key}
          className="public-navbar-user-link public-navbar-user-link--disabled"
          role="menuitem"
        >
          {link.label}
        </span>
      ) : (
        <Link
          key={link.key}
          to={link.to}
          onClick={() => handleAccountMenuLinkClick(link)}
          className={joinClassNames(
            "public-navbar-user-link",
            link.key === "provider-workspace" && "public-navbar-user-link--provider-workspace",
          )}
          role="menuitem"
        >
          {link.label}
        </Link>
      );
    }

    return link.disabled ? (
      <span
        key={link.key}
        className="public-navbar-mobile-row public-navbar-mobile-row--disabled"
      >
        {link.label}
      </span>
    ) : (
      <Link
        key={link.key}
        to={link.to}
        onClick={() => handleAccountMenuLinkClick(link)}
        className={joinClassNames(
          "public-navbar-mobile-row",
          link.key === "provider-workspace" && "public-navbar-mobile-row--provider-workspace",
        )}
      >
        {link.label}
      </Link>
    );
  };

  const renderAccountMenuSections = (variant) => (
    <>
      {personalLinks.map((link) => renderAccountMenuLink(link, variant))}
      {applyLinks.map((link) => renderAccountMenuLink(link, variant))}
      {providerWorkspaceLink ? (
        <>
          <div
            className="public-navbar-user-dropdown__separator"
            role="separator"
            aria-hidden="true"
          />
          {renderAccountMenuLink(providerWorkspaceLink, variant)}
        </>
      ) : null}
    </>
  );

  const showLoggedInChrome = user?.role === "USER" || user?.role === "PROVIDER";

  const renderNotificationsMenu = () => (
    <NavbarNotificationsMenu
      open={accountMenu === "notifications"}
      onToggle={() => {
        setIsMobileMenuOpen(false);
        setIsMobileSearchOpen(false);
        setAccountMenu((current) => (current === "notifications" ? null : "notifications"));
      }}
      onNavigate={closeMenus}
      unreadCount={unreadCount}
    />
  );

  const renderMessagesMenu = () => (
    <NavbarMessagesMenu
      open={accountMenu === "messages"}
      onToggle={() => {
        setIsMobileMenuOpen(false);
        setIsMobileSearchOpen(false);
        setAccountMenu((current) => (current === "messages" ? null : "messages"));
      }}
      onNavigate={closeMenus}
    />
  );

  const renderAccessButtons = (isMobile = false) => {
    const baseClass = "public-navbar-btn";

    if (user?.role === "USER" || user?.role === "PROVIDER") {
      if (isMobile) {
        return null;
      }

      return (
        <div className="public-navbar-user-cluster">
          {!isMobileNavLayout ? (
            <div ref={messagesWrapRef} className="public-navbar-messages-host public-navbar-comms-host">
              {renderNotificationsMenu()}
              {renderMessagesMenu()}
            </div>
          ) : null}
          <div className="public-navbar-user-menu" ref={accountClusterRef}>
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
            <HiChevronDown aria-hidden />
            </button>

            {accountMenu === "user" ? (
              <div className="public-navbar-user-dropdown" role="menu">
                {renderAccountMenuSections("desktop")}
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
    <>
    <header className="public-navbar-topbar" ref={containerRef}>
      <div className="public-navbar-container">
        <div className="public-navbar-shell">
          <nav className="public-navbar" aria-label="Public navigation">
            <Link to="/" className="public-navbar-left" onClick={closeMenus}>
              <span className="public-navbar-left__pin" aria-hidden="true">
                <TbMapPin />
              </span>
              <span className="public-navbar-left__text public-navbar-left__text--brand">
                Waynest
              </span>
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
              <div className="public-navbar-right__pill public-navbar-right__pill--locale">
                <div className="public-navbar-right__settings" ref={languageClusterRef}>
                  <div className="language-dropdown">
                    <button
                      type="button"
                      className="language-dropdown__button language-dropdown__button--compact"
                      onClick={() => setLangMenuOpen((v) => !v)}
                      aria-expanded={langMenuOpen}
                      aria-haspopup="listbox"
                      aria-label={t("navbar.language", { defaultValue: "Language" })}
                    >
                      <TbWorld aria-hidden />
                      <span className="language-dropdown__label">{currentLangMeta.nativeName}</span>
                    </button>
                    {langMenuOpen ? (
                      <ul className="language-dropdown__menu" role="listbox">
                        {SUPPORTED_LANGUAGES.map((lang) => (
                          <li key={lang.code}>
                            <button
                              type="button"
                              className={`language-dropdown__option ${
                                lang.code === currentLangCode ? "active" : ""
                              }`}
                              role="option"
                              aria-selected={lang.code === currentLangCode}
                              onClick={() => selectLanguage(lang.code)}
                            >
                              <span className="language-dropdown__flag" aria-hidden>
                                {lang.flag}
                              </span>
                              {lang.nativeName}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="public-navbar-theme-btn"
                    onClick={toggleTheme}
                    aria-label={
                      theme === "dark"
                        ? t("navbar.themeLight", { defaultValue: "Switch to light mode" })
                        : t("navbar.themeDark", { defaultValue: "Switch to dark mode" })
                    }
                  >
                    {theme === "dark" ? <HiOutlineSun aria-hidden /> : <HiOutlineMoon aria-hidden />}
                  </button>
                </div>
              </div>
              <div className="public-navbar-right__pill public-navbar-right__pill--account">
                <div className="public-navbar-right__auth">{renderAccessButtons()}</div>
              </div>
            </div>

            <div className="public-navbar-mobile-trailing">
              {showLoggedInChrome && isMobileNavLayout ? (
                <div ref={messagesWrapRef} className="public-navbar-mobile-messages-host public-navbar-comms-host">
                  {renderNotificationsMenu()}
                  {renderMessagesMenu()}
                </div>
              ) : null}
              <button
                type="button"
                className="public-navbar-mobile-search-btn"
                onClick={() => {
                  setAccountMenu(null);
                  setIsMobileSearchOpen((v) => !v);
                  setIsMobileMenuOpen(false);
                }}
                aria-label="Search"
                aria-expanded={isMobileSearchOpen}
              >
                <HiOutlineSearch aria-hidden />
              </button>
              <button
                type="button"
                className="public-navbar-mobile-menu-btn"
                onClick={() => {
                  setAccountMenu(null);
                  setIsMobileSearchOpen(false);
                  setIsMobileMenuOpen((current) => !current);
                }}
                aria-label="Toggle mobile menu"
                aria-expanded={isMobileMenuOpen}
                aria-controls={isMobileMenuOpen ? "public-navbar-mobile-panel" : undefined}
              >
                {isMobileMenuOpen ? <HiOutlineX aria-hidden /> : <HiOutlineMenu aria-hidden />}
              </button>
            </div>
          </nav>

          {isMobileSearchOpen ? (
            <div className="public-navbar-mobile-search-bar">
              <NavbarPublicSearchDropdown
                variant="mobile"
                onAfterNavigate={closeMenus}
              />
            </div>
          ) : null}

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
                ref={mobilePanelRef}
                className="public-navbar-mobile-panel"
                role="dialog"
                aria-modal="true"
                tabIndex={-1}
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

                  <section className="public-navbar-mobile-section">
                    <p className="public-navbar-mobile-section-title">
                      {t("navbar.language", { defaultValue: "Language" })}
                    </p>
                    <div className="public-navbar-mobile-language-list">
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <button
                          key={lang.code}
                          type="button"
                          className={`public-navbar-mobile-language-option ${
                            currentLangCode === lang.code ? "active" : ""
                          }`}
                          onClick={() => selectLanguage(lang.code)}
                        >
                          <span aria-hidden>{lang.flag}</span>
                          {lang.nativeName}
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="public-navbar-mobile-section">
                    <p className="public-navbar-mobile-section-title">
                      {t("navbar.appearance", { defaultValue: "Appearance" })}
                    </p>
                    <button
                      type="button"
                      className="public-navbar-mobile-theme-btn"
                      onClick={toggleTheme}
                    >
                      {theme === "dark" ? <HiOutlineSun aria-hidden /> : <HiOutlineMoon aria-hidden />}
                      {theme === "dark"
                        ? t("navbar.themeLight", { defaultValue: "Light mode" })
                        : t("navbar.themeDark", { defaultValue: "Dark mode" })}
                    </button>
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
                        <HiChevronDown aria-hidden />
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
                          {renderAccountMenuSections("mobile")}
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

    {!floatDismissed ? (
      <aside
        className="public-navbar-floating-card"
        aria-label={t("navbar.promoCardLabel", { defaultValue: "Waynest highlights" })}
      >
        <button
          type="button"
          className="public-navbar-floating-card__dismiss"
          onClick={dismissFloatingCard}
          aria-label={t("common.dismiss", { defaultValue: "Dismiss" })}
        >
          <HiOutlineX aria-hidden />
        </button>
        <p className="public-navbar-floating-card__title">
          {t("navbar.promoTitle", { defaultValue: "Plan smarter together" })}
        </p>
        <ul className="public-navbar-floating-card__list">
          <li>
            <HiOutlineCheckCircle aria-hidden />
            <span>
              {t("navbar.promoAi", {
                defaultValue: "AI itineraries tailored to your trip",
              })}
            </span>
          </li>
          <li>
            <HiOutlineUserGroup aria-hidden />
            <span>
              {t("navbar.promoSocial", {
                defaultValue: "Collaborate with friends on routes and stays",
              })}
            </span>
          </li>
        </ul>
      </aside>
    ) : null}
    </>
  );
};
