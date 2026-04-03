import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiChevronDown } from "react-icons/fi";
import { GiHamburgerMenu } from "react-icons/gi";
import { useAuth } from "@/context/AuthContext";
import "./Navbar.css";

const roleTitles = {
  admin: "Admin control center",
  provider: "Provider workspace",
  user: "Traveler workspace",
};

const roleQuickLinks = {
  admin: [
    { label: "Dashboard", to: "/admin-panel" },
    { label: "Users", to: "/admin-panel/users" },
  ],
  provider: [
    { label: "Profile", to: "/provider-panel/profile" },
    { label: "Places", to: "/provider-panel/places" },
  ],
  user: [
    { label: "Profile", to: "/profile" },
    { label: "Saved plans", to: "/saved-plans" },
  ],
};

const Navbar = ({ title, role, onToggleSidebar, isSidebarOpen }) => {
  const { t } = useTranslation();
  const { logout, user } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const username = user?.username ?? "User";
  const avatarLetter = username.trim().charAt(0).toUpperCase() || "U";
  const heading = title ?? roleTitles[role] ?? t("navbar.welcome", { defaultValue: "Workspace" });
  const quickLinks = roleQuickLinks[role] ?? [];

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
        <div className="navbar-title">{heading}</div>
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
                <NavLink key={link.to} to={link.to} onClick={() => setIsUserMenuOpen(false)}>
                  {link.label}
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
                key={link.to}
                to={link.to}
                className="navbar-mobile-link"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
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
