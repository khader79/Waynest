import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { FiArrowLeft, FiMapPin, FiStar, FiHeart, FiSend } from "react-icons/fi";
import VerifiedBadge from "@/components/common/VerifiedBadge/VerifiedBadge";
import { fetchPlaceById } from "@/api/catalog";
import { useAuth } from "@/context/AuthContext";
import { addWishlistItem } from "@/api/user";
import FeedbackSection from "@/components/public/feedback/FeedbackSection";
import "./PlaceDetail.css";

const placeImageFallback =
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1400&q=75&auto=format&fit=crop";

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
  const [loading, setLoading] = useState(true);
  const [wishlisted, setWishlisted] = useState(false);
  const [wishlistBusy, setWishlistBusy] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const payload = await fetchPlaceById(id);
        setPlace(payload ?? null);
      } catch {
        toast.error("Failed to load place details");
      } finally {
        setLoading(false);
      }
    };
    if (id) void load();
  }, [id]);

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
          <img
            src={place.imageUrl || placeImageFallback}
            alt={place.name}
            className="place-detail-image"
            onError={({ currentTarget }) => {
              currentTarget.onerror = null;
              currentTarget.src = placeImageFallback;
            }}
          />
          <div className="place-detail-overlay">
            <div className="place-detail-overlay-top">
              <span className="place-detail-type-badge">
                {typeIcon} {place.type}
              </span>
              <div className="place-detail-overlay-actions">
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
