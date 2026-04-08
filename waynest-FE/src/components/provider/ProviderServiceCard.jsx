import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import "@/pages/provider/provider-business.css";

const placeHref = (place) => {
  const key = place?.slug || place?.id;
  return key ? `/places/${encodeURIComponent(key)}` : "#";
};

/**
 * @param {{ place: { id?: string, name?: string, slug?: string | null, city?: { name?: string } | null, latitude?: number, longitude?: number } }} props
 */
const ProviderServiceCard = ({ place }) => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const name = place?.name ?? "Place";
  const city = place?.city?.name;
  const dest = placeHref(place);
  const loginHref = "/login";
  const lat = place?.latitude;
  const lng = place?.longitude;
  const mapHref =
    typeof lat === "number" && typeof lng === "number"
      ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=14/${lat}/${lng}`
      : null;

  const detailLabel = t("provider.business.viewPlaceDetails", {
    defaultValue: "View place details",
  });

  return (
    <article className="provider-service-card-wrap">
      {dest !== "#" ? (
        <Link
          className="provider-service-card__hit-area"
          to={dest}
          aria-label={`${detailLabel}: ${name}`}
        />
      ) : null}
      <div className="provider-service-card__surface">
        <div className="provider-service-card">
          <h3 className="provider-service-card__name">{name}</h3>
          {city ? <p className="provider-service-card__meta">{city}</p> : null}
        </div>
        <div className="provider-service-card__actions">
          {mapHref ? (
            <button
              type="button"
              className="provider-service-card__link"
              onClick={() =>
                window.open(mapHref, "_blank", "noopener,noreferrer")
              }>
              {t("provider.business.viewMap", { defaultValue: "Map" })}
            </button>
          ) : null}
          <button
            type="button"
            className="provider-service-card__cta"
            disabled
            aria-disabled="true"
            title={t("provider.business.bookNowComingSoon", {
              defaultValue: "Book (Coming soon)",
            })}>
            {t("provider.business.bookNowComingSoon", {
              defaultValue: "Book (Coming soon)",
            })}
          </button>
        </div>
      </div>
    </article>
  );
};

export default ProviderServiceCard;
