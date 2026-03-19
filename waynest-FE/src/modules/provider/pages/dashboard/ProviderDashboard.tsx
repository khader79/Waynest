import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useProviderDashboardData } from "../../hooks/useProviderDashboardData";
import "../../providerPanel.css";

const ProviderDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { loading, notFound, provider, stats } = useProviderDashboardData();

  if (notFound) {
    return (
      <div className="provider-panel-empty">{t("provider.common.notSetup")}</div>
    );
  }

  const metrics = stats ?? {
    averageRating: 0,
    totalBookings: 0,
    totalPlaces: 0,
    totalReviews: 0,
  };

  return (
    <div className="provider-panel-page">
      <div className="provider-panel-header">
        <h1 className="provider-panel-title">
          {provider?.displayName ?? t("provider.dashboard.defaultTitle")}
        </h1>
        {provider && (
          <span
            className={`provider-panel-status ${provider.isActive ? "is-active" : "is-inactive"}`}>
            {provider.isActive
              ? t("provider.common.active")
              : t("provider.common.inactive")}
          </span>
        )}
      </div>

      <div className="provider-panel-metrics">
        {loading
          ? Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="provider-panel-skeleton provider-panel-skeleton-metric"
              />
            ))
          : [
              {
                label: t("provider.dashboard.metrics.totalPlaces"),
                value: metrics.totalPlaces,
              },
              {
                label: t("provider.dashboard.metrics.totalBookings"),
                value: metrics.totalBookings,
              },
              {
                label: t("provider.dashboard.metrics.totalReviews"),
                value: metrics.totalReviews,
              },
              {
                label: t("provider.dashboard.metrics.averageRating"),
                value: `${metrics.averageRating.toFixed(1)} ★`,
              },
            ].map((metric) => (
              <div key={metric.label} className="provider-panel-metric-card">
                <span className="provider-panel-metric-label">{metric.label}</span>
                <strong className="provider-panel-metric-value">
                  {metric.value}
                </strong>
              </div>
            ))}
      </div>

      <div className="provider-panel-actions">
        <button
          type="button"
          className="provider-panel-action"
          onClick={() => navigate("/provider-panel/places")}>
          {t("provider.dashboard.actions.managePlaces")}
        </button>
        <button
          type="button"
          className="provider-panel-action"
          onClick={() => navigate("/provider-panel/bookings")}>
          {t("provider.dashboard.actions.viewBookings")}
        </button>
        <button
          type="button"
          className="provider-panel-action"
          onClick={() => navigate("/provider-panel/profile")}>
          {t("provider.dashboard.actions.profile")}
        </button>
      </div>
    </div>
  );
};

export default ProviderDashboard;
