import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiHeart, FiTrash2, FiArrowRight, FiBookmark } from "react-icons/fi";
import { useWishlistPage } from "@/hooks/user/useWishlistPage";
import { getResolvedPlaceImageUrl } from "@/utils/placeImage";
import "./Wishlist.css";

const WishlistSkeleton = () => (
  <div className="wl-grid">
    {[1, 2, 3].map((i) => (
      <div key={i} className="sk-wl-card">
        <div className="sk-wl-img" />
        <div className="sk-wl-body">
          <div className="sk-wl-line sk-wl-line--wide" />
          <div className="sk-wl-line" />
          <div className="sk-wl-line sk-wl-line--short" />
        </div>
      </div>
    ))}
  </div>
);

const Wishlist = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { items, loading, removeItem } = useWishlistPage();
  const [failedImagesById, setFailedImagesById] = useState({});

  const onImageError = useCallback(
    (id) =>
      setFailedImagesById((current) => ({ ...current, [id]: true })),
    [],
  );

  return (
    <section className="wishlist-page">
      <div className="wl-hero">
        <div className="wl-hero-bg" />
        <FiHeart className="wl-hero-icon" size={28} />
        <h1 className="wl-hero-title">
          {t("user.wishlist.title")}
        </h1>
        <p className="wl-hero-sub">
          {t("user.wishlist.subtitle", {
            defaultValue: "Places you've saved for later",
          })}
        </p>
      </div>

      {loading ? (
        <WishlistSkeleton />
      ) : items.length === 0 ? (
        <div className="wl-empty">
          <FiBookmark size={48} className="wl-empty-icon" />
          <h3>{t("user.wishlist.emptyTitle", { defaultValue: "Nothing saved yet" })}</h3>
          <p>{t("user.wishlist.empty")}</p>
          <button
            type="button"
            className="wl-empty-btn"
            onClick={() => navigate("/explore")}>
            {t("user.wishlist.exploreButton")}
            <FiArrowRight size={16} />
          </button>
        </div>
      ) : (
        <div className="wl-grid">
          {items.map((item, idx) => {
            const resolvedImageUrl = getResolvedPlaceImageUrl(item.imageUrl);
            const showImage =
              Boolean(resolvedImageUrl) && failedImagesById[item.id] !== true;

            return (
              <div
                key={item.id}
                className="wl-card"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                <button
                  type="button"
                  className="wl-card-remove"
                  onClick={() => void removeItem(item.placeId)}
                  title={t("user.wishlist.remove")}
                >
                  <FiTrash2 size={14} />
                </button>

                {showImage ? (
                  <img
                    src={resolvedImageUrl}
                    alt={item.name}
                    className="wl-card-img"
                    onError={() => onImageError(item.id)}
                  />
                ) : (
                  <div className="wl-card-placeholder" aria-label={item.name}>
                    {item.name}
                  </div>
                )}

                <div className="wl-card-body">
                  <h3 className="wl-card-name">{item.name}</h3>
                  <div className="wl-card-meta">
                    <span className="wl-card-type">{item.type}</span>
                    {item.ratingAverage > 0 && (
                      <span className="wl-card-rating">
                        ★ {item.ratingAverage.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="wl-card-view"
                    onClick={() => navigate(`/places/${item.placeId}`)}>
                    {t("user.wishlist.viewDetails", { defaultValue: "View details" })}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default Wishlist;
