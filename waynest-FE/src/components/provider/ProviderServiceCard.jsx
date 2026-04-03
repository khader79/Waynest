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

  return (
    <article className="provider-service-card-wrap">
      <Link className="provider-service-card" to={dest}>
        <h3 className="provider-service-card__name">{name}</h3>
        {city ? <p className="provider-service-card__meta">{city}</p> : null}
      </Link>
      <div className="provider-service-card__actions">
        {mapHref ? (
          <a
            className="provider-service-card__link"
            href={mapHref}
            target="_blank"
            rel="noreferrer"
          >
            {t("provider.business.viewMap", { defaultValue: "Map" })}
          </a>
        ) : null}
        <Link
          className="provider-service-card__cta"
          to={isAuthenticated ? dest : loginHref}
          state={isAuthenticated ? undefined : { from: location.pathname }}
        >
          {t("provider.business.bookNow", { defaultValue: "Book" })}
        </Link>
      </div>
    </article>
  );
};

export default ProviderServiceCard;
