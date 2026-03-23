import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { fetchPlaceById } from "@/services/catalog/catalog.service";
import FeedbackSection from "../../components/feedback/FeedbackSection";
import "./PlaceDetail.css";

type PlacePayload = {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string | null;
  type?: string;
  city?: { name?: string };
};

const PlaceDetail = () => {
  const { id = "" } = useParams();
  const [place, setPlace] = useState<PlacePayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const payload = await fetchPlaceById(id);
        setPlace((payload as PlacePayload) ?? null);
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

  if (loading) return <div className="public-detail-page">Loading...</div>;
  if (!place) return <div className="public-detail-page">Place not found.</div>;

  return (
    <div className="public-detail-page">
      <h1>{place.name}</h1>
      {place.imageUrl && <img src={place.imageUrl} alt={place.name} className="public-detail-image" />}
      <p>{place.description}</p>
      <p>
        Type: {place.type ?? "-"} | City: {place.city?.name ?? "-"}
      </p>
      <FeedbackSection target="place" targetId={place.id} />
    </div>
  );
};

export default PlaceDetail;

