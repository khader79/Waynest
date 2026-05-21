import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  FiArrowRight,
  FiCheckCircle,
  FiCompass,
  FiMapPin,
  FiStar,
  FiTrendingUp,
} from "react-icons/fi";

import { getResolvedPlaceImageUrl } from "@/utils/placeImage";

import "./AIPlaceRecommendations.css";

const truncate = (value, maxLength = 140) => {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) {
    return "";
  }
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1).trimEnd()}...`;
};

const humanizeType = (value) => {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) {
    return "Place";
  }

  return text
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(
      /(^|\s)([a-z])/g,
      (_, prefix, char) => `${prefix}${char.toUpperCase()}`,
    )
    .trim();
};

const formatPlaceType = (value, t) => {
  const raw = typeof value === "string" ? value.trim() : "";
  const key = raw.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  if (!key) {
    return t("social.ai.placeType");
  }
  const translationKey = `tripPlanner.placeTypes.${key}`;
  const translated = t(`tripPlanner.placeTypes.${key}`, {
    defaultValue: humanizeType(raw),
  });
  if (translated && translated !== translationKey) {
    return translated;
  }
  return humanizeType(raw);
};

const buildPlannerLink = (place) => {
  const searchParams = new URLSearchParams();
  const countryId = place?.city?.countryId ?? place?.city?.country?.id;
  const countryName = place?.city?.countryName ?? place?.city?.country?.name;

  if (place?.city?.id) {
    searchParams.set("cityId", place.city.id);
  }
  if (place?.city?.name) {
    searchParams.set("destination", place.city.name);
  }
  if (countryId) {
    searchParams.set("countryId", countryId);
  }
  if (countryName) {
    searchParams.set("country", countryName);
  }
  if (place?.name) {
    searchParams.set("placeName", place.name);
  }

  const query = searchParams.toString();
  return query ? `/plan?${query}` : "/plan";
};

const buildPlaceLink = (place) =>
  `/places/${encodeURIComponent(place?.slug || place?.id || "")}`;

const AIPlaceRecommendations = ({
  payload,
  loading = false,
  isAuthenticated = false,
}) => {
  const { t } = useTranslation();

  if (loading) {
    return (
      <section
        className="social-ai-picks"
        aria-label={t("social.ai.loadingTitle")}>
        <div className="social-ai-picks__header">
          <div>
            <p className="social-ai-picks__eyebrow">{t("social.ai.eyebrow")}</p>
            <h2>{t("social.ai.loadingTitle")}</h2>
          </div>
        </div>
        <div className="social-ai-picks__grid">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="social-ai-picks__skeleton" />
          ))}
        </div>
      </section>
    );
  }

  const items = Array.isArray(payload?.items) ? payload.items : [];
  if (items.length === 0) {
    return null;
  }

  const profileSignals = [
    ...(payload?.profile?.topTags ?? []).slice(0, 2),
    ...(payload?.profile?.topCities ?? []).slice(0, 1),
    ...(payload?.profile?.topTypes ?? []).slice(0, 1),
  ].filter(Boolean);

  const isPersonalized = payload?.source === "personalized";

  const confidenceLabel = {
    low: t("social.ai.confidenceLow"),
    medium: t("social.ai.confidenceMedium"),
    high: t("social.ai.confidenceHigh"),
  };

  return (
    <section
      className="social-ai-picks"
      aria-label={t("social.ai.globalTitle")}>
      <div className="social-ai-picks__header">
        <div className="social-ai-picks__copy">
          <p className="social-ai-picks__eyebrow">
            {isPersonalized ? t("social.ai.eyebrow") : t("social.ai.trending")}
          </p>
          <h2>
            {isPersonalized
              ? t("social.ai.personalizedTitle")
              : t("social.ai.globalTitle")}
          </h2>
          <p className="social-ai-picks__text">
            {isPersonalized
              ? t("social.ai.personalizedDesc")
              : t("social.ai.globalDesc")}
          </p>
        </div>

        <div className="social-ai-picks__meta">
          <span className="social-ai-picks__metaBadge">
            <FiTrendingUp aria-hidden />
            {confidenceLabel[payload?.profile?.confidence] ||
              t("social.ai.confidenceLive")}
          </span>
          {!isAuthenticated && !isPersonalized ? (
            <span className="social-ai-picks__metaHint">
              {t("social.ai.loginHint")}
            </span>
          ) : null}
        </div>
      </div>

      {profileSignals.length > 0 ? (
        <div className="social-ai-picks__signalRow">
          {profileSignals.map((signal) => (
            <span key={signal} className="social-ai-picks__signalChip">
              {signal}
            </span>
          ))}
        </div>
      ) : null}

      <div className="social-ai-picks__grid">
        {items.map((place) => {
          const imageUrl = getResolvedPlaceImageUrl(place);
          const visibleTags = Array.isArray(place.tags)
            ? place.tags.slice(0, 3)
            : [];

          return (
            <article key={place.id} className="social-ai-pick-card">
              <div
                className="social-ai-pick-card__media"
                style={
                  imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined
                }>
                <div className="social-ai-pick-card__overlay" />
                <div className="social-ai-pick-card__topline">
                  <span className="social-ai-pick-card__badge">
                    <FiCompass aria-hidden />
                    {formatPlaceType(place.type, t)}
                  </span>
                  {place.isVerified ? (
                    <span className="social-ai-pick-card__badge social-ai-pick-card__badge--verified">
                      <FiCheckCircle aria-hidden />
                      {t("social.ai.verified")}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="social-ai-pick-card__body">
                <div className="social-ai-pick-card__titleRow">
                  <div>
                    <h3>{place.name}</h3>
                    <p className="social-ai-pick-card__reason">
                      {place.reason}
                    </p>
                  </div>
                  <div className="social-ai-pick-card__rating">
                    <FiStar aria-hidden />
                    <span>{Number(place.ratingAverage || 0).toFixed(1)}</span>
                  </div>
                </div>

                <div className="social-ai-pick-card__meta">
                  <span>
                    <FiMapPin aria-hidden />
                    {[place.city?.name, place.city?.countryName]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                  {place.provider?.displayName ? (
                    <span>{place.provider.displayName}</span>
                  ) : null}
                </div>

                <p className="social-ai-pick-card__description">
                  {truncate(place.description || place.reasons?.[1] || "", 132)}
                </p>

                <div className="social-ai-pick-card__chips">
                  {(place.matchedSignals || []).slice(0, 2).map((signal) => (
                    <span
                      key={`${place.id}-${signal}`}
                      className="social-ai-pick-card__chip social-ai-pick-card__chip--match">
                      {signal}
                    </span>
                  ))}
                  {visibleTags.map((tag) => (
                    <span
                      key={tag.id || `${place.id}-${tag.name}`}
                      className="social-ai-pick-card__chip">
                      {tag.name}
                    </span>
                  ))}
                </div>

                <div className="social-ai-pick-card__actions">
                  <Link
                    to={buildPlaceLink(place)}
                    className="social-ai-pick-card__action social-ai-pick-card__action--primary">
                    {t("social.ai.viewPlace")}
                    <FiArrowRight aria-hidden />
                  </Link>
                  <Link
                    to={buildPlannerLink(place)}
                    className="social-ai-pick-card__action">
                    {t("social.ai.planCity")}
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default AIPlaceRecommendations;
