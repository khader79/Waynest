import { useState, useEffect, useRef, useMemo } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { IoMdClose } from "react-icons/io";
import { FiSearch, FiChevronDown, FiChevronRight } from "react-icons/fi";
import {
  MdAttachMoney,
  MdCalendarToday,
  MdChecklist,
  MdEventNote,
  MdHome,
  MdPostAdd,
  MdPublic,
  MdRateReview,
  MdSettings,
  MdStorefront,
  MdPeople,
  MdVerifiedUser,
  MdLocalOffer,
  MdLocationCity,
} from "react-icons/md";
import panelsLinks from "@/utils/panelLinks";
import { useProviderWorkspace } from "@/context/ProviderWorkspaceContext";
import CreditsWidget from "@/components/billing/CreditsWidget";
import "./Sidebar.css";

const ICONS = {
  home: MdHome,
  store: MdStorefront,
  people: MdPeople,
  locationcity: MdLocationCity,
  localoffer: MdLocalOffer,
  calendar: MdCalendarToday,
  event: MdEventNote,
  post: MdPostAdd,
  settings: MdSettings,
  public: MdPublic,
  reviews: MdRateReview,
  billing: MdAttachMoney,
  applications: MdChecklist,
  verification: MdVerifiedUser,
};

const inferIconFor = (item) => {
  if (!item) return MdHome;
  const key = (item.icon || item.name || item.path || "")
    .toString()
    .toLowerCase();

  // Path-first matching for admin routes
  if (
    key === "/admin-panel" ||
    key.includes("dashboard") ||
    key.includes("home")
  )
    return MdHome;
  if (key.includes("/admin-panel/users") || key.includes("users"))
    return MdPeople;
  if (key.includes("/admin-panel/providers") || key.includes("providers"))
    return MdStorefront;
  if (
    key.includes("/admin-panel/places") ||
    key.includes("/places") ||
    key.includes("places")
  )
    return MdStorefront;
  if (key.includes("/admin-panel/events") || key.includes("events"))
    return MdEventNote;
  if (key.includes("/admin-panel/tags") || key.includes("tag"))
    return MdLocalOffer;
  if (key.includes("/admin-panel/reviews") || key.includes("reviews"))
    return MdRateReview;
  if (key.includes("/admin-panel/billing") || key.includes("billing"))
    return MdAttachMoney;
  if (key.includes("place-pricing") || key.includes("pricing"))
    return MdAttachMoney;
  if (key.includes("opening-hours") || key.includes("opening"))
    return MdCalendarToday;
  if (key.includes("provider-applications") || key.includes("applications"))
    return MdChecklist;
  if (key.includes("provider-verification") || key.includes("verification"))
    return MdVerifiedUser;
  if (key.includes("countries") || key.includes("country")) return MdPublic;
  if (key.includes("cities") || key.includes("city")) return MdLocationCity;
  if (key.includes("currencies") || key.includes("currency"))
    return MdAttachMoney;
  if (key.includes("settings")) return MdSettings;

  return MdHome;
};

const roleHomePaths = {
  admin: "/admin-panel",
  provider: "/account/provider",
  user: "/",
};

const Sidebar = ({
  role,
  isOpen,
  onClose,
  collapsed = false,
  onToggleCollapse,
}) => {
  const { t } = useTranslation();
  const location = useLocation();
  const links = panelsLinks[role] ?? [];
  const {
    slug: providerSlug,
    displayName: providerDisplayName,
    loading: providerLoading,
  } = useProviderWorkspace();
  const brandTo = roleHomePaths[role] ?? "/";
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef(null);
  const sidebarRef = useRef(null);

  useEffect(() => {
    if (collapsed && searchQuery) {
      setSearchQuery("");
    }
  }, [collapsed, searchQuery]);

  useEffect(() => {
    if (isOpen) {
      const handleKeyDown = (e) => {
        if (e.key === "Escape") {
          onClose();
        }
      };
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  const roleLabel =
    role === "admin"
      ? t("navbar.adminPanel", { defaultValue: "Admin Panel" })
      : role === "provider"
        ? !providerLoading && providerDisplayName?.trim()
          ? providerDisplayName.trim()
          : t("navbar.businessAccount", { defaultValue: "Business account" })
        : t("navbar.userPanel", { defaultValue: "User Panel" });

  const filteredLinks = useMemo(() => {
    if (!searchQuery) return links;
    const q = searchQuery.toLowerCase();
    return links.filter((item) => {
      if (item.type === "section") return false;
      const name = (item.name || t(item.labelKey || "") || "").toLowerCase();
      return name.includes(q);
    });
  }, [links, searchQuery, t]);

  const renderNavItem = (item, index) => {
    if (item.type === "section") {
      return (
        <div
          key={`section-${item.labelKey}-${index}`}
          className="sidebar-section-label"
          role="presentation">
          {t(item.labelKey)}
        </div>
      );
    }

    if (item.type === "publicPage") {
      if (!providerSlug || role !== "provider") return null;
      const PublicIcon = ICONS[item.icon] ?? MdPublic;
      const label = t(item.labelKey);
      return (
        <NavLink
          key="public-page"
          to="/account/provider/public"
          className={({ isActive }) =>
            `sidebar-link${isActive ? " active" : ""}`
          }
          onClick={onClose}>
          <span className="sidebar-link-icon" aria-hidden>
            <PublicIcon />
          </span>
          {!collapsed && <span className="sidebar-link-text">{label}</span>}
        </NavLink>
      );
    }

    if (item.type === "reviews") {
      if (!providerSlug || role !== "provider") return null;
      const ReviewsIcon = ICONS[item.icon] ?? MdRateReview;
      const label = t(item.labelKey, {
        defaultValue: item.name ?? "Guest reviews",
      });
      return (
        <NavLink
          key="provider-reviews"
          to="/account/provider/reviews"
          className={({ isActive }) =>
            `sidebar-link${isActive ? " active" : ""}`
          }
          onClick={onClose}>
          <span className="sidebar-link-icon" aria-hidden>
            <ReviewsIcon />
          </span>
          {!collapsed && <span className="sidebar-link-text">{label}</span>}
        </NavLink>
      );
    }

    const path = item.path;
    if (!path) return null;

    const translatedName = item.labelKey
      ? t(item.labelKey, { defaultValue: item.name })
      : item.name;
    const IconComponent = item.icon ? ICONS[item.icon] : inferIconFor(item);
    const useEnd = item.end === true;
    const isActiveRoute = useEnd
      ? location.pathname === path
      : location.pathname === path || location.pathname.startsWith(`${path}/`);

    return (
      <NavLink
        key={path}
        to={path}
        end={useEnd}
        className={`sidebar-link${isActiveRoute ? " active" : ""}`}
        onClick={onClose}
        title={collapsed ? translatedName : undefined}>
        {IconComponent ? (
          <span className="sidebar-link-icon" aria-hidden>
            <IconComponent />
          </span>
        ) : null}
        {!collapsed && (
          <span className="sidebar-link-text">{translatedName}</span>
        )}
        {isActiveRoute && <span className="sidebar-link-active-indicator" />}
      </NavLink>
    );
  };

  return (
    <aside
      ref={sidebarRef}
      className={`sidebar${isOpen ? " is-open" : ""}${collapsed ? " sidebar--collapsed" : ""}`}
      role="navigation"
      aria-label={t("navbar.sidebar", { defaultValue: "Sidebar navigation" })}>
      {/* Header */}
      <div className="sidebar-header">
        <Link to={brandTo} className="sidebar-brand" onClick={onClose}>
          <span className="sidebar-brand-markWrap" aria-hidden="true">
            <img
              src="/images/waynest icon.svg"
              alt=""
              className="sidebar-brand-mark"
            />
          </span>
          {!collapsed && (
            <span className="sidebar-brand-copy">
              <strong>{t("common.brandName")}</strong>
              <span>{roleLabel}</span>
            </span>
          )}
        </Link>
        <button
          type="button"
          className="sidebar-close"
          onClick={onClose}
          aria-label={t("navbar.closeSidebar", {
            defaultValue: "Close sidebar",
          })}>
          <IoMdClose />
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        type="button"
        className="sidebar-collapse-btn"
        onClick={() => onToggleCollapse && onToggleCollapse()}
        aria-label={
          collapsed
            ? t("navbar.expandSidebar", { defaultValue: "Expand sidebar" })
            : t("navbar.collapseSidebar", { defaultValue: "Collapse sidebar" })
        }
        title={
          collapsed
            ? t("navbar.expandSidebar", { defaultValue: "Expand" })
            : t("navbar.collapseSidebar", { defaultValue: "Collapse" })
        }>
        <FiChevronRight className="sidebar-collapse-icon" />
      </button>

      {/* Search */}
      {!collapsed && (
        <div className="sidebar-search">
          <FiSearch className="sidebar-search-icon" />
          <input
            ref={searchInputRef}
            type="text"
            className="sidebar-search-input"
            placeholder={t("navbar.searchNav", { defaultValue: "Search..." })}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label={t("navbar.searchNav", {
              defaultValue: "Search navigation",
            })}
          />
          {searchQuery && (
            <button
              type="button"
              className="sidebar-search-clear"
              onClick={() => setSearchQuery("")}
              aria-label={t("common.clear", { defaultValue: "Clear" })}>
              <IoMdClose />
            </button>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="sidebar-nav">
        {searchQuery && filteredLinks.length === 0 ? (
          <div className="sidebar-search-empty">
            {t("navbar.noResults", { defaultValue: "No results found" })}
          </div>
        ) : (
          (searchQuery ? filteredLinks : links).map((item, index) =>
            renderNavItem(item, index),
          )
        )}
      </nav>

      {!collapsed && (
        <div className="sidebar-credits">
          <CreditsWidget />
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
