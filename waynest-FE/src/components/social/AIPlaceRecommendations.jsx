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

const formatPlaceType = (value) => {
  const text = typeof value === "string" ? value.trim().replace(/_/g, " ") : "";
  if (!text) {
    return "Place";
  }
  return `${text.charAt(0)}${text.slice(1).toLowerCase()}`;
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

const confidenceLabel = {
  low: "Early signal",
  medium: "Solid signal",
  high: "Strong signal",
};

const AIPlaceRecommendations = ({
  payload,
  loading = false,
  isAuthenticated = false,
}) => {
  const { t } = useTranslation();
  if (loading) {
    return (
      <section className="social-ai-picks" aria-label={t("aria.social.aiPlacePicksLoading")}>
        <div className="social-ai-picks__header">
          <div>
            <p className="social-ai-picks__eyebrow">AI discovery layer</p>
            <h2>Finding your next stop</h2>
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

  return (
    <section className="social-ai-picks" aria-label={t("aria.social.aiPlacePicks")}>
      <div className="social-ai-picks__header">
        <div className="social-ai-picks__copy">
          <p className="social-ai-picks__eyebrow">
            {isPersonalized ? "AI discovery layer" : "Trending now"}
          </p>
          <h2>
            {isPersonalized
              ? "Places the system thinks you'll actually love"
              : "High-signal places worth exploring"}
          </h2>
          <p className="social-ai-picks__text">
            {isPersonalized
              ? "These suggestions blend your saves, likes, follows, and trip activity into one recommendation stream."
              : "These picks are ranked from quality, verification, and what is performing well across Waynest right now."}
          </p>
        </div>

        <div className="social-ai-picks__meta">
          <span className="social-ai-picks__metaBadge">
            <FiTrendingUp aria-hidden />
            {confidenceLabel[payload?.profile?.confidence] || "Live signal"}
          </span>
          {!isAuthenticated && !isPersonalized ? (
            <span className="social-ai-picks__metaHint">
              Log in to unlock recommendations shaped by your activity.
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
                    {formatPlaceType(place.type)}
                  </span>
                  {place.isVerified ? (
                    <span className="social-ai-pick-card__badge social-ai-pick-card__badge--verified">
                      <FiCheckCircle aria-hidden />
                      Verified
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="social-ai-pick-card__body">
                <div className="social-ai-pick-card__titleRow">
                  <div>
                    <h3>{place.name}</h3>
                    <p className="social-ai-pick-card__reason">{place.reason}</p>
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
                    View place
                    <FiArrowRight aria-hidden />
                  </Link>
                  <Link
                    to={buildPlannerLink(place)}
                    className="social-ai-pick-card__action">
                    Plan this city
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
