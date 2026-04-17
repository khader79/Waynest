import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getResolvedPlaceImageUrl } from "@/utils/placeImage";
import "@/pages/provider/provider-business.css";

const placeHref = (place) => {
  const key = place?.slug || place?.id;
  return key ? `/places/${encodeURIComponent(key)}` : "#";
};

/**
 * @param {{ place: { id?: string, name?: string, slug?: string | null, city?: { name?: string } | null, latitude?: number | string, longitude?: number | string, imageUrl?: string | null, image?: string | null, coverPhotoUrl?: string | null, coverUrl?: string | null, thumbnailUrl?: string | null, photoUrl?: string | null, photo?: string | null, photos?: string[] | null } }} props
 */
const ProviderServiceCard = ({ place }) => {
  const { t } = useTranslation();
  const [failedImageUrl, setFailedImageUrl] = useState(null);
  const navigate = useNavigate();
  const name = place?.name ?? "Place";
  const city = place?.city?.name;
  const dest = placeHref(place);
  const lat = Number(place?.latitude);
  const lng = Number(place?.longitude);

  const resolvedPlaceImageUrl = useMemo(
    () => getResolvedPlaceImageUrl(place),
    [place],
  );

  const showPlaceImage =
    Boolean(resolvedPlaceImageUrl) && failedImageUrl !== resolvedPlaceImageUrl;

  const mapHref =
    Number.isFinite(lat) && Number.isFinite(lng)
      ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=14/${lat}/${lng}`
      : null;

  const detailLabel = t("provider.business.viewPlaceDetails", {
    defaultValue: "View place details",
  });

  return (
    <article className="provider-service-card-wrap">
      {dest !== "#" ? (
        <button
          type="button"
          className="provider-service-card__hit-area"
          onClick={() => navigate(dest)}
          aria-label={`${detailLabel}: ${name}`}
        />
      ) : null}
      <div className="provider-service-card__surface">
        <div className="provider-service-card__media">
          {showPlaceImage ? (
            <img
              className="provider-service-card__media-image"
              src={resolvedPlaceImageUrl}
              alt={name}
              loading="lazy"
              onError={() => setFailedImageUrl(resolvedPlaceImageUrl)}
            />
          ) : (
            <div
              className="provider-service-card__media-fallback"
              role="img"
              aria-label={name}>
              <span>{name}</span>
            </div>
          )}
        </div>
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
