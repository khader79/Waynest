import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useProviderPlacesData } from "../../hooks/useProviderPlacesData";
import "../../providerPanel.css";

const ProviderPlaces = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { loading, notFound, places } = useProviderPlacesData();

  if (notFound) {
    return (
      <div className="provider-panel-empty">{t("provider.common.notSetup")}</div>
    );
  }

  return (
    <div className="provider-panel-page">
      <div className="provider-panel-header">
        <h1 className="provider-panel-title">{t("provider.places.title")}</h1>
        <button
          type="button"
          onClick={() => navigate("/admin/places")}
          className="provider-panel-action">
          {t("provider.places.actions.editPlaces")}
        </button>
      </div>

      {loading ? (
        <div className="provider-panel-places-grid">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="provider-panel-skeleton provider-panel-skeleton-place"
            />
          ))}
        </div>
      ) : places.length === 0 ? (
        <div className="provider-panel-empty provider-panel-empty-compact">
          {t("provider.places.empty")}
        </div>
      ) : (
        <div className="provider-panel-places-grid">
          {places.map((place) => (
            <article key={place.id} className="provider-panel-place-card">
              {place.imageUrl ? (
                <img
                  src={place.imageUrl}
                  alt={place.name}
                  className="provider-panel-place-image"
                />
              ) : (
                <div className="provider-panel-place-image provider-panel-place-image-placeholder" />
              )}
              <div className="provider-panel-place-body">
                <strong className="provider-panel-place-name">{place.name}</strong>
                <div className="provider-panel-place-meta">
                  {t("provider.places.typeAndRating", {
                    rating: place.ratingAverage.toFixed(1),
                    type: place.type,
                  })}
                </div>
                <span
                  className={`provider-panel-status ${place.isActive ? "is-active" : "is-inactive"}`}>
                  {place.isActive
                    ? t("provider.common.active")
                    : t("provider.common.inactive")}
                </span>
                <button
                  type="button"
                  onClick={() => navigate("/admin/places")}
                  className="provider-panel-action provider-panel-action-secondary">
                  {t("provider.places.actions.editPlace")}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProviderPlaces;
