import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useWishlistPage } from "@/hooks/user/useWishlistPage";
import "./Wishlist.css";

const Wishlist = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { items, loading, removeItem } = useWishlistPage();

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
          {items.map((item) => (
            <div key={item.id} className="wishlist-card">
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="wishlist-card-image"
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
                  View details
                </button>
                <button
                  type="button"
                  className="wishlist-card-remove"
                  onClick={() => void removeItem(item.placeId)}>
                  {t("user.wishlist.remove")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default Wishlist;
