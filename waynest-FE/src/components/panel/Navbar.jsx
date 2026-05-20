import { useEffect, useRef, useState, useCallback } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  FiChevronDown,
  FiX,
  FiMenu,
  FiLogOut,
  FiUser,
  FiGrid,
} from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";
import { useProviderWorkspace } from "@/context/ProviderWorkspaceContext";
import { setActiveWorkspace } from "@/utils/activeWorkspaceStorage";
import panelsLinks from "@/utils/panelLinks";
import { resolveMediaUrl } from "@/utils/mediaUrl";
import "./Navbar.css";
import ThemeToggle from "@/components/theme/ThemeToggle";
import LanguageSelector from "@/components/theme/LanguageSelector";

const roleHomePaths = {
  admin: "/admin-panel",
  provider: "/account/provider",
  user: "/",
};

const roleQuickLinks = {
  admin: [
    {
      labelKey: "navbar.quickLinks.dashboard",
      defaultLabel: "Dashboard",
      to: "/admin-panel",
    },
    {
      labelKey: "navbar.quickLinks.users",
      defaultLabel: "Users",
      to: "/admin-panel/users",
    },
  ],
  provider: [
    {
      labelKey: "navbar.quickLinks.profile",
      defaultLabel: "Profile",
      to: "/account/provider/settings",
    },
    {
      labelKey: "navbar.quickLinks.places",
      defaultLabel: "Places",
      to: "/account/provider/places",
    },
    {
      labelKey: "navbar.quickLinks.calendar",
      defaultLabel: "Calendar",
      to: "/calendar",
    },
  ],
  user: [
    {
      labelKey: "navbar.quickLinks.profile",
      defaultLabel: "Profile",
      to: "/profile",
    },
    {
      labelKey: "navbar.quickLinks.activities",
      defaultLabel: "Activities",
      to: "/activities",
    },
    {
      labelKey: "navbar.quickLinks.calendar",
      defaultLabel: "Calendar",
      to: "/calendar",
    },
  ],
};

const Navbar = ({ title, role, onToggleSidebar, isSidebarOpen }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const providerWorkspace = useProviderWorkspace();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const dropdownRef = useRef(null);
  const username = user?.username ?? "User";
  const providerName =
    role === "provider" &&
    !providerWorkspace.loading &&
    typeof providerWorkspace.displayName === "string" &&
    providerWorkspace.displayName.trim()
      ? providerWorkspace.displayName.trim()
      : null;
  const rawBrand =
    role === "provider" && !providerWorkspace.loading
      ? providerWorkspace.logoUrl || providerWorkspace.coverPhotoUrl
      : null;
  const providerBrandImage =
    typeof rawBrand === "string" && rawBrand.trim()
      ? resolveMediaUrl(rawBrand.trim())
      : null;
  const menuLabel = role === "provider" ? providerName || username : username;
  const menuLetter = (menuLabel.trim().charAt(0) || "U").toUpperCase();
  const brandTo = roleHomePaths[role] ?? "/";
  const heading =
    title ??
    (role === "provider"
      ? (providerName ??
        t("navbar.businessAccount", { defaultValue: "Business account" }))
      : role === "admin"
        ? t("navbar.adminControlCenter", {
            defaultValue: "Admin control center",
          })
        : role === "user"
          ? t("navbar.travelerWorkspace", {
              defaultValue: "Traveler workspace",
            })
          : null) ??
    t("navbar.welcome", { defaultValue: "Workspace" });
  const quickLinks = roleQuickLinks[role] ?? [];
  const navItems = (panelsLinks[role] ?? []).filter(
    (item) => item.type === "link" && item.path,
  );

  const activeNavItem = navItems
    .slice()
    .sort((a, b) => b.path.length - a.path.length)
    .find((item) => {
      if (item.end) {
        return location.pathname === item.path;
      }
      return (
        location.pathname === item.path ||
        location.pathname.startsWith(`${item.path}/`)
      );
    });

  const activeViewLabel = activeNavItem
    ? t(activeNavItem.labelKey, { defaultValue: activeNavItem.name ?? "" })
    : null;

  const navHint = activeViewLabel
    ? t("navbar.currentView", {
        defaultValue: `Current view: ${activeViewLabel}`,
      })
    : null;

  const handleLogout = useCallback(() => {
    setIsUserMenuOpen(false);
    setIsMobileMenuOpen(false);
    logout();
  }, [logout]);

  const goToPersonalFeed = useCallback(() => {
    if (user?.id) {
      setActiveWorkspace(user.id, "personal");
    }
    setIsUserMenuOpen(false);
    setIsMobileMenuOpen(false);
    navigate("/");
  }, [user, navigate]);

  const quickLinkLabel = (link) =>
    link.labelKey
      ? t(link.labelKey, {
          defaultValue: link.defaultLabel ?? link.label ?? "",
        })
      : link.label;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isUserMenuOpen]);

  useEffect(() => {
    if (!isUserMenuOpen) {
      if (dropdownRef.current) dropdownRef.current.style.transform = "";
      return;
    }

    const adjust = () => {
      const dd = dropdownRef.current;
      const host = userMenuRef.current;
      if (!dd || !host || typeof window === "undefined") return;

      dd.style.transform = "";

      const ddRect = dd.getBoundingClientRect();
      const vw = document.documentElement.clientWidth || window.innerWidth;
      const margin = 8;

      let shift = 0;
      if (ddRect.left < margin) {
        shift = margin - ddRect.left;
      } else if (ddRect.right > vw - margin) {
        shift = -(ddRect.right - (vw - margin));
      }

      if (shift !== 0) {
        dd.style.transform = `translateX(${shift}px)`;
      }
    };

    const t = setTimeout(adjust, 0);
    const onResize = () => setTimeout(adjust, 0);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);

    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
      if (dropdownRef.current) dropdownRef.current.style.transform = "";
    };
  }, [isUserMenuOpen]);

  return (
    <header className="navbar">
      <div className="navbar-left">
        {onToggleSidebar ? (
          <button
            className="navbar-menu"
            type="button"
            onClick={onToggleSidebar}
            aria-label={t("navbar.toggleSidebar", {
              defaultValue: "Toggle sidebar",
            })}
            aria-expanded={isSidebarOpen ? "true" : "false"}>
            <FiMenu />
          </button>
        ) : (
          <button
            className="navbar-mobile-menu-btn"
            type="button"
            onClick={() => setIsMobileMenuOpen((s) => !s)}
            aria-expanded={isMobileMenuOpen ? "true" : "false"}
            aria-label={
              isMobileMenuOpen
                ? t("navbar.closeMenu", { defaultValue: "Close menu" })
                : t("navbar.openMenu", { defaultValue: "Open menu" })
            }>
            {isMobileMenuOpen ? <FiX /> : <FiMenu />}
          </button>
        )}

        <Link
          to={brandTo}
          className="navbar-brand"
          aria-label={t("navbar.waynestHome", {
            defaultValue: "Waynest home",
          })}>
          <span className="navbar-brand-markWrap" aria-hidden="true">
            <img
              src="/images/waynest-icon.svg"
              alt=""
              className="navbar-brand-mark"
            />
          </span>
          <span className="navbar-brand-text">
            {t("common.brandName", "Waynest")}
          </span>
        </Link>

        <div className="navbar-divider" />

        <div className="navbar-title-stack">
          <div className="navbar-title">{heading}</div>
          {navHint && <div className="navbar-subtitle">{navHint}</div>}
        </div>
      </div>

      <div className="navbar-right">
        <LanguageSelector />
        <ThemeToggle />
        <div className="navbar-user-menu" ref={userMenuRef}>
          <button
            className="navbar-user"
            type="button"
            onClick={() => setIsUserMenuOpen((current) => !current)}
            aria-expanded={isUserMenuOpen ? "true" : "false"}
            aria-label={t("user.sidebar.profile", {
              defaultValue: "Open profile menu",
            })}>
            {role === "provider" && providerBrandImage ? (
              <img
                src={providerBrandImage}
                alt=""
                className="navbar-avatar navbar-avatar--img"
              />
            ) : (
              <span className="navbar-avatar" aria-hidden="true">
                {menuLetter}
              </span>
            )}
            <span className="navbar-username">{menuLabel}</span>
            <FiChevronDown
              className={`navbar-chevron${isUserMenuOpen ? " is-open" : ""}`}
            />
          </button>

          {isUserMenuOpen && (
            <div className="navbar-user-dropdown" ref={dropdownRef}>
              <div className="navbar-dropdown-header">
                <span className="navbar-dropdown-label">{menuLabel}</span>
                <span className="navbar-dropdown-role">
                  {role === "admin"
                    ? "Admin"
                    : role === "provider"
                      ? "Provider"
                      : "User"}
                </span>
              </div>
              <div className="navbar-dropdown-divider" />
              {quickLinks.map((link) => (
                <NavLink
                  key={link.labelKey ?? link.to}
                  to={link.to}
                  className="navbar-dropdown-item"
                  onClick={() => setIsUserMenuOpen(false)}>
                  <FiGrid className="navbar-dropdown-item-icon" />
                  {quickLinkLabel(link)}
                </NavLink>
              ))}
              {role === "provider" && (
                <button
                  type="button"
                  className="navbar-dropdown-item"
                  onClick={goToPersonalFeed}>
                  <FiUser className="navbar-dropdown-item-icon" />
                  {t("navbar.personalAccount", {
                    defaultValue: "Personal account",
                  })}
                </button>
              )}
              <div className="navbar-dropdown-divider" />
              <button
                className="navbar-dropdown-item navbar-dropdown-logout"
                type="button"
                onClick={handleLogout}>
                <FiLogOut className="navbar-dropdown-item-icon" />
                {t("navbar.logout")}
              </button>
            </div>
          )}
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="navbar-mobile-menu">
          <div className="navbar-mobile-menu-content">
            <div className="navbar-mobile-user">
              {role === "provider" && providerBrandImage ? (
                <img
                  src={providerBrandImage}
                  alt=""
                  className="navbar-avatar navbar-avatar--img"
                />
              ) : (
                <span className="navbar-avatar">{menuLetter}</span>
              )}
              <span className="navbar-username">{menuLabel}</span>
            </div>
            {quickLinks.map((link) => (
              <NavLink
                key={link.labelKey ?? link.to}
                to={link.to}
                className="navbar-mobile-link"
                onClick={() => setIsMobileMenuOpen(false)}>
                {quickLinkLabel(link)}
              </NavLink>
            ))}
            {role === "provider" && (
              <button
                type="button"
                className="navbar-mobile-link navbar-mobile-personal"
                onClick={goToPersonalFeed}>
                {t("navbar.personalAccount", {
                  defaultValue: "Personal account",
                })}
              </button>
            )}
            <button
              className="navbar-mobile-link navbar-mobile-logout"
              onClick={handleLogout}
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
