import { Link, NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { IoMdClose } from "react-icons/io";
import {
  MdCalendarToday,
  MdEventNote,
  MdHome,
  MdPostAdd,
  MdPublic,
  MdRateReview,
  MdSettings,
  MdStorefront,
} from "react-icons/md";
import panelsLinks from "@/utils/panelLinks";
import { useProviderWorkspace } from "@/context/ProviderWorkspaceContext";
import CreditsWidget from "@/components/billing/CreditsWidget";
import "./Sidebar.css";

const ICONS = {
  home: MdHome,
  store: MdStorefront,
  calendar: MdCalendarToday,
  event: MdEventNote,
  post: MdPostAdd,
  settings: MdSettings,
  public: MdPublic,
  reviews: MdRateReview,
};

const roleHomePaths = {
  admin: "/admin-panel",
  provider: "/account/provider",
  user: "/",
};

const Sidebar = ({ role, isOpen, onClose }) => {
  const { t } = useTranslation();
  const links = panelsLinks[role] ?? [];
  const {
    slug: providerSlug,
    displayName: providerDisplayName,
    loading: providerLoading,
  } = useProviderWorkspace();
  const brandTo = roleHomePaths[role] ?? "/";

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
          to="/account/provider/public"
          className={({ isActive }) =>
            `sidebar-link${isActive ? " active" : ""}`
          }
          onClick={onClose}
        >
          <span className="sidebar-link-icon" aria-hidden>
            <PublicIcon />
          </span>
          <span className="sidebar-link-text">{label}</span>
        </NavLink>
      );
    }

    if (item.type === "reviews") {
      if (!providerSlug || role !== "provider") {
        return null;
      }
      const ReviewsIcon = ICONS[item.icon] ?? MdRateReview;
      const label = t(item.labelKey, {
        defaultValue: item.name ?? "Guest reviews",
      });
      const reviewsPath = "/account/provider/reviews";
      return (
        <NavLink
          key="provider-reviews"
          to={reviewsPath}
          className={({ isActive }) =>
            `sidebar-link${isActive ? " active" : ""}`
          }
          onClick={onClose}
        >
          <span className="sidebar-link-icon" aria-hidden>
            <ReviewsIcon />
          </span>
          <span className="sidebar-link-text">{label}</span>
        </NavLink>
      );
    }

    const path = item.path;
    if (!path) {
      return null;
    }
    const translatedName = item.labelKey
      ? t(item.labelKey, { defaultValue: item.name })
      : item.name;
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
        <Link to={brandTo} className="sidebar-brand" onClick={onClose}>
          <span className="sidebar-brand-markWrap" aria-hidden="true">
            <img
              src="/images/waynest icon.svg"
              alt=""
              className="sidebar-brand-mark"
            />
          </span>
          <span className="sidebar-brand-copy">
            <strong>Waynest</strong>
            <span>{roleLabel}</span>
          </span>
        </Link>
        <button
          type="button"
          className="sidebar-close"
          onClick={onClose}
          aria-label={t("navbar.closeSidebar", {
            defaultValue: "Close sidebar",
          })}
        >
          <IoMdClose />
        </button>
      </div>

      <nav className="sidebar-nav">
        {links.map((item, index) => renderNavItem(item, index))}
      </nav>
      <div className="sidebar-credits">
        <CreditsWidget />
      </div>
    </aside>
  );
};

export default Sidebar;
