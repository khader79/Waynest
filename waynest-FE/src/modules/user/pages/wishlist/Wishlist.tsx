import { useNavigate } from "react-router-dom";
import { useWishlistPage } from "../../hooks/useWishlistPage";
import "./Wishlist.css";

const Wishlist = () => {
  const navigate = useNavigate();
  const { items, loading, removeItem } = useWishlistPage();

  return (
    <section className="wishlist-page">
      <h1 className="wishlist-title">Wishlist</h1>
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
          <p>Your wishlist is empty. Start exploring!</p>
          <button
            type="button"
            className="wishlist-explore-button"
            onClick={() => navigate("/explore")}>
            Explore Places
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
                <div className="wishlist-card-image-placeholder" />
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
                  className="wishlist-card-remove"
                  onClick={() => void removeItem(item.placeId)}>
                  Remove
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
