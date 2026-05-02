import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FiArrowLeft,
  FiMapPin,
  FiStar,
  FiHeart,
  FiSend,
  FiClock,
  FiExternalLink,
} from "react-icons/fi";
import VerifiedBadge from "@/components/common/VerifiedBadge/VerifiedBadge";
import { fetchPlaceById } from "@/api/catalog";
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
import "./PlaceDetail.css";

const TYPE_ICONS = {
  RESTAURANT: "🍽️",
  CAFE: "☕",
  MUSEUM: "🏛️",
  PARK: "🌿",
  HISTORICAL: "🏺",
  SHOP: "🛍️",
  ATTRACTION: "📍",
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
  const { isAuthenticated } = useAuth();
  const [place, setPlace] = useState(null);
  const [originalPlace, setOriginalPlace] = useState(null);
  const [convertedPlace, setConvertedPlace] = useState(null);
  const [displayCurrency, setDisplayCurrency] = useState(null);
  const [loading, setLoading] = useState(true);
  const [wishlisted, setWishlisted] = useState(false);
  const [wishlistBusy, setWishlistBusy] = useState(false);
  const [failedImageUrl, setFailedImageUrl] = useState(null);
  const {
    currencies,
    selectedCurrency,
    setSelectedCurrency,
    loading: currencyLoading,
  } = useCurrency();

  // Load original place (no conversion) to read canonical pricing and currency
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
        toast.error(getApiErrorMessage(error, "Failed to load place details"));
      } finally {
        if (active) setLoading(false);
      }
    };

    if (id) void loadOriginal();
    return () => {
      active = false;
    };
  }, [id]);

  // Derive and set the initial display currency once after original place loads.
  // Do NOT override `displayCurrency` if the user already picked a currency.
  useEffect(() => {
    if (!originalPlace || displayCurrency != null) return;

    const deriveCurrency = () => {
      const p = originalPlace;
      if (!p) return selectedCurrency ?? null;
      // possible pricing locations
      const pricing =
        (Array.isArray(p.pricing) && p.pricing[0]) ||
        (Array.isArray(p.placePricing) && p.placePricing[0]) ||
        (Array.isArray(p.pricings) && p.pricings[0]) ||
        (p.pricing && typeof p.pricing === "object" && p.pricing) ||
        null;
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
  // When displayCurrency changes and differs from original place currency, compute converted payload client-side
  useEffect(() => {
    let active = true;
    const loadConverted = async () => {
      if (!displayCurrency || !originalPlace) return;

      const pricing =
        (Array.isArray(originalPlace.pricing) && originalPlace.pricing[0]) ||
        (Array.isArray(originalPlace.placePricing) &&
          originalPlace.placePricing[0]) ||
        (Array.isArray(originalPlace.pricings) && originalPlace.pricings[0]) ||
        (originalPlace.pricing &&
          typeof originalPlace.pricing === "object" &&
          originalPlace.pricing) ||
        null;

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
      toast.info("Sign in to save places to your wishlist");
      navigate("/login");
      return;
    }
    try {
      setWishlistBusy(true);
      if (wishlisted) {
        await removeWishlistItem(place.id);
        setWishlisted(false);
        toast.success("Removed from wishlist");
        return;
      }

      await addWishlistItem(place.id);
      setWishlisted(true);
      toast.success("Added to wishlist ❤️");
    } catch (error) {
      if (getApiErrorStatus(error) === 409) {
        setWishlisted(true);
        toast.info("Already in wishlist");
        return;
      }

      toast.error(getApiErrorMessage(error, "Failed to update wishlist"));
    } finally {
      setWishlistBusy(false);
    }
  };

  if (loading) return <PlaceDetailSkeleton />;

  if (!place) {
    return (
      <div className="place-detail-page">
        <div className="place-detail-shell place-detail-shell--empty">
          <p>Place not found.</p>
          <Link to="/explore" className="place-detail-back">
            ← Back to Explore
          </Link>
        </div>
      </div>
    );
  }

  const typeIcon = TYPE_ICONS[place.type] ?? "📍";
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

  return (
    <div className="place-detail-page">
      <article className="place-detail-shell">
        <div className="place-detail-breadcrumb">
          <Link to="/explore" className="place-detail-back">
            <FiArrowLeft size={15} /> Back to Explore
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
          {resolvedPlaceImageUrl && failedImageUrl !== resolvedPlaceImageUrl ? (
            <img
              src={resolvedPlaceImageUrl}
              alt={place.name}
              className="place-detail-image"
              onError={() => setFailedImageUrl(resolvedPlaceImageUrl)}
            />
          ) : (
            <div
              className="place-detail-image place-detail-image--placeholder"
              role="img"
              aria-label={place.name}>
              {place.name}
            </div>
          )}
          <div className="place-detail-overlay">
            <div className="place-detail-overlay-top">
              <span className="place-detail-type-badge">
                {typeIcon} {place.type}
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
                    aria-label="Select currency"
                    title="Select currency">
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
                  className={`place-detail-wishlist-btn${wishlisted ? " place-detail-wishlist-btn--active" : ""}`}
                  onClick={handleWishlist}
                  disabled={wishlistBusy}
                  aria-pressed={wishlisted}
                  title={wishlisted ? "Remove from wishlist" : "Add to wishlist"}>
                  <FiHeart
                    size={18}
                    fill={wishlisted ? "currentColor" : "none"}
                  />
                </button>
              </div>
            </div>
            <h1>
              {place.name}
              {place.isVerified && <VerifiedBadge size={18} />}
            </h1>
            <p>
              {place.description ||
                "No description available yet for this place."}
            </p>
          </div>
        </section>

        <section className="place-detail-meta-grid">
          <div className="place-detail-meta-card">
            <span className="place-detail-meta-label">Type</span>
            <strong>
              {typeIcon} {place.type ?? "—"}
            </strong>
          </div>
          <div className="place-detail-meta-card">
            <span className="place-detail-meta-label">City</span>
            <strong>
              <FiMapPin size={13} /> {place.city?.name ?? "—"}
            </strong>
          </div>
          <div className="place-detail-meta-card">
            <span className="place-detail-meta-label">Rating</span>
            <strong className="place-detail-rating">
              <FiStar size={14} className="place-detail-star" />
              {rating > 0 ? `${rating.toFixed(1)} / 5` : "Not rated yet"}
            </strong>
          </div>
          <div className="place-detail-meta-card">
            <span className="place-detail-meta-label">Reviews</span>
            <strong>{place.ratingCount ?? 0} reviews</strong>
          </div>
          {/* Pricing */}
          <div className="place-detail-meta-card">
            <span className="place-detail-meta-label">Price</span>
            <strong>
              {(() => {
                const p =
                  (Array.isArray(originalPlace?.pricing) &&
                    originalPlace.pricing[0]) ||
                  (Array.isArray(originalPlace?.placePricing) &&
                    originalPlace.placePricing[0]) ||
                  (Array.isArray(originalPlace?.pricings) &&
                    originalPlace.pricings[0]) ||
                  (originalPlace?.pricing &&
                    typeof originalPlace.pricing === "object" &&
                    originalPlace.pricing) ||
                  (originalPlace &&
                    (originalPlace.basePrice ??
                      originalPlace.price ??
                      originalPlace.ticketPrice)) ||
                  null;

                const amount = p
                  ? (p.basePrice ??
                    p.price ??
                    p.amount ??
                    originalPlace?.basePrice ??
                    originalPlace?.price ??
                    null)
                  : null;
                const origCurrency = p
                  ? (p.currencyCode ??
                    p.currency ??
                    originalPlace?.currencyCode ??
                    originalPlace?.currency ??
                    null)
                  : (originalPlace?.currencyCode ??
                    originalPlace?.currency ??
                    null);

                if (amount == null) return "—";

                const formattedOrig = origCurrency
                  ? formatCurrency(amount, origCurrency)
                  : String(amount);

                // if we have convertedPlace and it includes converted amount, show approx
                const cp = convertedPlace;
                let convertedText = null;
                if (cp) {
                  const cpPricing =
                    (Array.isArray(cp?.pricing) && cp.pricing[0]) ||
                    (Array.isArray(cp?.placePricing) && cp.placePricing[0]) ||
                    (cp?.pricing &&
                      typeof cp.pricing === "object" &&
                      cp.pricing) ||
                    null;
                  const convAmount = cpPricing
                    ? (cpPricing.basePrice ??
                      cpPricing.price ??
                      cpPricing.amount ??
                      null)
                    : (cp?.basePrice ?? cp?.price ?? null);
                  const convCurrency = cpPricing
                    ? (cpPricing.currencyCode ?? cpPricing.currency ?? null)
                    : (cp?.currencyCode ?? cp?.currency ?? displayCurrency);
                  if (convAmount != null && convCurrency)
                    convertedText = formatCurrency(convAmount, convCurrency);
                }

                return (
                  <span>
                    {formattedOrig}
                    {convertedText ? (
                      <span
                        style={{
                          marginLeft: 8,
                          fontWeight: 400,
                          fontSize: 13,
                        }}>
                        ≈ {convertedText}
                      </span>
                    ) : null}
                  </span>
                );
              })()}
            </strong>
          </div>
        </section>

        <section
          className="place-detail-info-grid"
          aria-label="Place information and map">
          <article className="place-detail-info-card">
            <h2 className="place-detail-section-title">Place details</h2>

            <dl className="place-detail-facts">
              <div className="place-detail-fact-row">
                <dt>Address</dt>
                <dd>{addressLine ?? "Not provided"}</dd>
              </div>

              <div className="place-detail-fact-row">
                <dt>Coordinates</dt>
                <dd>{coordinatesLabel ?? "Not available"}</dd>
              </div>

              <div className="place-detail-fact-row">
                <dt>Provider</dt>
                <dd>
                  {providerName ? (
                    providerSlug ? (
                      <Link to={`/p/${encodeURIComponent(providerSlug)}`}>
                        {providerName}
                      </Link>
                    ) : (
                      providerName
                    )
                  ) : (
                    "Unknown"
                  )}
                </dd>
              </div>

              <div className="place-detail-fact-row">
                <dt>Slug</dt>
                <dd>{place.slug ?? "Not set"}</dd>
              </div>

              <div className="place-detail-fact-row">
                <dt>Status</dt>
                <dd>{place.isActive === false ? "Inactive" : "Active"}</dd>
              </div>
            </dl>

            {openingHours.length > 0 ? (
              <div className="place-detail-hours-block">
                <h3 className="place-detail-subtitle">
                  <FiClock size={15} /> Opening hours
                </h3>
                <ul className="place-detail-hours-list">
                  {openingHours.map((row) => (
                    <li key={row.day} className="place-detail-hours-row">
                      <span>{DAY_LABELS[row.day] ?? `Day ${row.day}`}</span>
                      <strong>
                        {row.closed
                          ? "Closed"
                          : `${compactTime(row.openTime)} - ${compactTime(row.closeTime)}`}
                      </strong>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="place-detail-muted">
                Opening hours are not available yet.
              </p>
            )}
          </article>

          <article className="place-detail-map-card">
            <div className="place-detail-map-head">
              <h2 className="place-detail-section-title">Location map</h2>
              {coordinatesLabel ? (
                <span className="place-detail-map-coords">
                  {coordinatesLabel}
                </span>
              ) : null}
            </div>

            {mapEmbedUrl ? (
              <>
                <iframe
                  title={`${place.name} location`}
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
                    <FiExternalLink size={15} /> Open in map
                  </a>
                ) : null}
              </>
            ) : (
              <div className="place-detail-map-empty">
                Location coordinates are not available for this place yet.
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
            {wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          </button>
          <Link
            to={`/plan?destination=${encodeURIComponent(place.city?.name ?? place.name)}`}
            className="place-detail-plan-cta">
            <FiSend size={16} />
            Plan a trip here
          </Link>
        </div>

        <FeedbackSection target="place" targetId={place.id} />
      </article>
    </div>
  );
};

export default PlaceDetail;
