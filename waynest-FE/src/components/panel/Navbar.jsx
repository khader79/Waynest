import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiChevronDown } from "react-icons/fi";
import { GiHamburgerMenu } from "react-icons/gi";
import { useAuth } from "@/context/AuthContext";
import { useProviderWorkspace } from "@/context/ProviderWorkspaceContext";
import "./Navbar.css";

const roleTitles = {
  admin: "Admin control center",
  user: "Traveler workspace",
};

const roleQuickLinks = {
  admin: [
    { label: "Dashboard", to: "/admin-panel" },
    { label: "Users", to: "/admin-panel/users" },
  ],
  provider: [
    {
      labelKey: "navbar.backToFeed",
      to: "/",
      defaultLabel: "Back to feed",
    },
    { label: "Profile", to: "/account/provider/settings" },
    { label: "Places", to: "/account/provider/places" },
  ],
  user: [
    { label: "Profile", to: "/profile" },
    { label: "Saved plans", to: "/saved-plans" },
  ],
};

const Navbar = ({ title, role, onToggleSidebar, isSidebarOpen }) => {
  const { t } = useTranslation();
  const { logout, user } = useAuth();
  const providerWorkspace = useProviderWorkspace();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const username = user?.username ?? "User";
  const avatarLetter = username.trim().charAt(0).toUpperCase() || "U";
  const heading =
    title ??
    (role === "provider"
      ? t("navbar.businessAccount", { defaultValue: "Business account" })
      : roleTitles[role]) ??
    t("navbar.welcome", { defaultValue: "Workspace" });
  const providerSubtitle =
    role === "provider" &&
    !providerWorkspace.loading &&
    typeof providerWorkspace.displayName === "string" &&
    providerWorkspace.displayName.trim()
      ? providerWorkspace.displayName.trim()
      : null;
  const quickLinks = roleQuickLinks[role] ?? [];

  const quickLinkLabel = (link) =>
    link.labelKey
      ? t(link.labelKey, { defaultValue: link.defaultLabel ?? link.label ?? "" })
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

  return (
    <header className="navbar">
      <div className="navbar-left">
        {onToggleSidebar ? (
          <button
            className="navbar-menu"
            type="button"
            onClick={onToggleSidebar}
            aria-label={t("navbar.toggleSidebar", { defaultValue: "Toggle sidebar" })}
            aria-expanded={isSidebarOpen ? "true" : "false"}
          >
            <GiHamburgerMenu />
          </button>
        ) : null}
        <div className="navbar-title-stack">
          <div className="navbar-title">{heading}</div>
          {providerSubtitle ? (
            <div className="navbar-subtitle" title={providerSubtitle}>
              {providerSubtitle}
            </div>
          ) : null}
        </div>
        {role === "provider" ? (
          <NavLink className="navbar-exit-feed" to="/" end>
            {t("navbar.backToFeed", { defaultValue: "Back to feed" })}
          </NavLink>
        ) : null}
      </div>

      <div className="navbar-right">
        <div className="navbar-user-menu" ref={userMenuRef}>
          <button
            className="navbar-user"
            type="button"
            onClick={() => setIsUserMenuOpen((current) => !current)}
            aria-expanded={isUserMenuOpen ? "true" : "false"}
            aria-label={t("user.sidebar.profile", { defaultValue: "Open profile menu" })}
          >
            <span className="navbar-avatar" aria-hidden="true">
              {avatarLetter}
            </span>
            <span className="navbar-username">{username}</span>
            <FiChevronDown />
          </button>
          {isUserMenuOpen ? (
            <div className="navbar-user-dropdown">
              {quickLinks.map((link) => (
                <NavLink
                  key={link.labelKey ?? link.to}
                  to={link.to}
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  {quickLinkLabel(link)}
                </NavLink>
              ))}
              <button className="navbar-user-logout" type="button" onClick={() => void logout()}>
                {t("navbar.logout")}
              </button>
            </div>
          ) : null}
        </div>

        <button className="navbar-logout" onClick={() => void logout()} type="button">
          {t("navbar.logout")}
        </button>
      </div>

      <button
        className="navbar-mobile-menu-btn"
        type="button"
        onClick={() => setIsMobileMenuOpen((current) => !current)}
        aria-label="Toggle mobile menu"
        aria-expanded={isMobileMenuOpen ? "true" : "false"}
      >
        <GiHamburgerMenu />
      </button>

      {isMobileMenuOpen ? (
        <div className="navbar-mobile-menu">
          <div className="navbar-mobile-menu-content">
            <div className="navbar-mobile-user">
              <span className="navbar-avatar">{avatarLetter}</span>
              <span className="navbar-username">{username}</span>
            </div>
            {quickLinks.map((link) => (
              <NavLink
                key={link.labelKey ?? link.to}
                to={link.to}
                className="navbar-mobile-link"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {quickLinkLabel(link)}
              </NavLink>
            ))}
            <button
              className="navbar-logout navbar-logout-mobile"
              onClick={() => {
                void logout();
                setIsMobileMenuOpen(false);
              }}
              type="button"
            >
              {t("navbar.logout")}
            </button>
          </div>
        </div>
      ) : null}
    </header>
  );
};

export default Navbar;
