import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { fetchPlaceById } from "@/modules/public/api/catalog";
import FeedbackSection from "../../components/feedback/FeedbackSection";
import "./PlaceDetail.css";












const placeImageFallback =
"https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1400&q=75&auto=format&fit=crop";

const PlaceDetail = () => {
  const { id = "" } = useParams();
  const [place, setPlace] = useState(null);
  const [loading, setLoading] = useState(true);

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
    if (id) {
      void load();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="place-detail-page">
        <div className="place-detail-shell place-detail-shell--loading">Loading place details...</div>
      </div>);

  }

  if (!place) {
    return (
      <div className="place-detail-page">
        <div className="place-detail-shell place-detail-shell--empty">Place not found.</div>
      </div>);

  }

  return (
    <div className="place-detail-page">
      <article className="place-detail-shell">
        <section className="place-detail-hero">
          <img
            src={place.imageUrl || placeImageFallback}
            alt={place.name}
            className="place-detail-image"
            onError={({ currentTarget }) => {
              currentTarget.onerror = null;
              currentTarget.src = placeImageFallback;
            }} />
          
          <div className="place-detail-overlay">
            <h1>{place.name}</h1>
            <p>{place.description || "No description available yet for this place."}</p>
          </div>
        </section>

        <section className="place-detail-meta-grid">
          <div className="place-detail-meta-card">
            <span className="place-detail-meta-label">Type</span>
            <strong>{place.type ?? "-"}</strong>
          </div>
          <div className="place-detail-meta-card">
            <span className="place-detail-meta-label">City</span>
            <strong>{place.city?.name ?? "-"}</strong>
          </div>
          <div className="place-detail-meta-card">
            <span className="place-detail-meta-label">Average Rating</span>
            <strong>{Number(place.ratingAverage ?? 0).toFixed(1)} / 5</strong>
          </div>
          <div className="place-detail-meta-card">
            <span className="place-detail-meta-label">Ratings Count</span>
            <strong>{place.ratingCount ?? 0}</strong>
          </div>
        </section>

        <FeedbackSection target="place" targetId={place.id} />
      </article>
    </div>);

};

export default PlaceDetail;