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
  imageUrl?: string | null;
};

const eventImageFallback =
  "https://images.unsplash.com/photo-1511578314322-379afb476865?w=1400&q=75&auto=format&fit=crop";

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

  if (loading) {
    return (
      <div className="event-detail-page">
        <div className="event-detail-shell event-detail-shell--loading">Loading event details...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="event-detail-page">
        <div className="event-detail-shell event-detail-shell--empty">Event not found.</div>
      </div>
    );
  }

  return (
    <div className="event-detail-page">
      <article className="event-detail-shell">
        <section className="event-detail-hero">
          <img
            src={event.imageUrl || eventImageFallback}
            alt={event.title}
            className="event-detail-image"
            onError={({ currentTarget }) => {
              currentTarget.onerror = null;
              currentTarget.src = eventImageFallback;
            }}
          />
          <div className="event-detail-overlay">
            <h1>{event.title}</h1>
            <p>{event.description || "No description available yet for this event."}</p>
          </div>
        </section>

        <section className="event-detail-meta-grid">
          <div className="event-detail-meta-card">
            <span className="event-detail-meta-label">Venue</span>
            <strong>{event.venue?.name ?? "-"}</strong>
          </div>
          <div className="event-detail-meta-card">
            <span className="event-detail-meta-label">Start</span>
            <strong>{event.startDate ? new Date(event.startDate).toLocaleString() : "-"}</strong>
          </div>
          <div className="event-detail-meta-card">
            <span className="event-detail-meta-label">End</span>
            <strong>{event.endDate ? new Date(event.endDate).toLocaleString() : "-"}</strong>
          </div>
        </section>

        <FeedbackSection target="event" targetId={event.id} />
      </article>
    </div>
  );
};

export default EventDetail;

