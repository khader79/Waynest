import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "@/pages/provider/provider-business.css";

const ProviderTabs = () => {
  const { t } = useTranslation();

  return (
    <nav className="provider-tabs" aria-label="Provider sections">
      <NavLink
        to="."
        end
        className={({ isActive }) =>
          `provider-tabs__link${isActive ? " provider-tabs__link--active" : ""}`
        }
      >
        {t("provider.business.tabOverview", { defaultValue: "Overview" })}
      </NavLink>
      <NavLink
        to="services"
        className={({ isActive }) =>
          `provider-tabs__link${isActive ? " provider-tabs__link--active" : ""}`
        }
      >
        {t("provider.business.tabServices", { defaultValue: "Places" })}
      </NavLink>
      <NavLink
        to="reviews"
        className={({ isActive }) =>
          `provider-tabs__link${isActive ? " provider-tabs__link--active" : ""}`
        }
      >
        {t("provider.business.tabReviews", { defaultValue: "Reviews" })}
      </NavLink>
    </nav>
  );
};

export default ProviderTabs;
