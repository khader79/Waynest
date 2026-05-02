import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { FiArrowLeft, FiCalendar, FiMapPin, FiStar } from "react-icons/fi";
import { fetchPublicEvents } from "@/api/catalog";
import { fetchTripPlanById } from "@/api/trips";
import { loadTripResult } from "@/utils/trips/storage";
import { normalizeStoredPlan } from "@/utils/trips/dataNormalizers";
import styles from "./TripPlanner.module.css";

const SLOT_ORDER = ["morning", "afternoon", "evening"];
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const parseDate = (value) => {
  const parsed = new Date(value ?? "");
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatLongDate = (value) => {
  const parsed = parseDate(value);
  if (!parsed) return "Scheduled item";
  return parsed.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

const formatMonthTitle = (value) => {
  const parsed = parseDate(value);
  if (!parsed) return "Calendar";
  return parsed.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
};

const getDayEntries = (day) =>
  SLOT_ORDER.map((slotKey) => {
    const slot = day?.[slotKey];
    if (!slot) return null;

    return {
      id: `${day.day}-${slotKey}-${slot.eventId ?? slot.placeId ?? slot.name}`,
      entryType: "trip",
      slotKey,
      label: slot.name,
      sublabel: String(slot.type ?? "").toUpperCase() === "EVENT" ? "Trip event" : slot.type || "Trip stop",
      startDate: day.date,
      openTime: slot.openTime,
      closeTime: slot.closeTime,
      eventId: slot.eventId,
      placeId: slot.placeId,
      isEvent: String(slot.type ?? "").toUpperCase() === "EVENT",
    };
  }).filter(Boolean);

const getEventEntries = (events) =>
  (Array.isArray(events) ? events : [])
    .map((event) => {
      const startDate = parseDate(event?.startDate);
      if (!startDate) return null;

      return {
        id: `event-${event.id}`,
        entryType: "event",
        slotKey: "event",
        label: event.title,
        sublabel: event.venue?.name || "Public event",
        startDate: startDate.toISOString(),
        openTime: startDate.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        closeTime: parseDate(event?.endDate)?.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        eventId: event.id,
        placeId: event.venue?.id,
        isEvent: true,
      };
    })
    .filter(Boolean);

const buildCalendarCells = (entries) => {
  const datedEntries = entries
    .filter((entry) => parseDate(entry.startDate))
    .sort((a, b) => parseDate(a.startDate).getTime() - parseDate(b.startDate).getTime());

  if (datedEntries.length === 0) {
    return { cells: [], monthTitle: "Calendar" };
  }

  const firstDate = parseDate(datedEntries[0].startDate);
  const lastDate = parseDate(datedEntries[datedEntries.length - 1].startDate);
  const monthStart = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
  const monthEnd = new Date(lastDate.getFullYear(), lastDate.getMonth() + 1, 0);
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - monthStart.getDay());
  const gridEnd = new Date(monthEnd);
  gridEnd.setDate(monthEnd.getDate() + (6 - monthEnd.getDay()));

  const entriesByDate = new Map();
  datedEntries.forEach((entry) => {
    const key = parseDate(entry.startDate).toDateString();
    const current = entriesByDate.get(key) ?? [];
    current.push(entry);
    entriesByDate.set(key, current);
  });

  const cells = [];
  for (let current = new Date(gridStart); current <= gridEnd; current.setDate(current.getDate() + 1)) {
    const snapshot = new Date(current);
    cells.push({
      iso: snapshot.toISOString(),
      dateNumber: snapshot.getDate(),
      inActiveMonth: snapshot >= monthStart && snapshot <= monthEnd,
      entries: entriesByDate.get(snapshot.toDateString()) ?? [],
    });
  }

  return {
    cells,
    monthTitle: formatMonthTitle(firstDate.toISOString()),
  };
};

export const TripPlannerCalendarPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tripPlan, setTripPlan] = useState(location.state?.tripPlan ?? null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadEverything = async () => {
      try {
        setLoading(true);

        const planId = searchParams.get("planId")?.trim();
        const storedTrip = tripPlan ?? loadTripResult();

        const tasks = [fetchPublicEvents(50)];
        if (!storedTrip && planId) {
          tasks.push(fetchTripPlanById(planId));
        }

        const results = await Promise.all(tasks);
        if (!active) return;

        const eventPayload = results[0];
        setEvents(Array.isArray(eventPayload?.data) ? eventPayload.data : []);

        if (storedTrip) {
          setTripPlan(storedTrip);
        } else if (results[1]) {
          setTripPlan(normalizeStoredPlan(results[1]));
        }
      } catch {
        if (!active) return;
        setEvents([]);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadEverything();
    return () => {
      active = false;
    };
  }, [searchParams, tripPlan]);

  const tripEntries = useMemo(
    () =>
      Array.isArray(tripPlan?.days)
        ? tripPlan.days.flatMap((day) => getDayEntries(day))
        : [],
    [tripPlan],
  );
  const publicEventEntries = useMemo(() => getEventEntries(events), [events]);
  const allEntries = useMemo(
    () => [...tripEntries, ...publicEventEntries],
    [tripEntries, publicEventEntries],
  );
  const { cells, monthTitle } = useMemo(
    () => buildCalendarCells(allEntries),
    [allEntries],
  );

  const handleOpenEntry = (entry) => {
    if (entry.eventId) {
      navigate(`/events/${entry.eventId}`);
      return;
    }
    if (entry.placeId) {
      navigate(`/places/${entry.placeId}`);
    }
  };

  const tripDaysCount = Array.isArray(tripPlan?.days) ? tripPlan.days.length : 0;

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.calendarPageShell}>
          <div className={styles.emptyState}>
            <strong>Loading Waynest calendar...</strong>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.calendarPageShell}>
        <div className={styles.calendarPageHeader}>
          <div>
            <span className={styles.heroBadge}>
              <FiCalendar aria-hidden="true" />
              Waynest Calendar
            </span>
            <h1 className={styles.calendarPageTitle}>{monthTitle}</h1>
            <p className={styles.calendarPageSubtitle}>
              One calendar for public events plus your current trip itinerary when available.
              This page is separate from the planner so users can open it from anywhere.
            </p>
          </div>

          <div className={styles.calendarPageTopActions}>
            <Link to="/plan" className={styles.secondaryActionButton}>
              <FiArrowLeft aria-hidden="true" />
              Back to Planner
            </Link>
          </div>
        </div>

        <div className={styles.calendarStats}>
          <div className={styles.heroSignalCard}>
            <strong>{publicEventEntries.length}</strong>
            <span>Public events</span>
          </div>
          <div className={styles.heroSignalCard}>
            <strong>{tripDaysCount}</strong>
            <span>Trip days loaded</span>
          </div>
          <div className={styles.heroSignalCard}>
            <strong>{allEntries.length}</strong>
            <span>Total calendar items</span>
          </div>
        </div>

        <div className={styles.calendarLegend}>
          <span className={styles.signalPill}>Trip stops</span>
          <span className={`${styles.signalPill} ${styles.calendarLegendEvent}`}>
            Events
          </span>
        </div>

        {cells.length === 0 ? (
          <div className={styles.emptyState}>
            <strong>No calendar items available</strong>
            <p>Generate a trip plan or wait for public events to appear, then revisit this page.</p>
          </div>
        ) : (
          <>
            <div className={styles.calendarWeekdays}>
              {WEEKDAY_LABELS.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>

            <div className={styles.monthCalendarGrid}>
              {cells.map((cell) => (
                <article
                  key={cell.iso}
                  className={`${styles.monthCalendarCell} ${
                    cell.entries.length > 0 ? styles.monthCalendarCellActive : ""
                  } ${!cell.inActiveMonth ? styles.monthCalendarCellMuted : ""}`}>
                  <div className={styles.monthCalendarCellHeader}>
                    <span className={styles.monthCalendarDate}>{cell.dateNumber}</span>
                    {cell.entries.length > 0 ? (
                      <span className={styles.calendarDayPill}>{cell.entries.length} items</span>
                    ) : null}
                  </div>

                  {cell.entries.length > 0 ? (
                    <div className={styles.monthCalendarEntries}>
                      <strong className={styles.monthCalendarFullDate}>
                        {formatLongDate(cell.iso)}
                      </strong>
                      {cell.entries.map((entry) => (
                        <button
                          key={entry.id}
                          type="button"
                          className={`${styles.monthCalendarEntry} ${
                            entry.isEvent ? styles.monthCalendarEntryEvent : ""
                          }`}
                          onClick={() => handleOpenEntry(entry)}>
                          <span className={styles.calendarEntryLabel}>{entry.slotKey}</span>
                          <strong>{entry.label}</strong>
                          <span className={styles.calendarEntryType}>{entry.sublabel}</span>
                          {entry.openTime ? (
                            <span className={styles.calendarEntryTime}>
                              {entry.openTime}
                              {entry.closeTime ? ` - ${entry.closeTime}` : ""}
                            </span>
                          ) : null}
                          <span className={styles.monthCalendarLinkHint}>
                            {entry.entryType === "event" ? (
                              <FiStar aria-hidden="true" />
                            ) : (
                              <FiMapPin aria-hidden="true" />
                            )}
                            Open details
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.monthCalendarEmpty}>No planned items</div>
                  )}
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default TripPlannerCalendarPage;
