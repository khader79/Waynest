import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { fetchEventById } from "@/api/catalog";
import { useCurrency } from "@/context/CurrencyContext";
import formatCurrency, { convertAmount } from "@/utils/currency";
import FeedbackSection from "@/components/public/feedback/FeedbackSection";
import "./EventDetail.css";

const eventImageFallback =
  "https://images.unsplash.com/photo-1511578314322-379afb476865?w=1400&q=75&auto=format&fit=crop";

const EventDetail = () => {
  const { id = "" } = useParams();
  const [event, setEvent] = useState(null);
  const [originalEvent, setOriginalEvent] = useState(null);
  const [convertedEvent, setConvertedEvent] = useState(null);
  const [displayCurrency, setDisplayCurrency] = useState(null);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();
  const {
    currencies,
    selectedCurrency,
    setSelectedCurrency,
    loading: currencyLoading,
  } = useCurrency();

  // load original event first (no conversion)
  useEffect(() => {
    let active = true;
    const loadOriginal = async () => {
      setLoading(true);
      try {
        const payload = await fetchEventById(id);
        if (!active) return;
        setOriginalEvent(payload ?? null);
        setEvent(payload ?? null);
      } catch {
        if (!active) return;
        toast.error("Failed to load event details");
      } finally {
        if (active) setLoading(false);
      }
    };

    if (id) void loadOriginal();
    return () => {
      active = false;
    };
  }, [id]);

  // Derive and set the initial display currency once after original event loads.
  // Do NOT override `displayCurrency` if the user already picked a currency.
  useEffect(() => {
    if (!originalEvent || displayCurrency != null) return;

    const deriveCurrency = () => {
      const e = originalEvent;
      if (!e) return selectedCurrency ?? null;
      const pricing =
        e.ticketPrice ||
        e.price ||
        (Array.isArray(e.pricing) && e.pricing[0]) ||
        null;
      if (pricing && typeof pricing === "object")
        return (
          pricing.currencyCode ?? pricing.currency ?? selectedCurrency ?? null
        );
      if (e.currencyCode || e.currency) return e.currencyCode ?? e.currency;
      return selectedCurrency ?? null;
    };

    setDisplayCurrency(deriveCurrency());
  }, [originalEvent, selectedCurrency, displayCurrency]);

  // compute converted event payload client-side when displayCurrency changes
  useEffect(() => {
    let active = true;
    const loadConverted = async () => {
      if (!displayCurrency || !originalEvent) return;

      const p =
        originalEvent.ticketPrice ||
        originalEvent.price ||
        (Array.isArray(originalEvent.pricing) && originalEvent.pricing[0]) ||
        null;
      const amount = p
        ? (p.basePrice ??
          p.price ??
          p.amount ??
          p.ticketPrice ??
          originalEvent.ticketPrice ??
          null)
        : null;
      const currency = p
        ? (p.currencyCode ??
          p.currency ??
          originalEvent.currencyCode ??
          originalEvent.currency ??
          null)
        : (originalEvent.currencyCode ?? originalEvent.currency ?? null);

      if (amount == null || !currency) {
        setConvertedEvent(null);
        setEvent(originalEvent);
        return;
      }

      if (displayCurrency === currency) {
        setConvertedEvent(null);
        setEvent(originalEvent);
        return;
      }

      try {
        setLoading(true);
        const convAmount = convertAmount(amount, currency, displayCurrency);
        const synthetic = {
          ...originalEvent,
          ticketPrice: convAmount,
          price: convAmount,
          currencyCode: displayCurrency,
        };
        if (!active) return;
        setConvertedEvent(synthetic);
        setEvent(synthetic);
      } catch {
        if (!active) return;
        setConvertedEvent(null);
        setEvent(originalEvent);
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadConverted();
    return () => {
      active = false;
    };
  }, [displayCurrency, originalEvent, id]);

  if (loading) {
    return (
      <div className="event-detail-page">
        <div className="event-detail-shell event-detail-shell--loading">
          Loading event details...
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="event-detail-page">
        <div className="event-detail-shell event-detail-shell--empty">
          Event not found.
        </div>
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
            <div className="event-detail-overlay-top">
              {!currencyLoading &&
              Array.isArray(currencies) &&
              currencies.length > 0 ? (
                <select
                  className="event-detail-currency-select"
                  value={displayCurrency ?? ""}
                  onChange={(e) => {
                    const code = e.target.value;
                    setDisplayCurrency(code);
                    try {
                      setSelectedCurrency(code);
                    } catch {}
                  }}
                  aria-label="Select currency"
                  title="Select currency">
                  {currencies.map((c) => {
                    const code = c.code ?? c.iso ?? c.id ?? String(c);
                    const label = c.code
                      ? `${c.code} ${c.name ? `— ${c.name}` : ""}`
                      : code;
                    return (
                      <option key={code} value={code}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              ) : null}
            </div>

            <h1>{event.title}</h1>
            <p>
              {event.description ||
                "No description available yet for this event."}
            </p>
          </div>
        </section>

        <div className="event-detail-cta">
          <button
            type="button"
            className="event-detail-cta__btn"
            disabled
            aria-disabled="true"
            title={t("provider.business.bookNowComingSoon", {
              defaultValue: "Book (Coming soon)",
            })}>
            {t("provider.business.bookNowComingSoon", {
              defaultValue: "Book (Coming soon)",
            })}
          </button>
        </div>

        <section className="event-detail-meta-grid">
          <div className="event-detail-meta-card">
            <span className="event-detail-meta-label">Venue</span>
            <strong>{event.venue?.name ?? "-"}</strong>
          </div>
          <div className="event-detail-meta-card">
            <span className="event-detail-meta-label">Price</span>
            <strong>
              {(() => {
                const e = originalEvent ?? event;
                if (!e) return "-";
                // possible shapes: ticketPrice, price, pricing array
                const p =
                  e.ticketPrice ||
                  e.price ||
                  (Array.isArray(e.pricing) && e.pricing[0]) ||
                  null;
                const amount = p
                  ? (p.basePrice ??
                    p.price ??
                    p.amount ??
                    p.ticketPrice ??
                    e.ticketPrice ??
                    null)
                  : null;
                const currency = p
                  ? (p.currencyCode ??
                    p.currency ??
                    e.currencyCode ??
                    e.currency ??
                    displayCurrency)
                  : (e.currencyCode ?? e.currency ?? displayCurrency);
                if (amount == null) return "-";
                const formatted = currency
                  ? formatCurrency(amount, currency)
                  : String(amount);

                // if convertedEvent present, show approx
                if (convertedEvent) {
                  const cp = convertedEvent;
                  const cpP =
                    cp.ticketPrice ||
                    cp.price ||
                    (Array.isArray(cp.pricing) && cp.pricing[0]) ||
                    null;
                  const convAmount = cpP
                    ? (cpP.basePrice ??
                      cpP.price ??
                      cpP.amount ??
                      cp.ticketPrice ??
                      null)
                    : (cp.ticketPrice ?? cp.price ?? null);
                  const convCurrency = cpP
                    ? (cpP.currencyCode ?? cpP.currency ?? null)
                    : (cp.currencyCode ?? cp.currency ?? displayCurrency);
                  if (convAmount != null && convCurrency)
                    return (
                      <span>
                        {formatted}
                        <span
                          style={{
                            marginLeft: 8,
                            fontWeight: 400,
                            fontSize: 13,
                          }}>
                          ≈ {formatCurrency(convAmount, convCurrency)}
                        </span>
                      </span>
                    );
                }

                return formatted;
              })()}
            </strong>
          </div>
          <div className="event-detail-meta-card">
            <span className="event-detail-meta-label">Start</span>
            <strong>
              {event.startDate
                ? new Date(event.startDate).toLocaleString()
                : "-"}
            </strong>
          </div>
          <div className="event-detail-meta-card">
            <span className="event-detail-meta-label">End</span>
            <strong>
              {event.endDate ? new Date(event.endDate).toLocaleString() : "-"}
            </strong>
          </div>
        </section>

        <FeedbackSection target="event" targetId={event.id} />
      </article>
    </div>
  );
};

export default EventDetail;
