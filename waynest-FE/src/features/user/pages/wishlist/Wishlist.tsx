import { useEffect, useState } from "react";
import { Card, Button, Empty, message } from "antd";
import { ADMIN_ENDPOINTS } from "../../../../api/endpoints";
import { get } from "../../../../api/apiService";
import { useAuth } from "../../../../context/AuthContext";
import "./Wishlist.css";

interface WishlistItem {
  id: string;
  name: string;
  description: string;
  type: string;
}

const Wishlist = () => {
  const { user } = useAuth();
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchWishlist = async () => {
      if (!user?.userId) return;
      try {
        setLoading(true);
        // Fetch places as wishlist items (can be filtered by user preferences later)
        const places = await get(ADMIN_ENDPOINTS.PLACES_LIST);
        const wishlistItems = Array.isArray(places)
          ? places.slice(0, 10).map((place: any) => ({
              id: place.id,
              name: place.name,
              description: place.description || "No description",
              type: place.type,
            }))
          : [];
        setWishlist(wishlistItems);
      } catch (error) {
        message.error("Failed to load wishlist");
      } finally {
        setLoading(false);
      }
    };

    fetchWishlist();
  }, [user]);

  const handleRemove = (id: string) => {
    setWishlist((prev) => prev.filter((item) => item.id !== id));
    message.success("Item removed from wishlist");
  };

  return (
    <section className="wishlist">
      <h1 className="wishlist-title">Your Wishlist</h1>
      {wishlist.length === 0 ? (
        <Empty description="No items in your wishlist" />
      ) : (
        <div className="wishlist-cards">
          {wishlist.map((item) => (
            <Card
              key={item.id}
              style={{ marginBottom: "16px" }}
              actions={[
                <Button
                  key="remove"
                  danger
                  onClick={() => handleRemove(item.id)}
                >
                  Remove
                </Button>,
              ]}
            >
              <Card.Meta
                title={item.name}
                description={`${item.type} - ${item.description.substring(0, 100)}...`}
              />
            </Card>
          ))}
        </div>
      )}
    </section>
  );
};

export default Wishlist;
