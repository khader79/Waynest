import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { IoMdClose } from "react-icons/io";
import {
  MdCalendarToday,
  MdEventNote,
  MdHome,
  MdPublic,
  MdSettings,
  MdStorefront,
} from "react-icons/md";
import panelsLinks from "@/utils/panelLinks";
import { useProviderWorkspace } from "@/context/ProviderWorkspaceContext";
import "./Sidebar.css";

const ICONS = {
  home: MdHome,
  store: MdStorefront,
  calendar: MdCalendarToday,
  event: MdEventNote,
  settings: MdSettings,
  public: MdPublic,
};

const Sidebar = ({ role, isOpen, onClose }) => {
  const { t } = useTranslation();
  const links = panelsLinks[role] ?? [];
  const { slug: providerSlug, displayName: providerDisplayName, loading: providerLoading } =
    useProviderWorkspace();

  const roleLabel =
    role === "admin"
      ? t("navbar.adminPanel", { defaultValue: "Admin Panel" })
      : role === "provider"
        ? !providerLoading && providerDisplayName?.trim()
          ? providerDisplayName.trim()
          : t("navbar.businessAccount", { defaultValue: "Business account" })
        : t("navbar.userPanel", { defaultValue: "User Panel" });

  const renderNavItem = (item, index) => {
    if (item.type === "section") {
      return (
        <div
          key={`section-${item.labelKey}-${index}`}
          className="sidebar-section-label"
          role="presentation"
        >
          {t(item.labelKey)}
        </div>
      );
    }

    if (item.type === "publicPage") {
      if (!providerSlug || role !== "provider") {
        return null;
      }
      const PublicIcon = ICONS[item.icon] ?? MdPublic;
      const label = t(item.labelKey);
      return (
        <NavLink
          key="public-page"
          to={`/p/${encodeURIComponent(providerSlug)}`}
          className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
          onClick={onClose}
        >
          <span className="sidebar-link-icon" aria-hidden>
            <PublicIcon />
          </span>
          <span className="sidebar-link-text">{label}</span>
        </NavLink>
      );
    }

    const path = item.path;
    if (!path) {
      return null;
    }
    const translatedName = item.labelKey ? t(item.labelKey, { defaultValue: item.name }) : item.name;
    const IconComponent = item.icon ? ICONS[item.icon] : null;
    const useEnd = item.end === true;

    return (
      <NavLink
        key={path}
        to={path}
        end={useEnd}
        className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
        onClick={onClose}
      >
        {IconComponent ? (
          <span className="sidebar-link-icon" aria-hidden>
            <IconComponent />
          </span>
        ) : null}
        <span className="sidebar-link-text">{translatedName}</span>
      </NavLink>
    );
  };

  return (
    <aside className={`sidebar ${isOpen ? "is-open" : ""}`}>
      <div className="sidebar-header">
        <div className="sidebar-title">{roleLabel}</div>
        <button
          type="button"
          className="sidebar-close"
          onClick={onClose}
          aria-label={t("navbar.closeSidebar", { defaultValue: "Close sidebar" })}
        >
          <IoMdClose />
        </button>
      </div>

      <nav className="sidebar-nav">
        {links.map((item, index) => renderNavItem(item, index))}
      </nav>
    </aside>
  );
};

export default Sidebar;
