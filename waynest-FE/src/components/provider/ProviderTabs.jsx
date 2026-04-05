import { useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "@/pages/provider/provider-business.css";

/** Base path for /p/:slug, /provider/:param, /account/provider/public */
function providerBusinessBasePath(pathname) {
  const p = pathname.replace(/\/$/, "");
  const match =
    p.match(/^(\/p\/[^/]+)/) ||
    p.match(/^(\/provider\/[^/]+)/) ||
    p.match(/^(\/account\/provider\/public)/);
  return match ? match[1] : "";
}

/**
 * @param {{
 *   mode?: 'nav' | 'tabs',
 *   value?: 'overview' | 'places' | 'events' | 'reviews',
 *   onChange?: (next: 'overview' | 'places' | 'events' | 'reviews') => void,
 * }} props
 */
const ProviderTabs = ({ mode = "nav", value = "overview", onChange }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const basePath = useMemo(() => providerBusinessBasePath(location.pathname), [location.pathname]);

  const items = [
    {
      id: "overview",
      label: t("provider.business.tabOverview", { defaultValue: "Overview" }),
    },
    {
      id: "places",
      label: t("provider.business.tabServices", { defaultValue: "Places" }),
    },
    {
      id: "events",
      label: t("provider.business.tabEvents", { defaultValue: "Events" }),
    },
    {
      id: "reviews",
      label: t("provider.business.tabReviews", { defaultValue: "Guest feedback" }),
    },
  ];

  if (mode === "tabs" && typeof onChange === "function") {
    return (
      <nav
        className="provider-tabs provider-tabs--state"
        role="tablist"
        aria-label={t("provider.business.tabsAria", { defaultValue: "Business page sections" })}
      >
        {items.map((item) => {
          const selected = value === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              id={`provider-tab-${item.id}`}
              className={`provider-tabs__link${selected ? " provider-tabs__link--active" : ""}`}
              onClick={() => onChange(/** @type {'overview' | 'places' | 'events' | 'reviews'} */ (item.id))}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    );
  }

  if (!basePath) {
    return (
      <nav className="provider-tabs" aria-label="Provider sections">
        <NavLink
          to="."
          end
          className={({ isActive }) =>
            `provider-tabs__link${isActive ? " provider-tabs__link--active" : ""}`
          }
        >
          {items[0].label}
        </NavLink>
        <NavLink
          to="places"
          className={({ isActive }) =>
            `provider-tabs__link${isActive ? " provider-tabs__link--active" : ""}`
          }
        >
          {items[1].label}
        </NavLink>
        <NavLink
          to="events"
          className={({ isActive }) =>
            `provider-tabs__link${isActive ? " provider-tabs__link--active" : ""}`
          }
        >
          {items[2].label}
        </NavLink>
        <NavLink
          to="reviews"
          className={({ isActive }) =>
            `provider-tabs__link${isActive ? " provider-tabs__link--active" : ""}`
          }
        >
          {items[3].label}
        </NavLink>
      </nav>
    );
  }

  return (
    <nav className="provider-tabs" aria-label="Provider sections">
      <NavLink
        to={basePath}
        end
        className={({ isActive }) =>
          `provider-tabs__link${isActive ? " provider-tabs__link--active" : ""}`
        }
      >
        {items[0].label}
      </NavLink>
      <NavLink
        to={`${basePath}/places`}
        className={({ isActive }) =>
          `provider-tabs__link${isActive ? " provider-tabs__link--active" : ""}`
        }
      >
        {items[1].label}
      </NavLink>
      <NavLink
        to={`${basePath}/events`}
        className={({ isActive }) =>
          `provider-tabs__link${isActive ? " provider-tabs__link--active" : ""}`
        }
      >
        {items[2].label}
      </NavLink>
      <NavLink
        to={`${basePath}/reviews`}
        className={({ isActive }) =>
          `provider-tabs__link${isActive ? " provider-tabs__link--active" : ""}`
        }
      >
        {items[3].label}
      </NavLink>
    </nav>
  );
};

export default ProviderTabs;
