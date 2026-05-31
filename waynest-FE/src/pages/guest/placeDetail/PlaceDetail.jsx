import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FiArrowLeft,
  FiCalendar,
  FiMapPin,
  FiStar,
  FiHeart,
  FiSend,
  FiClock,
  FiExternalLink,
} from "react-icons/fi";
import VerifiedBadge from "@/components/common/VerifiedBadge/VerifiedBadge";
import { fetchPlaceById } from "@/api/catalog";
import { createCalendarEntry } from "@/api/calendar";
import { useCurrency } from "@/context/CurrencyContext";
import formatCurrency, { convertAmount } from "@/utils/currency";
import { useAuth } from "@/context/AuthContext";
import {
  addWishlistItem,
  checkWishlistItem,
  removeWishlistItem,
} from "@/api/user";
import FeedbackSection from "@/components/public/feedback/FeedbackSection";
import { getResolvedPlaceImageUrl } from "@/utils/placeImage";
import { getApiErrorMessage, getApiErrorStatus } from "@/utils/errors";
import FallbackImage from "@/components/Image/FallbackImage";
import "./PlaceDetail.css";

const TYPE_ICONS = {
  ACTIVITY: "📍",
  RESTAURANT: "🍽️",
  CAFE: "☕",
  HOTEL: "🏨",
  LANDMARK: "🏛️",
  PARK: "🌿",
  SHOP: "🛍️",
  TOUR: "🧭",
};

const DAY_LABEL_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const PLACE_TYPE_LABEL_KEYS = {
  ACTIVITY: "attraction",
  CAFE: "cafe",
  HOTEL: "hotel",
  LANDMARK: "landmark",
  PARK: "park",
  RESTAURANT: "restaurant",
  SHOP: "shop",
  TOUR: "tour",
};

const toFiniteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getPlaceMapPoint = (place) => {
  const latitude = toFiniteNumber(place?.latitude ?? place?.lat);
  const longitude = toFiniteNumber(
    place?.longitude ?? place?.lng ?? place?.lon,
  );
  if (latitude != null && longitude != null) {
    return { latitude, longitude };
  }

  const cityLatitude = toFiniteNumber(place?.city?.latitude);
  const cityLongitude = toFiniteNumber(place?.city?.longitude);
  if (cityLatitude != null && cityLongitude != null) {
    return { latitude: cityLatitude, longitude: cityLongitude };
  }

  return null;
};

const getOpenStreetMapEmbedUrl = (point) => {
  if (!point) {
    return null;
  }

  const bbox = `${point.longitude - 0.02},${point.latitude - 0.015},${point.longitude + 0.02},${point.latitude + 0.015}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(`${point.latitude},${point.longitude}`)}`;
};

const getOpenStreetMapUrl = (point) => {
  if (!point) {
    return null;
  }

  return `https://www.openstreetmap.org/?mlat=${point.latitude}&mlon=${point.longitude}#map=15/${point.latitude}/${point.longitude}`;
};

const normalizeOpeningHours = (place) => {
  const source = Array.isArray(place?.openingHours)
    ? place.openingHours
    : Array.isArray(place?.opening_hours)
      ? place.opening_hours
      : [];

  return source
    .map((row) => {
      const day = Number(row?.dayOfWeek ?? row?.day ?? row?.weekday);
      const openTime =
        typeof row?.openTime === "string"
          ? row.openTime
          : typeof row?.opensAt === "string"
            ? row.opensAt
            : "";
      const closeTime =
        typeof row?.closeTime === "string"
          ? row.closeTime
          : typeof row?.closesAt === "string"
            ? row.closesAt
            : "";
      const closed =
        row?.closed === true ||
        row?.isClosed === true ||
        (!openTime.trim() && !closeTime.trim());

      return {
        day,
        openTime,
        closeTime,
        closed,
      };
    })
    .filter((row) => row.day >= 0 && row.day <= 6)
    .sort((a, b) => a.day - b.day);
};

const compactTime = (raw) => {
  if (typeof raw !== "string") {
    return "";
  }
  return raw.length >= 5 ? raw.slice(0, 5) : raw;
};

const toDateInputValue = (value = new Date()) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const offsetMs = parsed.getTimezoneOffset() * 60_000;
  return new Date(parsed.getTime() - offsetMs).toISOString().slice(0, 10);
};

const getPrimaryPricing = (place) =>
  (Array.isArray(place?.pricing) && place.pricing[0]) ||
  (Array.isArray(place?.placePricing) && place.placePricing[0]) ||
  (Array.isArray(place?.pricings) && place.pricings[0]) ||
  (place?.pricing && typeof place.pricing === "object" && place.pricing) ||
  null;

const getPlacePriceDisplay = (
  originalPlace,
  convertedPlace,
  displayCurrency,
) => {
  const pricing = getPrimaryPricing(originalPlace);
  const amount = pricing
    ? (pricing.basePrice ??
      pricing.price ??
      pricing.amount ??
      originalPlace?.basePrice ??
      originalPlace?.price ??
      null)
    : null;

  const origCurrency = pricing
    ? (pricing.currencyCode ??
      pricing.currency ??
      originalPlace?.currencyCode ??
      originalPlace?.currency ??
      null)
    : (originalPlace?.currencyCode ?? originalPlace?.currency ?? null);

  if (amount == null) {
    return { originalText: "—", convertedText: null };
  }

  const originalText = origCurrency
    ? formatCurrency(amount, origCurrency)
    : String(amount);

  const convertedPricing = getPrimaryPricing(convertedPlace);
  const convertedAmount = convertedPricing
    ? (convertedPricing.basePrice ??
      convertedPricing.price ??
      convertedPricing.amount ??
      null)
    : (convertedPlace?.basePrice ?? convertedPlace?.price ?? null);
  const convertedCurrency = convertedPricing
    ? (convertedPricing.currencyCode ?? convertedPricing.currency ?? null)
    : (convertedPlace?.currencyCode ??
      convertedPlace?.currency ??
      displayCurrency);

  return {
    originalText,
    convertedText:
      convertedAmount != null && convertedCurrency
        ? formatCurrency(convertedAmount, convertedCurrency)
        : null,
  };
};

const PlaceDetailSkeleton = () => (
  <div className="place-detail-page">
    <div className="place-detail-shell">
      <div className="place-sk-hero" />
      <div className="place-sk-meta-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="place-sk-meta-card" />
        ))}
      </div>
      <div className="place-sk-line place-sk-line--wide" />
      <div className="place-sk-line" />
      <div className="place-sk-line place-sk-line--short" />
    </div>
  </div>
);

const PlaceDetail = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const canUseCalendar = isAuthenticated && user?.role !== "ADMIN";
  const [place, setPlace] = useState(null);
  const [originalPlace, setOriginalPlace] = useState(null);
  const [convertedPlace, setConvertedPlace] = useState(null);
  const [displayCurrency, setDisplayCurrency] = useState(null);
  const [loading, setLoading] = useState(true);
  const [wishlisted, setWishlisted] = useState(false);
  const [wishlistBusy, setWishlistBusy] = useState(false);
  const [calendarBusy, setCalendarBusy] = useState(false);
  const {
    currencies,
    selectedCurrency,
    setSelectedCurrency,
    loading: currencyLoading,
  } = useCurrency();

  useEffect(() => {
    let active = true;
    const loadOriginal = async () => {
      setLoading(true);
      try {
        const payload = await fetchPlaceById(id);
        if (!active) return;
        setOriginalPlace(payload ?? null);
        setPlace(payload ?? null);
      } catch (error) {
        if (!active) return;
        toast.error(getApiErrorMessage(error, t("placeDetail.loadFailed")));
      } finally {
        if (active) setLoading(false);
      }
    };

    if (id) void loadOriginal();
    return () => {
      active = false;
    };
  }, [id, t]);

  useEffect(() => {
    if (!originalPlace || displayCurrency != null) return;

    const deriveCurrency = () => {
      const p = originalPlace;
      if (!p) return selectedCurrency ?? null;
      const pricing = getPrimaryPricing(p);
      if (pricing) {
        return (
          pricing.currencyCode ?? pricing.currency ?? selectedCurrency ?? null
        );
      }
      if (p.currencyCode || p.currency) return p.currencyCode ?? p.currency;
      return selectedCurrency ?? null;
    };

    const initial = deriveCurrency();
    setDisplayCurrency(initial);
  }, [originalPlace, selectedCurrency, displayCurrency]);

  const resolvedPlaceImageUrl = getResolvedPlaceImageUrl(place);
  useEffect(() => {
    let active = true;
    const loadConverted = async () => {
      if (!displayCurrency || !originalPlace) return;

      const pricing = getPrimaryPricing(originalPlace);

      const origAmount =
        pricing?.basePrice ??
        pricing?.price ??
        pricing?.amount ??
        originalPlace?.basePrice ??
        originalPlace?.price ??
        null;
      const origCurrency =
        pricing?.currencyCode ??
        pricing?.currency ??
        originalPlace?.currencyCode ??
        originalPlace?.currency ??
        null;

      if (origAmount == null || !origCurrency) {
        setConvertedPlace(null);
        setPlace(originalPlace);
        return;
      }

      if (displayCurrency === origCurrency) {
        setConvertedPlace(null);
        setPlace(originalPlace);
        return;
      }

      try {
        setLoading(true);
        const conv = convertAmount(origAmount, origCurrency, displayCurrency);
        const synthetic = {
          ...originalPlace,
          pricing: [
            {
              basePrice: conv,
              currencyCode: displayCurrency,
            },
          ],
          basePrice: conv,
          currencyCode: displayCurrency,
        };
        if (!active) return;
        setConvertedPlace(synthetic);
        setPlace(synthetic);
      } catch {
        if (!active) return;
        setConvertedPlace(null);
        setPlace(originalPlace);
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadConverted();
    return () => {
      active = false;
    };
  }, [displayCurrency, originalPlace, id]);

  useEffect(() => {
    let active = true;

    const syncWishlistState = async () => {
      const placeId = place?.id;
      if (!isAuthenticated || !placeId) {
        if (active) {
          setWishlisted(false);
        }
        return;
      }

      try {
        const payload = await checkWishlistItem(placeId);
        if (!active) return;
        setWishlisted(payload?.inWishlist === true);
      } catch (error) {
        if (!active) return;

        if (getApiErrorStatus(error) === 401) {
          setWishlisted(false);
          return;
        }

        setWishlisted(false);
      }
    };

    void syncWishlistState();

    return () => {
      active = false;
    };
  }, [isAuthenticated, place?.id]);

  const handleWishlist = async () => {
    if (!isAuthenticated) {
      toast.info(t("toasts.placeDetail.loginToSaveWishlist"));
      navigate("/login");
      return;
    }
    try {
      setWishlistBusy(true);
      if (wishlisted) {
        await removeWishlistItem(place.id);
        setWishlisted(false);
        toast.success(t("toasts.placeDetail.removedFromWishlist"));
        return;
      }

      await addWishlistItem(place.id);
      setWishlisted(true);
      toast.success(t("toasts.placeDetail.addedToWishlist"));
    } catch (error) {
      if (getApiErrorStatus(error) === 409) {
        setWishlisted(true);
        toast.info(t("toasts.tripResults.alreadyInWishlist"));
        return;
      }

      toast.error(
        getApiErrorMessage(
          error,
          t("toasts.placeDetail.failedToUpdateWishlist"),
        ),
      );
    } finally {
      setWishlistBusy(false);
    }
  };

  if (loading) return <PlaceDetailSkeleton />;

  if (!place) {
    return (
      <div className="place-detail-page">
        <div className="place-detail-shell place-detail-shell--empty">
          <div className="place-detail-notfound">
            <span className="place-detail-notfound-icon">📍</span>
            <h2>{t("placeDetail.notFoundTitle")}</h2>
            <p>{t("placeDetail.notFoundMessage")}</p>
            <Link to="/explore" className="place-detail-back">
              <FiArrowLeft size={15} /> {t("placeDetail.backToExplore")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const typeIcon = TYPE_ICONS[place.type] ?? "📍";
  const typeLabelKey = PLACE_TYPE_LABEL_KEYS[place.type];
  const typeLabel = typeLabelKey
    ? t(`tripPlanner.placeTypes.${typeLabelKey}`, {
        defaultValue: place.type,
      })
    : (place.type ?? t("explore.labels.place", { defaultValue: "Place" }));
  const rating = Number(place.ratingAverage ?? 0);
  const mapPoint = getPlaceMapPoint(place);
  const mapEmbedUrl = getOpenStreetMapEmbedUrl(mapPoint);
  const mapExternalUrl = getOpenStreetMapUrl(mapPoint);
  const openingHours = normalizeOpeningHours(place);
  const coordinatesLabel = mapPoint
    ? `${mapPoint.latitude.toFixed(6)}, ${mapPoint.longitude.toFixed(6)}`
    : null;
  const addressLine =
    (typeof place.address === "string" && place.address.trim()) ||
    (typeof place.streetAddress === "string" && place.streetAddress.trim()) ||
    (typeof place.formattedAddress === "string" &&
      place.formattedAddress.trim()) ||
    (typeof place.location === "string" && place.location.trim()) ||
    null;
  const providerName =
    (typeof place.provider?.displayName === "string" &&
      place.provider.displayName.trim()) ||
    (typeof place.provider?.businessName === "string" &&
      place.provider.businessName.trim()) ||
    null;
  const providerSlug =
    typeof place.provider?.slug === "string" && place.provider.slug.trim()
      ? place.provider.slug.trim()
      : null;
  const description =
    place.description ||
    t("placeDetail.noDescription", {
      defaultValue: "No description available yet for this place.",
    });
  const priceDisplay = getPlacePriceDisplay(
    originalPlace,
    convertedPlace,
    displayCurrency,
  );
  const heroFacts = [
    place.city?.name
      ? {
          icon: <FiMapPin size={13} />,
          label: place.city.name,
        }
      : null,
    {
      icon: <FiStar size={13} className="place-detail-star" />,
      label:
        rating > 0 ? `${rating.toFixed(1)} / 5` : t("placeDetail.notRatedYet"),
    },
    {
      icon: <FiCalendar size={13} />,
      label:
        (place.ratingCount ?? 0) > 0
          ? t("placeDetail.reviewsCountValue", {
              defaultValue: "{{count}} reviews",
              count: place.ratingCount ?? 0,
            })
          : t("placeDetail.reviews", { defaultValue: "No reviews yet" }),
    },
    {
      icon: <FiClock size={13} />,
      label:
        openingHours.length > 0
          ? t("placeDetail.openingHours", {
              defaultValue: "Hours available",
            })
          : t("placeDetail.openingHoursUnavailable", {
              defaultValue: "Hours unavailable",
            }),
    },
    priceDisplay.originalText !== "—"
      ? {
          icon: <FiExternalLink size={13} />,
          label: priceDisplay.convertedText
            ? `${priceDisplay.originalText} · ≈ ${priceDisplay.convertedText}`
            : priceDisplay.originalText,
        }
      : null,
  ].filter(Boolean);

  const handleAddToCalendar = async () => {
    if (!canUseCalendar) {
      if (!isAuthenticated) {
        toast.info(t("toasts.placeDetail.loginToSaveCalendar"));
        navigate("/login");
      }
      return;
    }

    setCalendarBusy(true);
    try {
      await createCalendarEntry({
        title: place.name,
        date: toDateInputValue(),
        placeId: place.id,
        placeName: place.name,
        cityName: place.city?.name ?? "",
        sourceType: "place",
        sourceLabel: place.city?.name
          ? `${place.name} · ${place.city.name}`
          : place.name,
      });
      toast.success(t("toasts.placeDetail.addedToCalendar"));
      navigate("/calendar", {
        state: {
          calendarDraft: {
            placeId: place.id,
            placeName: place.name,
            title: place.name,
            cityName: place.city?.name ?? "",
            date: toDateInputValue(),
            sourceType: "place",
          },
        },
      });
    } catch (error) {
      if (getApiErrorStatus(error) === 409) {
        toast.info(t("toasts.placeDetail.alreadyInCalendar"));
        navigate("/calendar");
        return;
      }

      if (getApiErrorStatus(error) === 401) {
        navigate("/login");
        return;
      }

      toast.error(
        getApiErrorMessage(error, t("toasts.placeDetail.failedToSaveCalendar")),
      );
    } finally {
      setCalendarBusy(false);
    }
  };

  return (
    <div className="place-detail-page">
      <article className="place-detail-shell">
        <div className="place-detail-breadcrumb">
          <Link to="/explore" className="place-detail-back">
            <FiArrowLeft size={15} /> {t("placeDetail.backToExplore")}
          </Link>
          {place.city?.name && (
            <Link
              to={`/explore?q=${encodeURIComponent(place.city.name)}`}
              className="place-detail-crumb-city">
              <FiMapPin size={13} /> {place.city.name}
            </Link>
          )}
        </div>

        <section className="place-detail-hero">
          <FallbackImage
            src={resolvedPlaceImageUrl}
            alt={place.name}
            className="place-detail-image"
          />
          <div className="place-detail-overlay">
            <div className="place-detail-overlay-top">
              <span className="place-detail-type-badge">
                {typeIcon} {typeLabel}
              </span>
              <div className="place-detail-overlay-actions">
                {!currencyLoading &&
                Array.isArray(currencies) &&
                currencies.length > 0 ? (
                  <select
                    className="place-detail-currency-select"
                    value={displayCurrency ?? ""}
                    onChange={(e) => {
                      const code = e.target.value;
                      setDisplayCurrency(code);
                      setSelectedCurrency(code);
                    }}
                    aria-label={t("placeDetail.selectCurrency")}
                    title={t("placeDetail.selectCurrency")}>
                    {currencies.map((c) => {
                      const code = c.code ?? c.iso ?? c.id ?? String(c);
                      const label = c.code
                        ? `${c.code} ${c.name ? `— ${c.name}` : ""}`
                        : code;
                      return (
                        <option key={code} value={code}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                ) : null}

                <button
                  type="button"
                  className={`place-detail-wishlist-btn${wishlisted ? " place-detail-wishlist-btn--active" : ""}${wishlistBusy ? " place-detail-wishlist-btn--busy" : ""}`}
                  onClick={handleWishlist}
                  disabled={wishlistBusy}
                  aria-pressed={wishlisted}
                  title={
                    wishlisted
                      ? t("placeDetail.removeFromWishlist", {
                          defaultValue: "Remove from wishlist",
                        })
                      : t("placeDetail.addToWishlist", {
                          defaultValue: "Add to wishlist",
                        })
                  }>
                  {wishlistBusy ? (
                    <span
                      className="social-post-card__actionSpinner"
                      aria-hidden
                    />
                  ) : (
                    <FiHeart
                      size={18}
                      fill={wishlisted ? "currentColor" : "none"}
                    />
                  )}
                </button>
              </div>
            </div>
            <h1>
              {place.name}
              {place.isVerified && <VerifiedBadge size={18} />}
            </h1>
            <p>{description}</p>
          </div>
        </section>

        <section className="place-detail-meta-grid">
          <div className="place-detail-meta-card">
            <span className="place-detail-meta-label">
              {t("placeDetail.type")}
            </span>
            <strong>
              {typeIcon} {typeLabel}
            </strong>
          </div>
          <div className="place-detail-meta-card">
            <span className="place-detail-meta-label">
              {t("placeDetail.city")}
            </span>
            <strong>
              <FiMapPin size={13} /> {place.city?.name ?? "—"}
            </strong>
          </div>
          <div className="place-detail-meta-card">
            <span className="place-detail-meta-label">
              {t("placeDetail.rating")}
            </span>
            <strong className="place-detail-rating">
              <FiStar size={14} className="place-detail-star" />
              {rating > 0
                ? `${rating.toFixed(1)} / 5`
                : t("placeDetail.notRatedYet")}
            </strong>
          </div>
          <div className="place-detail-meta-card">
            <span className="place-detail-meta-label">
              {t("placeDetail.reviews")}
            </span>
            <strong>
              {t("placeDetail.reviewsCountValue", {
                defaultValue: "{{count}} reviews",
                count: place.ratingCount ?? 0,
              })}
            </strong>
          </div>
          {/* Pricing */}
          <div className="place-detail-meta-card">
            <span className="place-detail-meta-label">
              {t("placeDetail.price")}
            </span>
            <strong>
              <span>
                {priceDisplay.originalText}
                {priceDisplay.convertedText ? (
                  <span className="place-detail-price-approx">
                    ≈ {priceDisplay.convertedText}
                  </span>
                ) : null}
              </span>
            </strong>
          </div>
        </section>

        <section
          className="place-detail-info-grid"
          aria-label={t("placeDetail.placeInfoMap")}>
          <article className="place-detail-info-card">
            <h2 className="place-detail-section-title">
              {t("placeDetail.detailsTitle")}
            </h2>

            <dl className="place-detail-facts">
              {addressLine ? (
                <div className="place-detail-fact-row">
                  <dt>{t("placeDetail.address")}</dt>
                  <dd>{addressLine}</dd>
                </div>
              ) : null}

              <div className="place-detail-fact-row">
                <dt>{t("placeDetail.coordinates")}</dt>
                <dd>{coordinatesLabel ?? t("placeDetail.notAvailable")}</dd>
              </div>

              {providerName ? (
                <div className="place-detail-fact-row">
                  <dt>{t("placeDetail.provider")}</dt>
                  <dd>
                    {providerSlug ? (
                      <Link to={`/p/${encodeURIComponent(providerSlug)}`}>
                        {providerName}
                      </Link>
                    ) : (
                      providerName
                    )}
                  </dd>
                </div>
              ) : null}

              {user?.role === "ADMIN" && place.slug ? (
                <div className="place-detail-fact-row">
                  <dt>{t("placeDetail.slug")}</dt>
                  <dd>{place.slug}</dd>
                </div>
              ) : null}

              <div className="place-detail-fact-row">
                <dt>{t("placeDetail.status")}</dt>
                <dd>
                  {place.isActive === false
                    ? t("placeDetail.inactive")
                    : t("placeDetail.active")}
                </dd>
              </div>
            </dl>

            {openingHours.length > 0 ? (
              <div className="place-detail-hours-block">
                <h3 className="place-detail-subtitle">
                  <FiClock size={15} />{" "}
                  {t("placeDetail.openingHours", {
                    defaultValue: "Opening hours",
                  })}
                </h3>
                <ul className="place-detail-hours-list">
                  {openingHours.map((row) => (
                    <li key={row.day} className="place-detail-hours-row">
                      <span>
                        {t(`calendar.weekday.${DAY_LABEL_KEYS[row.day]}`, {
                          defaultValue: `Day ${row.day}`,
                        })}
                      </span>
                      <strong>
                        {row.closed
                          ? t("placeDetail.closed", {
                              defaultValue: "Closed",
                            })
                          : `${compactTime(row.openTime)} - ${compactTime(row.closeTime)}`}
                      </strong>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="place-detail-muted">
                {t("placeDetail.openingHoursUnavailable", {
                  defaultValue: "Opening hours are not available yet.",
                })}
              </p>
            )}
          </article>

          <article className="place-detail-map-card">
            <div className="place-detail-map-head">
              <h2 className="place-detail-section-title">
                {t("placeDetail.locationMap")}
              </h2>
              {coordinatesLabel ? (
                <span className="place-detail-map-coords">
                  {coordinatesLabel}
                </span>
              ) : null}
            </div>

            {mapEmbedUrl ? (
              <>
                <iframe
                  title={t("placeDetail.mapTitle", {
                    placeName: place.name,
                    defaultValue: "{{placeName}} location",
                  })}
                  className="place-detail-map-frame"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={mapEmbedUrl}
                />
                {mapExternalUrl ? (
                  <a
                    href={mapExternalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="place-detail-map-link">
                    <FiExternalLink size={15} />{" "}
                    {t("placeDetail.openInMap", {
                      defaultValue: "Open in map",
                    })}
                  </a>
                ) : null}
              </>
            ) : (
              <div className="place-detail-map-empty">
                {t("placeDetail.noCoordinates", {
                  defaultValue:
                    "Location coordinates are not available for this place yet.",
                })}
              </div>
            )}
          </article>
        </section>

        {Array.isArray(place.tags) && place.tags.length > 0 && (
          <div className="place-detail-tags">
            {place.tags.map((tag) => (
              <span key={tag.id ?? tag} className="place-detail-tag">
                {tag.name ?? tag}
              </span>
            ))}
          </div>
        )}

        <div className="place-detail-cta-bar">
          <button
            type="button"
            className={`place-detail-wishlist-cta${wishlisted ? " active" : ""}`}
            onClick={handleWishlist}
            disabled={wishlistBusy}
            aria-pressed={wishlisted}>
            <FiHeart size={16} fill={wishlisted ? "currentColor" : "none"} />
            {wishlisted
              ? t("placeDetail.removeFromWishlist", {
                  defaultValue: "Remove from wishlist",
                })
              : t("placeDetail.addToWishlist", {
                  defaultValue: "Add to wishlist",
                })}
          </button>
          {canUseCalendar ? (
            <button
              type="button"
              className="place-detail-plan-cta place-detail-plan-cta--primary"
              onClick={() => void handleAddToCalendar()}
              disabled={calendarBusy}>
              {calendarBusy ? (
                <span className="social-post-card__actionSpinner" aria-hidden />
              ) : (
                <FiCalendar size={16} />
              )}
              {calendarBusy
                ? t("placeDetail.savingToCalendar", {
                    defaultValue: "Saving...",
                  })
                : t("placeDetail.addToCalendar", {
                    defaultValue: "Add to calendar",
                  })}
            </button>
          ) : null}
          <Link
            to={`/plan?destination=${encodeURIComponent(place.city?.name ?? place.name)}`}
            className="place-detail-plan-cta">
            <FiSend size={16} />
            {t("placeDetail.planTrip")}
          </Link>
        </div>

        <FeedbackSection target="place" targetId={place.id} />
      </article>
    </div>
  );
};

export default PlaceDetail;
