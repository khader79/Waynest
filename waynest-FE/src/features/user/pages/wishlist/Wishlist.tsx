import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { WISHLIST_ENDPOINTS } from "../../../../api/endpoints";
import { del, get } from "../../../../api/apiService";
import "./Wishlist.css";

type WishlistItem = {
  id: string;
  placeId: string;
  name: string;
  imageUrl: string | null;
  type: string;
  ratingAverage: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const extractWishlist = (payload: unknown): WishlistItem[] => {
  if (!Array.isArray(payload)) return [];

  return payload
    .map((item) => {
      if (!isRecord(item)) return null;
      if (typeof item.id !== "string" || typeof item.placeId !== "string") return null;
      const place = isRecord(item.place) ? (item.place as Record<string, unknown>) : null;
      const name = place && typeof place.name === "string" ? place.name : "";
      const type = place && typeof place.type === "string" ? place.type : "PLACE";
      const ratingAverage = place ? Number(place.ratingAverage ?? 0) : 0;
      const imageUrl = place && typeof place.imageUrl === "string" ? place.imageUrl : null;
      if (!name) return null;
      return {
        id: item.id,
        placeId: item.placeId,
        name,
        imageUrl,
        type,
        ratingAverage: Number.isFinite(ratingAverage) ? ratingAverage : 0,
      };
    })
    .filter((item): item is WishlistItem => item !== null);
};

const Wishlist = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      const data = await get(WISHLIST_ENDPOINTS.LIST);
      setItems(extractWishlist(data));
    } catch {
      toast.error("Failed to load wishlist");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchWishlist();
  }, []);

  const handleRemove = async (placeId: string) => {
    const previous = items;
    setItems((prev) => prev.filter((item) => item.placeId !== placeId));
    try {
      await del(WISHLIST_ENDPOINTS.REMOVE(placeId));
      toast.success("Removed from wishlist");
    } catch {
      setItems(previous);
      toast.error("Failed to remove item");
    }
  };

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
                  onClick={() => handleRemove(item.placeId)}>
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
