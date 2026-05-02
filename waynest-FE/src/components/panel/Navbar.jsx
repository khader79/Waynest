import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiChevronDown, FiX } from "react-icons/fi";
import { GiHamburgerMenu } from "react-icons/gi";
import { useAuth } from "@/context/AuthContext";
import { useProviderWorkspace } from "@/context/ProviderWorkspaceContext";
import { setActiveWorkspace } from "@/utils/activeWorkspaceStorage";
import panelsLinks from "@/utils/panelLinks";
import { resolveMediaUrl } from "@/utils/mediaUrl";
import "./Navbar.css";

const roleTitles = {
  admin: "Admin control center",
  user: "Traveler workspace",
};

const roleHomePaths = {
  admin: "/admin-panel",
  provider: "/account/provider",
  user: "/",
};

const roleQuickLinks = {
  admin: [
    { label: "Dashboard", to: "/admin-panel" },
    { label: "Users", to: "/admin-panel/users" },
    { label: "Calendar", to: "/calendar" },
  ],
  provider: [
    { label: "Profile", to: "/account/provider/settings" },
    { label: "Places", to: "/account/provider/places" },
    { label: "Calendar", to: "/calendar" },
  ],
  user: [
    { label: "Profile", to: "/profile" },
    { label: "Activities", to: "/activities" },
    { label: "Calendar", to: "/calendar" },
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
      : roleTitles[role]) ??
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
    ? t(activeNavItem.labelKey, {
        defaultValue: activeNavItem.name ?? "",
      })
    : null;

  const navHint = activeViewLabel
    ? t("navbar.currentView", {
        defaultValue: `Current view: ${activeViewLabel}`,
      })
    : null;

  const goToPersonalFeed = () => {
    if (user?.id) {
      setActiveWorkspace(user.id, "personal");
    }
    navigate("/");
  };

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

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isUserMenuOpen]);

  // Adjust dropdown position to keep it inside viewport (defensive)
  useEffect(() => {
    if (!isUserMenuOpen) {
      if (dropdownRef.current) dropdownRef.current.style.transform = "";
      return;
    }

    const adjust = () => {
      const dd = dropdownRef.current;
      const host = userMenuRef.current;
      if (!dd || !host || typeof window === "undefined") return;

      // reset
      dd.style.transform = "";

      // measure in viewport coords
      const ddRect = dd.getBoundingClientRect();
      const vw = document.documentElement.clientWidth || window.innerWidth;
      const margin = 8; // keep small gap from edge

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

    // adjust on next paint
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
            <GiHamburgerMenu />
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
            {isMobileMenuOpen ? <FiX /> : <GiHamburgerMenu />}
          </button>
        )}
        <Link to={brandTo} className="navbar-brand" aria-label="Waynest home">
          <span className="navbar-brand-markWrap" aria-hidden="true">
            <img
              src="/images/waynest icon.svg"
              alt=""
              className="navbar-brand-mark"
            />
          </span>
          <span className="navbar-brand-text">Waynest</span>
        </Link>
        <div className="navbar-title-stack">
          <div className="navbar-title">{heading}</div>
          {navHint ? <div className="navbar-subtitle">{navHint}</div> : null}
        </div>
      </div>

      <div className="navbar-right">
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
            <FiChevronDown />
          </button>
          {isUserMenuOpen ? (
            <div className="navbar-user-dropdown" ref={dropdownRef}>
              {quickLinks.map((link) => (
                <NavLink
                  key={link.labelKey ?? link.to}
                  to={link.to}
                  onClick={() => setIsUserMenuOpen(false)}>
                  {quickLinkLabel(link)}
                </NavLink>
              ))}
              {role === "provider" ? (
                <button
                  type="button"
                  className="navbar-user-personal"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    goToPersonalFeed();
                  }}>
                  {t("navbar.personalAccount", {
                    defaultValue: "Personal account",
                  })}
                </button>
              ) : null}
              <button
                className="navbar-user-logout"
                type="button"
                onClick={() => void logout()}>
                {t("navbar.logout")}
              </button>
            </div>
          ) : null}
        </div>

        <button
          className="navbar-logout"
          onClick={() => void logout()}
          type="button">
          {t("navbar.logout")}
        </button>
      </div>

      {isMobileMenuOpen ? (
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
            {role === "provider" ? (
              <button
                type="button"
                className="navbar-mobile-link navbar-mobile-personal"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  goToPersonalFeed();
                }}>
                {t("navbar.personalAccount", {
                  defaultValue: "Personal account",
                })}
              </button>
            ) : null}
            <button
              className="navbar-logout navbar-logout-mobile"
              onClick={() => {
                void logout();
                setIsMobileMenuOpen(false);
              }}
              type="button">
              {t("navbar.logout")}
            </button>
          </div>
        </div>
      ) : null}
    </header>
  );
};

export default Navbar;
