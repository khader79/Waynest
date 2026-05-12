import { useEffect, useMemo, useState, useRef } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  FiArrowLeft,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiExternalLink,
  FiInfo,
  FiMapPin,
  FiPlus,
  FiRefreshCw,
  FiStar,
  FiTrash2,
  FiUsers,
} from "react-icons/fi";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";
import { fetchPublicEvents } from "@/api/catalog";
import { get } from "@/api/request";
import {
  createCalendarEntry,
  deleteCalendarEntry,
  fetchCalendarEntries,
  updateCalendarEntry,
} from "@/api/calendar";
import { fetchSavedTripPlans, fetchTripPlanById } from "@/api/trips";
import { fetchFriends } from "@/api/social";
import { loadTripResult } from "@/utils/trips/storage";
import {
  extractTripPlans,
  normalizeStoredPlan,
} from "@/utils/trips/dataNormalizers";
import styles from "./TripPlanner.module.css";

const SLOT_ORDER = ["morning", "afternoon", "evening"];
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const parseDate = (value) => {
  const parsed = new Date(value ?? "");
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toDateInputValue = (value = new Date()) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const offsetMs = parsed.getTimezoneOffset() * 60_000;
  return new Date(parsed.getTime() - offsetMs).toISOString().slice(0, 10);
};

const toMonthInputValue = (value = new Date()) => {
  const parsed = parseDate(value);
  if (!parsed) return "";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const monthInputToDate = (value) => {
  const raw = normalizeInput(value);
  const match = raw.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
  return new Date(year, month, 1);
};

const addMonths = (value, amount) => {
  const parsed = parseDate(value) || new Date();
  return new Date(parsed.getFullYear(), parsed.getMonth() + amount, 1);
};

const normalizeInput = (value) =>
  typeof value === "string" ? value.trim() : "";

const getFriendDisplayName = (friend) =>
  `${friend.firstName ?? ""} ${friend.lastName ?? ""}`.trim() ||
  friend.username ||
  "Traveler";

const buildCalendarDraft = (locationState, searchParams) => {
  const stateDraft = locationState?.calendarDraft ?? {};
  const placeId =
    searchParams.get("placeId")?.trim() ?? stateDraft.placeId ?? "";
  const placeName =
    searchParams.get("placeName")?.trim() ?? stateDraft.placeName ?? "";
  const title =
    searchParams.get("title")?.trim() ?? stateDraft.title ?? placeName;
  const eventId =
    searchParams.get("eventId")?.trim() ?? stateDraft.eventId ?? "";

  return {
    title: normalizeInput(title),
    placeId: normalizeInput(placeId),
    placeName: normalizeInput(placeName),
    placeSlug: normalizeInput(stateDraft.placeSlug ?? ""),
    eventId: normalizeInput(eventId),
    cityName: normalizeInput(
      searchParams.get("cityName")?.trim() ?? stateDraft.cityName ?? "",
    ),
    date:
      normalizeInput(
        searchParams.get("date")?.trim() ?? stateDraft.date ?? "",
      ) || toDateInputValue(),
    time: normalizeInput(
      searchParams.get("time")?.trim() ?? stateDraft.time ?? "",
    ),
    endTime: normalizeInput(
      searchParams.get("endTime")?.trim() ?? stateDraft.endTime ?? "",
    ),
    notes: normalizeInput(stateDraft.notes ?? ""),
    sourceType:
      normalizeInput(
        searchParams.get("sourceType")?.trim() ?? stateDraft.sourceType ?? "",
      ) || (eventId ? "event" : placeId ? "place" : "manual"),
  };
};

const buildEmptyCalendarDraft = () => ({
  title: "",
  placeId: "",
  placeName: "",
  placeSlug: "",
  eventId: "",
  cityName: "",
  date: "",
  time: "",
  endTime: "",
  notes: "",
  sourceType: "manual",
});

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
      sublabel:
        String(slot.type ?? "").toUpperCase() === "EVENT"
          ? "Trip event"
          : slot.type || "Trip stop",
      startDate: day.date,
      openTime: slot.openTime,
      closeTime: slot.closeTime,
      eventId: slot.eventId,
      placeId: slot.placeId,
      placeSlug: slot.placeSlug,
      isEvent: String(slot.type ?? "").toUpperCase() === "EVENT",
    };
  }).filter(Boolean);

const getPersonalEntries = (entries) =>
  (Array.isArray(entries) ? entries : [])
    .map((entry) => {
      const startDate = parseDate(entry?.date ?? entry?.calendarDate);
      if (!startDate) return null;

      const isEvent = Boolean(entry?.eventId) || entry?.sourceType === "event";

      return {
        id: `personal-${entry.id}`,
        entryType: "personal",
        slotKey: entry.time || entry.startTime ? "planned" : "saved",
        label: entry.title,
        sublabel:
          entry.placeName ||
          entry.place?.name ||
          entry.cityName ||
          entry.place?.cityName ||
          entry.sourceLabel ||
          "Saved item",
        startDate: startDate.toISOString(),
        openTime: entry.time || entry.startTime || undefined,
        closeTime: entry.endTime || undefined,
        eventId: entry.eventId || undefined,
        placeId: entry.placeId || undefined,
        placeSlug: entry.place?.slug || undefined,
        isEvent,
        calendarId: entry.id,
        notes: entry.notes || undefined,
        sourceType: entry.sourceType || "manual",
        sourceLabel: entry.sourceLabel || undefined,
        ownerUserId: entry.ownerUserId,
        sharedWithUserIds: Array.isArray(entry.sharedWithUserIds)
          ? entry.sharedWithUserIds
          : [],
        collaborators: Array.isArray(entry.collaborators)
          ? entry.collaborators
          : [],
        place: entry.place || null,
      };
    })
    .filter(Boolean);

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
        placeSlug: event.venue?.slug,
        isEvent: true,
      };
    })
    .filter(Boolean);

const buildCalendarCells = (entries, visibleDate = new Date()) => {
  const datedEntries = entries
    .filter((entry) => parseDate(entry.startDate))
    .sort(
      (a, b) =>
        parseDate(a.startDate).getTime() - parseDate(b.startDate).getTime(),
    );

  const visible = parseDate(visibleDate) || new Date();
  const monthStart = new Date(visible.getFullYear(), visible.getMonth(), 1);
  const monthEnd = new Date(visible.getFullYear(), visible.getMonth() + 1, 0);
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
  for (
    let current = new Date(gridStart);
    current <= gridEnd;
    current.setDate(current.getDate() + 1)
  ) {
    const snapshot = new Date(current);
    cells.push({
      iso: snapshot.toISOString(),
      dateNumber: snapshot.getDate(),
      inActiveMonth: snapshot >= monthStart && snapshot <= monthEnd,
      entries: (entriesByDate.get(snapshot.toDateString()) ?? [])
        .slice()
        .sort((a, b) => {
          const priority = { trip: 0, event: 1, personal: 2 };
          const aOrder = `${priority[a.entryType] ?? 9}-${a.openTime ?? "zz"}-${a.label ?? ""}`;
          const bOrder = `${priority[b.entryType] ?? 9}-${b.openTime ?? "zz"}-${b.label ?? ""}`;
          return aOrder.localeCompare(bOrder);
        }),
    });
  }

  return {
    cells,
    monthTitle: formatMonthTitle(monthStart.toISOString()),
  };
};

export const TripPlannerCalendarPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, user } = useAuth();
  const [tripPlan, setTripPlan] = useState(location.state?.tripPlan ?? null);
  const [events, setEvents] = useState([]);
  const [calendarEntries, setCalendarEntries] = useState([]);
  const [calendarDraft, setCalendarDraft] = useState(() =>
    buildCalendarDraft(location.state, searchParams),
  );
  const [placeSuggestions, setPlaceSuggestions] = useState([]);
  const [friends, setFriends] = useState([]);
  const [sharedWithUserIds, setSharedWithUserIds] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);
  const [visibleDate, setVisibleDate] = useState(() => new Date());
  const suggestionDebounce = useRef(null);
  const composerRef = useRef(null);
  const userChangedVisibleMonth = useRef(false);
  const [loading, setLoading] = useState(true);
  const [showComposerModal, setShowComposerModal] = useState(false);
  // keep inline composer hidden by default so the page stays clean
  const [showInlineComposer] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCalendarDraft(buildCalendarDraft(location.state, searchParams));
  }, [location.key, location.search]);

  useEffect(() => {
    let active = true;

    if (!isAuthenticated) {
      setFriends([]);
      setSharedWithUserIds([]);
      return () => {
        active = false;
      };
    }

    fetchFriends()
      .then((rows) => {
        if (active) setFriends(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (active) setFriends([]);
      });

    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    let active = true;

    const loadEverything = async () => {
      try {
        setLoading(true);

        const planId = normalizeInput(searchParams.get("planId"));
        const storedTrip = location.state?.tripPlan ?? loadTripResult();

        const tasks = [fetchPublicEvents(200)];
        if (isAuthenticated) {
          tasks.push(fetchCalendarEntries());
        }

        const results = await Promise.all(tasks);
        if (!active) return;

        const eventPayload = results[0];
        setEvents(Array.isArray(eventPayload?.data) ? eventPayload.data : []);

        const calendarPayload = isAuthenticated ? results[1] : [];
        setCalendarEntries(
          Array.isArray(calendarPayload) ? calendarPayload : [],
        );

        let remotePlan = null;
        if (isAuthenticated) {
          try {
            const storedPlanId = normalizeInput(storedTrip?.tripPlanId);
            const targetPlanId = planId || storedPlanId;

            if (targetPlanId) {
              remotePlan = await fetchTripPlanById(targetPlanId);
            } else {
              const savedPlansPayload = await fetchSavedTripPlans();
              const savedPlans = extractTripPlans(savedPlansPayload).sort(
                (a, b) =>
                  new Date(b.createdAt ?? 0).getTime() -
                  new Date(a.createdAt ?? 0).getTime(),
              );
              const latestPlanId = savedPlans[0]?.id;
              if (latestPlanId) {
                remotePlan = await fetchTripPlanById(latestPlanId);
              }
            }
          } catch {
            remotePlan = null;
          }
        }

        const normalizedRemote = remotePlan
          ? normalizeStoredPlan(remotePlan)
          : null;

        if (normalizedRemote) {
          setTripPlan(normalizedRemote);
        } else if (storedTrip) {
          setTripPlan(storedTrip);
        }
      } catch {
        if (!active) return;
        setEvents([]);
        setCalendarEntries([]);
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
  }, [isAuthenticated, searchParams, location.key, location.search]);

  useEffect(() => {
    if (!isAuthenticated || typeof window === "undefined") {
      return undefined;
    }

    let active = true;
    const onNotification = (event) => {
      const payload = event?.detail;
      if (!payload || typeof payload !== "object") {
        return;
      }

      const type =
        typeof payload.type === "string" ? payload.type.toUpperCase() : "";
      const href = typeof payload.href === "string" ? payload.href.trim() : "";
      const meta =
        payload.meta && typeof payload.meta === "object" ? payload.meta : null;
      const hasCalendarMeta =
        Boolean(meta?.calendarEntryId) ||
        Boolean(meta?.calendarDate) ||
        Boolean(meta?.placeId);

      if (
        type !== "CALENDAR_SHARED" &&
        !href.startsWith("/calendar") &&
        !hasCalendarMeta
      ) {
        return;
      }

      void fetchCalendarEntries()
        .then((rows) => {
          if (!active) return;
          setCalendarEntries(Array.isArray(rows) ? rows : []);
        })
        .catch(() => undefined);
    };

    window.addEventListener("notification:new", onNotification);

    return () => {
      active = false;
      window.removeEventListener("notification:new", onNotification);
    };
  }, [isAuthenticated]);

  const handleOpenEntry = (entry) => {
    if (entry.eventId) {
      navigate(`/events/${entry.eventId}`);
      return;
    }
    if (entry.placeId) {
      navigate(
        `/places/${encodeURIComponent(entry.placeSlug || entry.placeId)}`,
      );
    }
  };

  const handleToggleCollaborator = (userId) => {
    setSharedWithUserIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  };

  const handleShowEntryDetails = (entry) => {
    setSelectedEntry(entry);
  };

  const handleCloseEntryDetails = () => {
    setSelectedEntry(null);
  };

  const handleJumpToComposer = () => {
    composerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleShiftMonth = (amount) => {
    userChangedVisibleMonth.current = true;
    setVisibleDate((current) => addMonths(current, amount));
  };

  const handleGoToday = () => {
    userChangedVisibleMonth.current = true;
    const today = new Date();
    setVisibleDate(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  const handleMonthInputChange = (event) => {
    const next = monthInputToDate(event.target.value);
    if (!next) return;
    userChangedVisibleMonth.current = true;
    setVisibleDate(next);
  };

  const handleSaveCalendarEntry = () => {
    if (saving) return;
    if (!isAuthenticated) {
      toast.info("Login to save calendar items to your account");
      navigate("/login");
      return;
    }

    const title = normalizeInput(calendarDraft.title);
    const hasPlace = normalizeInput(calendarDraft.placeId);
    if (!title && !hasPlace) {
      toast.error("Add a title or choose a place first");
      return;
    }

    if (normalizeInput(calendarDraft.placeName) && !calendarDraft.placeId) {
      toast.error("Choose a place from the Waynest places list");
      return;
    }

    const date = parseDate(calendarDraft.date);
    if (!date) {
      toast.error("Pick a valid calendar date");
      return;
    }

    const payload = {
      title: title || normalizeInput(calendarDraft.placeName),
      date: date.toISOString(),
      time: normalizeInput(calendarDraft.time),
      endTime: normalizeInput(calendarDraft.endTime),
      placeId: normalizeInput(calendarDraft.placeId),
      eventId: normalizeInput(calendarDraft.eventId),
      notes: normalizeInput(calendarDraft.notes),
      sourceType: normalizeInput(calendarDraft.sourceType) || "manual",
      sourceLabel:
        normalizeInput(calendarDraft.placeName) ||
        normalizeInput(calendarDraft.cityName) ||
        "Manual calendar item",
      sharedWithUserIds,
    };

    if (editingEntry) {
      setSaving(true);
      updateCalendarEntry(editingEntry.calendarId, payload)
        .then((updated) => {
          setCalendarEntries((current) =>
            current.map((entry) =>
              entry.id === updated.id ? updated : entry,
            ),
          );
          setEditingEntry(null);
          setCalendarDraft(buildEmptyCalendarDraft());
          setPlaceSuggestions([]);
          setShowSuggestions(false);
          setSharedWithUserIds([]);
          toast.success("Calendar item updated");
          setShowComposerModal(false);
        })
        .catch(() => {
          toast.error("Failed to update calendar item");
        })
        .finally(() => setSaving(false));
    } else {
      setSaving(true);
      createCalendarEntry(payload)
        .then((saved) => {
          setCalendarEntries((current) => [
            saved,
            ...current.filter((entry) => entry.id !== saved.id),
          ]);
          setCalendarDraft(buildEmptyCalendarDraft());
          setPlaceSuggestions([]);
          setShowSuggestions(false);
          setSharedWithUserIds([]);
          toast.success("Added to calendar");
          setShowComposerModal(false);
        })
        .catch(() => {
          toast.error("Failed to save calendar item");
        })
        .finally(() => setSaving(false));
    }
  };

  const handleEditEntry = (entry) => {
    setEditingEntry(entry);
    setCalendarDraft({
      title: entry.label || "",
      placeId: entry.placeId || "",
      placeName: entry.place?.name || entry.sublabel || "",
      placeSlug: entry.place?.slug || "",
      eventId: entry.eventId || "",
      cityName: entry.place?.cityName || "",
      date: toDateInputValue(entry.startDate),
      time: entry.openTime || "",
      endTime: entry.closeTime || "",
      notes: entry.notes || "",
      sourceType: entry.sourceType || "manual",
    });
    setSharedWithUserIds(entry.sharedWithUserIds || []);
    setShowComposerModal(true);
    setSelectedEntry(null);
  };

  const handleRemoveCalendarEntry = (entryId) => {
    deleteCalendarEntry(entryId)
      .then(() => {
        setCalendarEntries((current) =>
          current.filter((entry) => entry.id !== entryId),
        );
        toast.info("Removed from calendar");
      })
      .catch(() => {
        toast.error("Failed to remove calendar item");
      });
  };

  const tripEntries = useMemo(
    () =>
      Array.isArray(tripPlan?.days)
        ? tripPlan.days.flatMap((day) => getDayEntries(day))
        : [],
    [tripPlan],
  );
  const publicEventEntries = useMemo(() => getEventEntries(events), [events]);
  const personalEntries = useMemo(
    () => getPersonalEntries(calendarEntries)
      .filter((e) => !(e.sourceType === "trip_plan" && tripPlan)),
    [calendarEntries, tripPlan],
  );
  const allEntries = useMemo(
    () => [...tripEntries, ...publicEventEntries, ...personalEntries],
    [tripEntries, publicEventEntries, personalEntries],
  );

  useEffect(() => {
    if (userChangedVisibleMonth.current || allEntries.length === 0) return;
    const firstEntryDate = allEntries
      .map((entry) => parseDate(entry.startDate))
      .filter(Boolean)
      .sort((a, b) => a.getTime() - b.getTime())[0];
    if (firstEntryDate) {
      setVisibleDate(
        new Date(firstEntryDate.getFullYear(), firstEntryDate.getMonth(), 1),
      );
    }
  }, [allEntries]);

  const { cells, monthTitle } = useMemo(
    () => buildCalendarCells(allEntries, visibleDate),
    [allEntries, visibleDate],
  );

  const visibleMonthValue = toMonthInputValue(visibleDate);

  const tripDaysCount = Array.isArray(tripPlan?.days)
    ? tripPlan.days.length
    : 0;
  const personalItemsCount = personalEntries.length;
  const currentUserId = user?.id ?? user?.sub ?? "";

  if (loading) {
    return (
      <div className={styles.page}>
        <section className={styles.calendarPageShell}>
          <div className={styles.calendarPageHeader}>
            <div>
              <span className={styles.heroBadge}>
                <FiCalendar aria-hidden="true" />
                Waynest Calendar
              </span>
              <h1 className={styles.calendarPageTitle}>Calendar</h1>
            </div>
          </div>
          <div className={styles.calendarStats}>
            <div className={`${styles.heroSignalCard} ${styles.skeletonPulse}`}>
              <strong>&nbsp;</strong>
              <span>Loading events…</span>
            </div>
            <div className={`${styles.heroSignalCard} ${styles.skeletonPulse}`}>
              <strong>&nbsp;</strong>
              <span>Loading trips…</span>
            </div>
            <div className={`${styles.heroSignalCard} ${styles.skeletonPulse}`}>
              <strong>&nbsp;</strong>
              <span>Loading items…</span>
            </div>
          </div>
          <div className={styles.calendarToolbar}>
            <div className={`${styles.skeletonLine} ${styles.skeletonLineMd}`} />
          </div>
          <div className={styles.monthCalendarGrid}>
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className={`${styles.skeletonCell}`}>
                <div className={`${styles.skeletonLine} ${styles.skeletonLineSm}`} />
              </div>
            ))}
          </div>
        </section>
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
              One calendar for public events plus your current trip itinerary
              when available. This page is separate from the planner so users
              can open it from anywhere.
            </p>
          </div>

          <div className={styles.calendarPageTopActions}>
            <button
              type="button"
              className={`${styles.submitButton} ${styles.calendarAddButton}`}
              onClick={() => setShowComposerModal(true)}>
              <FiPlus aria-hidden="true" />
              Add item
            </button>
            <Link to="/plan" className={styles.secondaryActionButton}>
              <FiArrowLeft aria-hidden="true" />
              Back to Planner
            </Link>
          </div>
        </div>

        {showInlineComposer && (
          <div className={styles.calendarCard} ref={composerRef}>
            <div className={styles.calendarHeader}>
              <div>
                <span className={styles.heroBadge}>
                  <FiCalendar aria-hidden="true" />
                  {editingEntry ? "Edit calendar item" : "Add to calendar"}
                </span>
                <h3>{editingEntry ? "Edit calendar item" : "Pin a place to a day"}</h3>
              </div>
              <p className={styles.calendarHeaderText}>
                Pick a date, choose a place from Waynest, and share it with
                friends already connected to your account.
              </p>
            </div>

            <div className={styles.calendarGrid}>
              <div className={styles.calendarDayCard}>
                <div className={styles.calendarDayHeader}>
                  <strong>New calendar item</strong>
                  <span className={styles.calendarDayPill}>Collaborative</span>
                </div>

                <div className={styles.calendarComposer}>
                  <label className={styles.calendarField}>
                    <span>Title</span>
                    <input
                      type="text"
                      value={calendarDraft.title}
                      onChange={(event) =>
                        setCalendarDraft((current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                      placeholder="Museum morning, dinner, airport pickup"
                    />
                  </label>

                  <label className={styles.calendarField}>
                    <span>Waynest place</span>
                    <div style={{ position: "relative" }}>
                      <input
                        type="text"
                        value={calendarDraft.placeName}
                        onChange={(event) => {
                          const v = event.target.value;
                          setCalendarDraft((current) => ({
                            ...current,
                            placeName: v,
                            placeId: "",
                            placeSlug: "",
                            title: current.title || v,
                          }));
                          // debounce suggestions
                          if (suggestionDebounce.current) {
                            clearTimeout(suggestionDebounce.current);
                          }
                          suggestionDebounce.current = setTimeout(() => {
                            const q = v.trim();
                            if (q.length < 2) {
                              setPlaceSuggestions([]);
                              setShowSuggestions(false);
                              setSuggestionsLoading(false);
                              return;
                            }
                            setSuggestionsLoading(true);
                            void get(
                              `/place?q=${encodeURIComponent(q)}&limit=8`,
                            )
                              .then((res) => {
                                const rows = Array.isArray(res)
                                  ? res
                                  : (res?.data ?? []);
                                setPlaceSuggestions(rows);
                                setShowSuggestions(true);
                              })
                              .catch(() => {
                                setPlaceSuggestions([]);
                              })
                              .finally(() => setSuggestionsLoading(false));
                          }, 250);
                        }}
                        onFocus={() => {
                          if (placeSuggestions.length > 0) {
                            setShowSuggestions(true);
                            return;
                          }

                          setSuggestionsLoading(true);
                          void get(`/place?page=1&limit=8`)
                            .then((res) => {
                              const rows = Array.isArray(res)
                                ? res
                                : (res?.data ?? []);
                              setPlaceSuggestions(rows);
                              if (rows.length > 0) setShowSuggestions(true);
                            })
                            .catch(() => setPlaceSuggestions([]))
                            .finally(() => setSuggestionsLoading(false));
                        }}
                        onBlur={() => {
                          setTimeout(() => setShowSuggestions(false), 150);
                        }}
                        placeholder="Restaurant, landmark, hotel, etc."
                      />

                      {showSuggestions && placeSuggestions.length > 0 && (
                        <ul
                          role="listbox"
                          style={{
                            position: "absolute",
                            zIndex: 60,
                            left: 0,
                            right: 0,
                            background: "white",
                            border: "1px solid #e6e6e6",
                            maxHeight: 240,
                            overflow: "auto",
                            margin: 0,
                            padding: 0,
                            listStyle: "none",
                          }}>
                          {placeSuggestions.map((p) => (
                            <li
                              key={p.id}
                              role="option"
                              onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => {
                                    setCalendarDraft((current) => ({
                                      ...current,
                                      placeId: p.id,
                                      placeSlug: p.slug || "",
                                      placeName: p.name,
                                      cityName: p.city?.name || current.cityName,
                                      sourceType: "place",
                                    }));
                                    setShowSuggestions(false);
                                  }}
                                  style={{
                                    padding: "8px 10px",
                                    borderBottom: "1px solid #f1f1f1",
                                    cursor: "pointer",
                                  }}>
                              <div style={{ fontWeight: 600 }}>{p.name}</div>
                              <div style={{ fontSize: 12, color: "#666" }}>
                                {p.city?.name || p.provider?.displayName || ""}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                      {calendarDraft.placeName && !calendarDraft.placeId ? (
                        <small className={styles.calendarFieldHint}>
                          Choose a place from the dropdown so the calendar item
                          opens the real place details.
                        </small>
                      ) : null}
                      {suggestionsLoading ? (
                        <small className={styles.calendarFieldHint}>
                          Loading places...
                        </small>
                      ) : null}
                    </div>
                  </label>

                  <div className={styles.calendarComposerRow}>
                    <label className={styles.calendarField}>
                      <span>Date</span>
                      <input
                        type="date"
                        value={calendarDraft.date}
                        onChange={(event) =>
                          setCalendarDraft((current) => ({
                            ...current,
                            date: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className={styles.calendarField}>
                      <span>Time</span>
                      <input
                        type="time"
                        value={calendarDraft.time}
                        onChange={(event) =>
                          setCalendarDraft((current) => ({
                            ...current,
                            time: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className={styles.calendarField}>
                      <span>End time</span>
                      <input
                        type="time"
                        value={calendarDraft.endTime}
                        onChange={(event) =>
                          setCalendarDraft((current) => ({
                            ...current,
                            endTime: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>

                  <label className={styles.calendarField}>
                    <span>Notes</span>
                    <textarea
                      rows={3}
                      value={calendarDraft.notes}
                      onChange={(event) =>
                        setCalendarDraft((current) => ({
                          ...current,
                          notes: event.target.value,
                        }))
                      }
                      placeholder="Add a reservation note, ticket info, or reminder"
                    />
                  </label>

                  <div className={styles.calendarCollaborators}>
                    <div className={styles.calendarCollaboratorsHeader}>
                      <span>
                        <FiUsers aria-hidden="true" />
                        Share with friends
                      </span>
                      <small>{sharedWithUserIds.length} selected</small>
                    </div>

                    {friends.length === 0 ? (
                      <p className={styles.calendarFieldHint}>
                        Add friends first to make this calendar item
                        collaborative.
                      </p>
                    ) : (
                      <div className={styles.calendarFriendList}>
                        {friends.map((friend) => (
                          <label
                            key={friend.userId}
                            className={styles.calendarFriendOption}>
                            <input
                              type="checkbox"
                              checked={sharedWithUserIds.includes(
                                friend.userId,
                              )}
                              onChange={() =>
                                handleToggleCollaborator(friend.userId)
                              }
                            />
                            <span>{getFriendDisplayName(friend)}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className={styles.calendarComposerActions}>
                    <button
                      type="button"
                      className={styles.submitButton}
                      disabled={saving}
                      onClick={handleSaveCalendarEntry}>
                      <FiCalendar aria-hidden="true" />
                      {saving ? "Saving…" : editingEntry ? "Update calendar item" : "Save to calendar"}
                    </button>
                  </div>
                </div>
              </div>

              <div className={styles.calendarDayCard}>
                <div className={styles.calendarDayHeader}>
                  <strong>Saved items</strong>
                  <span className={styles.calendarDayPill}>
                    {personalItemsCount} items
                  </span>
                </div>

                <div className={styles.calendarSavedList}>
                  {personalEntries.length === 0 ? (
                    <div className={styles.calendarSavedEmpty}>
                      No personal calendar items yet.
                    </div>
                  ) : (
                    personalEntries.map((entry) => (
                      <article
                        key={entry.id}
                        className={styles.calendarSavedItem}>
                        <div className={styles.calendarSavedMeta}>
                          <strong>{entry.label}</strong>
                          <span>{formatLongDate(entry.startDate)}</span>
                          <span>
                            <FiClock aria-hidden="true" />
                            {entry.openTime
                              ? `${entry.openTime}${entry.closeTime ? ` - ${entry.closeTime}` : ""}`
                              : "All day"}
                          </span>
                          <span>{entry.sublabel}</span>
                          <span>
                            Type: {entry.sourceType || entry.entryType}
                          </span>
                          {entry.sourceLabel ? (
                            <span>Source: {entry.sourceLabel}</span>
                          ) : null}
                          {entry.collaborators?.length ? (
                            <span>
                              <FiUsers aria-hidden="true" />
                              Shared with{" "}
                              {entry.collaborators
                                .map((user) => getFriendDisplayName(user))
                                .join(", ")}
                            </span>
                          ) : null}
                          {entry.notes ? <p>{entry.notes}</p> : null}
                        </div>

                        <div className={styles.calendarSavedActions}>
                          {(entry.placeId || entry.eventId) && (
                            <button
                              type="button"
                              className={styles.secondaryActionButton}
                              onClick={() => handleOpenEntry(entry)}>
                              <FiExternalLink aria-hidden="true" />
                              Open source
                            </button>
                          )}
                          <button
                            type="button"
                            className={styles.secondaryActionButton}
                            onClick={() => handleShowEntryDetails(entry)}>
                            <FiInfo aria-hidden="true" />
                            Full details
                          </button>
                          {entry.ownerUserId === currentUserId ? (
                            <>
                              <button
                                type="button"
                                className={styles.secondaryActionButton}
                                onClick={() => handleEditEntry(entry)}>
                                <FiCalendar aria-hidden="true" />
                                Edit
                              </button>
                              <button
                                type="button"
                                className={styles.secondaryActionButton}
                                onClick={() =>
                                  handleRemoveCalendarEntry(entry.calendarId)
                                }>
                                <FiTrash2 aria-hidden="true" />
                                Remove
                              </button>
                            </>
                          ) : null}
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

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

        <div className={styles.calendarToolbar}>
          <div className={styles.calendarToolbarMain}>
            <button
              type="button"
              className={styles.calendarIconButton}
              aria-label="Previous month"
              onClick={() => handleShiftMonth(-1)}>
              <FiChevronLeft aria-hidden="true" />
            </button>
            <button
              type="button"
              className={styles.calendarIconButton}
              aria-label="Next month"
              onClick={() => handleShiftMonth(1)}>
              <FiChevronRight aria-hidden="true" />
            </button>
            <button
              type="button"
              className={styles.secondaryActionButton}
              onClick={handleGoToday}>
              <FiRefreshCw aria-hidden="true" />
              Today
            </button>
          </div>

          <label className={styles.calendarMonthPicker}>
            <span>Month / year</span>
            <input
              type="month"
              value={visibleMonthValue}
              onChange={handleMonthInputChange}
            />
          </label>
        </div>

        <div className={styles.calendarLegend}>
          <span className={styles.signalPill}>Trip stops</span>
          <span
            className={`${styles.signalPill} ${styles.calendarLegendEvent}`}>
            Events
          </span>
          <span
            className={`${styles.signalPill} ${styles.calendarLegendPersonal}`}>
            Personal / shared
          </span>
        </div>

        {cells.length === 0 ? (
          <div className={styles.emptyState}>
            <strong>No calendar items available</strong>
            <p>
              Generate a trip plan or wait for public events to appear, then
              revisit this page.
            </p>
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
                    cell.entries.length > 0
                      ? styles.monthCalendarCellActive
                      : ""
                  } ${!cell.inActiveMonth ? styles.monthCalendarCellMuted : ""}`}>
                  <div className={styles.monthCalendarCellHeader}>
                    <span className={styles.monthCalendarDate}>
                      {cell.dateNumber}
                    </span>
                    {cell.entries.length > 0 ? (
                      <span className={styles.calendarDayPill}>
                        {cell.entries.length} items
                      </span>
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
                          } ${
                            entry.entryType === "personal"
                              ? styles.monthCalendarEntryPersonal
                              : ""
                          }`}
                          onClick={() =>
                            entry.entryType === "personal"
                              ? handleShowEntryDetails(entry)
                              : handleOpenEntry(entry)
                          }>
                          <span className={styles.calendarEntryLabel}>
                            {entry.slotKey}
                          </span>
                          <strong>{entry.label}</strong>
                          <span className={styles.calendarEntryType}>
                            {entry.sublabel}
                          </span>
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
                    <div className={styles.monthCalendarEmpty}>
                      No planned items
                    </div>
                  )}
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {showComposerModal ? (
        <div
          className={styles.calendarDetailsOverlay}
          role="presentation"
          onMouseDown={() => {
            setShowComposerModal(false);
            setEditingEntry(null);
            setCalendarDraft(buildEmptyCalendarDraft());
            setSharedWithUserIds([]);
          }}>
          <aside
            className={styles.calendarDetailsPanel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="calendar-composer-title"
            onMouseDown={(event) => event.stopPropagation()}>
            <div className={styles.calendarDetailsHeader}>
              <div>
                <span className={styles.heroBadge}>
                  <FiCalendar aria-hidden="true" />
                  {editingEntry ? "Edit calendar item" : "Add to calendar"}
                </span>
                <h3 id="calendar-composer-title">
                  {editingEntry ? "Edit calendar item" : "New calendar item"}
                </h3>
              </div>
              <button
                type="button"
                className={styles.secondaryActionButton}
                onClick={() => {
                  setShowComposerModal(false);
                  setEditingEntry(null);
                  setCalendarDraft(buildEmptyCalendarDraft());
                  setSharedWithUserIds([]);
                }}>
                Close
              </button>
            </div>

            <div style={{ padding: 12 }}>
              <label className={styles.calendarField}>
                <span>Title</span>
                <input
                  type="text"
                  value={calendarDraft.title}
                  onChange={(event) =>
                    setCalendarDraft((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Museum morning, dinner, airport pickup"
                />
              </label>

              <label className={styles.calendarField}>
                <span>Waynest place</span>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    value={calendarDraft.placeName}
                    onChange={(event) => {
                      const v = event.target.value;
                      setCalendarDraft((current) => ({
                        ...current,
                        placeName: v,
                        placeId: "",
                        placeSlug: "",
                        title: current.title || v,
                      }));
                      if (suggestionDebounce.current) {
                        clearTimeout(suggestionDebounce.current);
                      }
                      suggestionDebounce.current = setTimeout(() => {
                        const q = v.trim();
                        if (q.length < 2) {
                          setPlaceSuggestions([]);
                          setShowSuggestions(false);
                          setSuggestionsLoading(false);
                          return;
                        }
                        setSuggestionsLoading(true);
                        void get(`/place?q=${encodeURIComponent(q)}&limit=8`)
                          .then((res) => {
                            const rows = Array.isArray(res)
                              ? res
                              : (res?.data ?? []);
                            setPlaceSuggestions(rows);
                            setShowSuggestions(true);
                          })
                          .catch(() => setPlaceSuggestions([]))
                          .finally(() => setSuggestionsLoading(false));
                      }, 250);
                    }}
                    onFocus={() => {
                      if (placeSuggestions.length > 0) {
                        setShowSuggestions(true);
                        return;
                      }

                      setSuggestionsLoading(true);
                      void get(`/place?page=1&limit=8`)
                        .then((res) => {
                          const rows = Array.isArray(res)
                            ? res
                            : (res?.data ?? []);
                          setPlaceSuggestions(rows);
                          if (rows.length > 0) setShowSuggestions(true);
                        })
                        .catch(() => setPlaceSuggestions([]))
                        .finally(() => setSuggestionsLoading(false));
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowSuggestions(false), 150);
                    }}
                    placeholder="Restaurant, landmark, hotel, etc."
                  />

                  {showSuggestions && placeSuggestions.length > 0 && (
                    <ul
                      role="listbox"
                      style={{
                        position: "absolute",
                        zIndex: 60,
                        left: 0,
                        right: 0,
                        background: "white",
                        border: "1px solid #e6e6e6",
                        maxHeight: 240,
                        overflow: "auto",
                        margin: 0,
                        padding: 0,
                        listStyle: "none",
                      }}>
                      {placeSuggestions.map((p) => (
                        <li
                          key={p.id}
                          role="option"
                          onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => {
                                    setCalendarDraft((current) => ({
                                      ...current,
                                      placeId: p.id,
                                      placeSlug: p.slug || "",
                                      placeName: p.name,
                                      cityName: p.city?.name || current.cityName,
                                      sourceType: "place",
                                    }));
                                    setShowSuggestions(false);
                                  }}
                                  style={{
                            padding: "8px 10px",
                            borderBottom: "1px solid #f1f1f1",
                            cursor: "pointer",
                          }}>
                          <div style={{ fontWeight: 600 }}>{p.name}</div>
                          <div style={{ fontSize: 12, color: "#666" }}>
                            {p.city?.name || p.provider?.displayName || ""}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  {calendarDraft.placeName && !calendarDraft.placeId ? (
                    <small className={styles.calendarFieldHint}>
                      Choose a place from the dropdown so the calendar item
                      opens the real place details.
                    </small>
                  ) : null}
                  {suggestionsLoading ? (
                    <small className={styles.calendarFieldHint}>
                      Loading places...
                    </small>
                  ) : null}
                </div>
              </label>

              <label className={styles.calendarField}>
                <span>Date</span>
                <input
                  type="date"
                  value={calendarDraft.date}
                  onChange={(event) =>
                    setCalendarDraft((current) => ({
                      ...current,
                      date: event.target.value,
                    }))
                  }
                />
              </label>

              <label className={styles.calendarField}>
                <span>Time</span>
                <input
                  type="time"
                  value={calendarDraft.time}
                  onChange={(event) =>
                    setCalendarDraft((current) => ({
                      ...current,
                      time: event.target.value,
                    }))
                  }
                />
              </label>

              <label className={styles.calendarField}>
                <span>Notes</span>
                <textarea
                  rows={3}
                  value={calendarDraft.notes}
                  onChange={(event) =>
                    setCalendarDraft((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  placeholder="Add a reservation note, ticket info, or reminder"
                />
              </label>

              <div className={styles.calendarCollaborators}>
                <div className={styles.calendarCollaboratorsHeader}>
                  <span>
                    <FiUsers aria-hidden="true" />
                    Share with friends
                  </span>
                  <small>{sharedWithUserIds.length} selected</small>
                </div>

                {friends.length === 0 ? (
                  <p className={styles.calendarFieldHint}>
                    Add friends first to make this calendar item collaborative.
                  </p>
                ) : (
                  <div className={styles.calendarFriendList}>
                    {friends.map((friend) => (
                      <label
                        key={friend.userId}
                        className={styles.calendarFriendOption}>
                        <input
                          type="checkbox"
                          checked={sharedWithUserIds.includes(friend.userId)}
                          onChange={() =>
                            handleToggleCollaborator(friend.userId)
                          }
                        />
                        <span>{getFriendDisplayName(friend)}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className={styles.calendarComposerActions}>
                <button
                  type="button"
                  className={styles.submitButton}
                  disabled={saving}
                  onClick={handleSaveCalendarEntry}>
                  <FiCalendar aria-hidden="true" />
                  {saving ? "Saving…" : editingEntry ? "Update calendar item" : "Save to calendar"}
                </button>
              </div>
            </div>
          </aside>
        </div>
      ) : null}

      {selectedEntry ? (
        <div
          className={styles.calendarDetailsOverlay}
          role="presentation"
          onMouseDown={handleCloseEntryDetails}>
          <aside
            className={styles.calendarDetailsPanel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="calendar-details-title"
            onMouseDown={(event) => event.stopPropagation()}>
            <div className={styles.calendarDetailsHeader}>
              <div>
                <span className={styles.heroBadge}>
                  <FiInfo aria-hidden="true" />
                  Item details
                </span>
                <h3 id="calendar-details-title">{selectedEntry.label}</h3>
              </div>
              <button
                type="button"
                className={styles.secondaryActionButton}
                onClick={handleCloseEntryDetails}>
                Close
              </button>
            </div>

            <dl className={styles.calendarDetailsGrid}>
              <div>
                <dt>Date</dt>
                <dd>{formatLongDate(selectedEntry.startDate)}</dd>
              </div>
              <div>
                <dt>Time</dt>
                <dd>
                  {selectedEntry.openTime || "All day"}
                  {selectedEntry.closeTime
                    ? ` - ${selectedEntry.closeTime}`
                    : ""}
                </dd>
              </div>
              <div>
                <dt>Calendar type</dt>
                <dd>{selectedEntry.entryType}</dd>
              </div>
              <div>
                <dt>Source type</dt>
                <dd>{selectedEntry.sourceType || "calendar"}</dd>
              </div>
              <div>
                <dt>Place</dt>
                <dd>{selectedEntry.place?.name || selectedEntry.sublabel}</dd>
              </div>
              <div>
                <dt>City</dt>
                <dd>{selectedEntry.place?.cityName || "Not set"}</dd>
              </div>
              <div>
                <dt>Owner</dt>
                <dd>
                  {selectedEntry.ownerUserId === currentUserId
                    ? "You"
                    : "Shared calendar item"}
                </dd>
              </div>
              <div>
                <dt>Collaborators</dt>
                <dd>
                  {selectedEntry.collaborators?.length
                    ? selectedEntry.collaborators
                        .map((friend) => getFriendDisplayName(friend))
                        .join(", ")
                    : "No collaborators"}
                </dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>{selectedEntry.sourceLabel || selectedEntry.sublabel}</dd>
              </div>
              <div className={styles.calendarDetailsWide}>
                <dt>Notes</dt>
                <dd>{selectedEntry.notes || "No notes"}</dd>
              </div>
            </dl>

            <div className={styles.calendarSavedActions}>
              {selectedEntry.ownerUserId === currentUserId && (
                <button
                  type="button"
                  className={styles.submitButton}
                  onClick={() => handleEditEntry(selectedEntry)}>
                  <FiCalendar aria-hidden="true" />
                  Edit item
                </button>
              )}
              {(selectedEntry.placeId || selectedEntry.eventId) && (
                <button
                  type="button"
                  className={styles.submitButton}
                  onClick={() => handleOpenEntry(selectedEntry)}>
                  <FiExternalLink aria-hidden="true" />
                  Open linked page
                </button>
              )}
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
};

export default TripPlannerCalendarPage;
