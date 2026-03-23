import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { fetchEventById } from "@/services/catalog/catalog.service";
import FeedbackSection from "../../components/feedback/FeedbackSection";
import "./EventDetail.css";

type EventPayload = {
  id: string;
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  venue?: { name?: string };
};

const EventDetail = () => {
  const { id = "" } = useParams();
  const [event, setEvent] = useState<EventPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const payload = await fetchEventById(id);
        setEvent((payload as EventPayload) ?? null);
      } catch {
        toast.error("Failed to load event details");
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      void load();
    }
  }, [id]);

  if (loading) return <div className="public-detail-page">Loading...</div>;
  if (!event) return <div className="public-detail-page">Event not found.</div>;

  return (
    <div className="public-detail-page">
      <h1>{event.title}</h1>
      <p>{event.description}</p>
      <p>
        Venue: {event.venue?.name ?? "-"} | Start:{" "}
        {event.startDate ? new Date(event.startDate).toLocaleString() : "-"}
      </p>
      <FeedbackSection target="event" targetId={event.id} />
    </div>
  );
};

export default EventDetail;

