import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useWishlistPage } from "@/hooks/user/useWishlistPage";
import { getResolvedPlaceImageUrl } from "@/utils/placeImage";
import "./Wishlist.css";

const Wishlist = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { items, loading, removeItem } = useWishlistPage();
  const [failedImagesById, setFailedImagesById] = useState({});

  return (
    <section className="wishlist-page">
      <h1 className="wishlist-title">{t("user.wishlist.title")}</h1>
      {loading ? (
        <div className="wishlist-grid">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="wishlist-skeleton-card">
              <div className="wishlist-skeleton-image" />
              <div className="wishlist-skeleton-body">
                <div className="wishlist-skeleton-line" />
                <div className="wishlist-skeleton-line short" />
                <div className="wishlist-skeleton-line" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="wishlist-empty">
          <p>{t("user.wishlist.empty")}</p>
          <span className="wishlist-empty-hint">
            {t("user.wishlist.emptyAction")}
          </span>
          <button
            type="button"
            className="wishlist-explore-button"
            onClick={() => navigate("/explore")}>
            {t("user.wishlist.exploreButton")}
          </button>
        </div>
      ) : (
        <div className="wishlist-grid">
          {items.map((item) => {
            const resolvedImageUrl = getResolvedPlaceImageUrl(item.imageUrl);
            const showImage =
              Boolean(resolvedImageUrl) && failedImagesById[item.id] !== true;

            return (
              <div key={item.id} className="wishlist-card">
                {showImage ? (
                  <img
                    src={resolvedImageUrl}
                    alt={item.name}
                    className="wishlist-card-image"
                    onError={() =>
                      setFailedImagesById((current) => ({
                        ...current,
                        [item.id]: true,
                      }))
                    }
                  />
                ) : (
                  <div
                    className="wishlist-card-image-placeholder"
                    aria-label={item.name}>
                    {item.name}
                  </div>
                )}
                <div className="wishlist-card-body">
                  <h3 className="wishlist-card-name">{item.name}</h3>
                  <div className="wishlist-card-meta">
                    <span className="wishlist-card-type">{item.type}</span>
                    <span className="wishlist-card-rating">
                      ★ {item.ratingAverage.toFixed(1)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="wishlist-card-view"
                    onClick={() => navigate(`/places/${item.placeId}`)}>
                    {t("user.wishlist.viewDetails", { defaultValue: "View details" })}
                  </button>
                  <button
                    type="button"
                    className="wishlist-card-remove"
                    onClick={() => void removeItem(item.placeId)}>
                    {t("user.wishlist.remove")}
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
