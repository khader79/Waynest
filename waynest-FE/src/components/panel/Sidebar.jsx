import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { IoMdClose } from "react-icons/io";
import panelsLinks from "@/utils/panelLinks";
import "./Sidebar.css";

const Sidebar = ({ role, isOpen, onClose }) => {
  const { t } = useTranslation();
  const links = panelsLinks[role] ?? [];

  const roleLabel = role === "admin"
    ? t("navbar.adminPanel", { defaultValue: "Admin Panel" })
    : role === "provider"
      ? t("navbar.providerPanel", { defaultValue: "Provider Panel" })
      : t("navbar.userPanel", { defaultValue: "User Panel" });

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
        {links.map((link) => {
          const translatedName = link.labelKey
            ? t(link.labelKey, { defaultValue: link.name })
            : link.name;

          return (
            <NavLink
              key={link.path}
              to={link.path}
              end
              className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
              onClick={onClose}
            >
              {translatedName}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
