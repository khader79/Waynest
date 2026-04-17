import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { FiArrowLeft, FiMapPin, FiStar, FiHeart, FiSend } from "react-icons/fi";
import VerifiedBadge from "@/components/common/VerifiedBadge/VerifiedBadge";
import { fetchPlaceById } from "@/api/catalog";
import { useCurrency } from "@/context/CurrencyContext";
import formatCurrency, { convertAmount } from "@/utils/currency";
import { useAuth } from "@/context/AuthContext";
import { addWishlistItem } from "@/api/user";
import FeedbackSection from "@/components/public/feedback/FeedbackSection";
import { getResolvedPlaceImageUrl } from "@/utils/placeImage";
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
      } catch (err) {
        if (!active) return;
        toast.error("Failed to load place details");
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

  // (removed) server-side conversion attempt — using client-side conversion effect below
  useEffect(() => {
    return;
    let active = true;
    const loadConverted = async () => {
      if (!displayCurrency || !originalPlace) return;
      // determine original currency
      const pricing =
        (Array.isArray(originalPlace.pricing) && originalPlace.pricing[0]) ||
        (Array.isArray(originalPlace.placePricing) &&
          originalPlace.placePricing[0]) ||
        (Array.isArray(originalPlace.pricings) && originalPlace.pricings[0]) ||
        (originalPlace.pricing &&
          typeof originalPlace.pricing === "object" &&
          originalPlace.pricing) ||
        null;
      const originalCurrency =
        pricing?.currencyCode ??
        pricing?.currency ??
        originalPlace.currencyCode ??
        originalPlace.currency ??
        null;
      if (!originalCurrency) return;
      if (displayCurrency === originalCurrency) {
        setConvertedPlace(null);
        setPlace(originalPlace);
        return;
      }

      try {
        setLoading(true);
        // First try server-side conversion
        const converted = await fetchPlaceById(id, displayCurrency);
        if (!active) return;

        // If server returned a payload whose pricing/currency matches requested currency,
        // assume server-side conversion worked and use it. Otherwise fall back to client-side conversion.
        const cpPricing =
          (Array.isArray(converted?.pricing) && converted.pricing[0]) ||
          (Array.isArray(converted?.placePricing) &&
            converted.placePricing[0]) ||
          (Array.isArray(converted?.pricings) && converted.pricings[0]) ||
          (converted?.pricing &&
            typeof converted.pricing === "object" &&
            converted.pricing) ||
          null;

        const cpCurrency =
          cpPricing?.currencyCode ??
          cpPricing?.currency ??
          converted?.currencyCode ??
          converted?.currency ??
          null;

        if (cpCurrency && cpCurrency === displayCurrency) {
          setConvertedPlace(converted ?? null);
          setPlace(converted ?? originalPlace);
        } else {
          // server didn't convert — do a client-side conversion using local rates
          const pricing =
            (Array.isArray(originalPlace.pricing) &&
              originalPlace.pricing[0]) ||
            (Array.isArray(originalPlace.placePricing) &&
              originalPlace.placePricing[0]) ||
            (Array.isArray(originalPlace.pricings) &&
              originalPlace.pricings[0]) ||
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
          } else {
            // dynamic import convertAmount to avoid bundler/require issues
            const { convertAmount } = await import("@/utils/currency");
            const conv = convertAmount(
              origAmount,
              origCurrency,
              displayCurrency,
            );
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
            setConvertedPlace(synthetic);
            setPlace(synthetic);
          }
        }
      } catch (err) {
        if (!active) return;
        // fallback: keep original place
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
      } catch (err) {
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

  const handleWishlist = async () => {
    if (!isAuthenticated) {
      toast.info("Sign in to save places to your wishlist");
      navigate("/login");
      return;
    }
    try {
      setWishlistBusy(true);
      await addWishlistItem(place.id);
      setWishlisted(true);
      toast.success("Added to wishlist ❤️");
    } catch {
      toast.error("Failed to update wishlist");
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
                      // update global preference so other pages remember user's choice
                      try {
                        setSelectedCurrency(code);
                      } catch {}
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
                  disabled={wishlistBusy || wishlisted}
                  title={wishlisted ? "In wishlist" : "Add to wishlist"}>
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
            disabled={wishlistBusy || wishlisted}>
            <FiHeart size={16} fill={wishlisted ? "currentColor" : "none"} />
            {wishlisted ? "In wishlist" : "Add to wishlist"}
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
