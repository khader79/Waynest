import { NavLink } from "react-router-dom";
import "./ProviderSidebarCTA.css";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";
import { FiBriefcase, FiArrowRight } from "react-icons/fi";

export const ProviderSidebarCTA = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  if (!user || user.role !== "USER") return null;

  return (
    <NavLink
      to="/account/provider/apply"
      className={({ isActive }) =>
        isActive ? "fb3-leftNavItem isActive is-cta" : "fb3-leftNavItem is-cta"
      }>
      <span className="fb3-leftNavIcon" aria-hidden>
        <FiBriefcase />
      </span>
      <span className="fb3-leftNavLabelWrap">
        <span className="fb3-leftNavLabel">
          {t("navbar.becomeProvider", { defaultValue: "Become a provider" })}
        </span>
        <span className="fb3-leftNavMeta">
          {t("sidebar.providerCtaMeta", {
            defaultValue: "List your business on Waynest",
          })}
        </span>
      </span>
      <FiArrowRight className="fb3-leftNavArrow" aria-hidden />
    </NavLink>
  );
};

export default ProviderSidebarCTA;
