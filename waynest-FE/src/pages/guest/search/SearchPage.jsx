import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";
import { globalSearch } from "@/api/public";
import { fetchPublicTripBrowse } from "@/api/trips";
import { getApiErrorMessage, isApiCanceledError } from "@/utils/errors";
import { GlobalSearchBar } from "@/components/public/search/GlobalSearchBar";
import { FiMapPin, FiUsers, FiBriefcase, FiCalendar, FiSearch } from "react-icons/fi";
import "./SearchPage.css";

const FILTERS = [
  { key: "all", labelKey: "search.filterAll", defaultLabel: "All", icon: FiSearch },
  { key: "place", labelKey: "search.filterPlaces", defaultLabel: "Places", icon: FiMapPin },
  { key: "user", labelKey: "search.filterPeople", defaultLabel: "People", icon: FiUsers },
  { key: "provider", labelKey: "search.filterProviders", defaultLabel: "Businesses", icon: FiBriefcase },
  { key: "event", labelKey: "search.filterEvents", defaultLabel: "Events", icon: FiCalendar },
];

const PLACEHOLDER_COLORS = {
  place: "var(--color-primary, #4f46e5)",
  user: "var(--color-accent, #0891b2)",
  provider: "var(--color-emerald, #059669)",
  event: "var(--color-amber, #d97706)",
};

const TYPE_ICONS = {
  place: FiMapPin,
  user: FiUsers,
  provider: FiBriefcase,
  event: FiCalendar,
};

const ResultCard = ({ hit, onPlan, t }) => {
  const Icon = TYPE_ICONS[hit.type] || FiMapPin;
  const color = PLACEHOLDER_COLORS[hit.type] || "var(--color-primary)";

  return (
    <div className="search-card" style={{ "--card-accent": color }}>
      <div className="search-card__media">
        {hit.imageUrl ? (
          <img
            className="search-card__img"
            src={hit.imageUrl}
            alt={hit.title}
            loading="lazy"
          />
        ) : (
          <div className="search-card__placeholder">
            <Icon size={22} />
          </div>
        )}
      </div>
      <div className="search-card__body">
        <span className="search-card__badge">{hit.type}</span>
        <Link className="search-card__title" to={hit.href}>
          {hit.title}
        </Link>
        {hit.subtitle && (
          <span className="search-card__subtitle">{hit.subtitle}</span>
        )}
      </div>
      {hit.type === "place" && (
        <button
          type="button"
          className="search-card__action"
          onClick={() => onPlan(hit)}
        >
          {t("search.planFromHere", { defaultValue: "Plan" })}
        </button>
      )}
    </div>
  );
};

const SearchPage = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const q = params.get("q")?.trim() ?? "";
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [publicTrips, setPublicTrips] = useState([]);
  const [publicTripsLoading, setPublicTripsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => {
    let active = true;
    setPublicTripsLoading(true);
    void (async () => {
      try {
        const res = await fetchPublicTripBrowse(12);
        if (active) {
          setPublicTrips(res.items ?? []);
        }
      } catch (error) {
        if (active) {
          toast.error(
            getApiErrorMessage(
              error,
              t("search.publicTripsLoadFailed", {
                defaultValue: "Could not load public trips.",
              }),
            ),
          );
          setPublicTrips([]);
        }
      } finally {
        if (active) {
          setPublicTripsLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [t]);

  useEffect(() => {
    if (!q) {
      setItems([]);
      return;
    }
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    void (async () => {
      try {
        const res = await globalSearch(q, 16, { signal: controller.signal });
        if (active) {
          setItems(res.items ?? []);
        }
      } catch (error) {
        if (active && !isApiCanceledError(error)) {
          toast.error(
            getApiErrorMessage(
              error,
              t("search.failed", { defaultValue: "Search failed" }),
            ),
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
      controller.abort();
    };
  }, [q, t]);

  const planFromHere = (hit) => {
    if (hit.type === "place" && hit.cityId) {
      navigate(`/plan?cityId=${encodeURIComponent(hit.cityId)}`);
      return;
    }
    toast.info(
      t("search.planNeedsCity", {
        defaultValue: "Pick a place with a city to plan from here.",
      }),
    );
  };

  const baseItems = isAuthenticated
    ? items
    : items.filter((hit) => hit.type !== "user");

  const visibleItems = useMemo(() => {
    if (activeFilter === "all") return baseItems;
    return baseItems.filter((hit) => hit.type === activeFilter);
  }, [baseItems, activeFilter]);

  const hasQuery = q.length > 0;

  return (
    <div className="search-page">
      <section className="search-page__hero">
        <div className="search-page__hero-bg" />
        <h1 className="search-page__hero-title">
          {t("search.pageTitle", { defaultValue: "Discover Waynest" })}
        </h1>
        <p className="search-page__hero-subtitle">
          {t("search.pageSubtitle", {
            defaultValue: "Search places, people, businesses, and events",
          })}
        </p>
        <div className="search-page__hero-search">
          <GlobalSearchBar />
        </div>
      </section>

      {!hasQuery && (
        <section
          className="search-page__trips"
          aria-labelledby="search-trips-heading"
        >
          <h2
            id="search-trips-heading"
            className="search-page__section-title"
          >
            {t("search.publicTripsTitle", {
              defaultValue: "Public trips",
            })}
          </h2>
          {publicTripsLoading ? (
            <div className="sk-trip-grid">
              {[1, 2, 3].map((i) => (
                <div key={i} className="sk-trip-card" />
              ))}
            </div>
          ) : publicTrips.length === 0 ? (
            <p className="search-page__empty-hint">
              {t("search.publicTripsEmpty", {
                defaultValue: "No public trips yet. Share a plan to see it here.",
              })}
            </p>
          ) : (
            <div className="trip-grid">
              {publicTrips.map((trip) => (
                <Link
                  key={trip.shareSlug}
                  className="trip-card"
                  to={`/trip/${encodeURIComponent(trip.shareSlug)}`}
                >
                  <div className="trip-card__avatar">
                    {(trip.title || "S")[0].toUpperCase()}
                  </div>
                  <div className="trip-card__body">
                    <span className="trip-card__title">
                      {trip.title?.trim()
                        ? trip.title
                        : t("tripPlanner.savedPlans", {
                            defaultValue: "Saved plan",
                          })}
                    </span>
                    <span className="trip-card__author">
                      @{trip.username}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {hasQuery && (
        <section className="search-page__results">
          <div className="search-page__results-header">
            <h2 className="search-page__section-title">
              {t("search.resultsFor", {
                defaultValue: 'Results for "{{q}}"',
                q,
              })}
            </h2>
            <span className="search-page__results-count">
              {loading ? "…" : `${baseItems.length}`}
            </span>
          </div>

          <div className="search-page__filters" role="tablist">
            {FILTERS.map(({ key, labelKey, defaultLabel, icon: Icon }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={activeFilter === key}
                className={`search-page__filter${
                  activeFilter === key ? " search-page__filter--active" : ""
                }`}
                onClick={() => setActiveFilter(key)}
              >
                <Icon size={14} />
                {t(labelKey, { defaultValue: defaultLabel })}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="search-card-grid">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="sk-search-card" />
              ))}
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="search-page__no-results">
              <FiSearch size={40} />
              <p>
                {t("search.noResults", {
                  defaultValue: "No matches yet.",
                })}
              </p>
            </div>
          ) : (
            <div className="search-card-grid">
              {visibleItems.map((hit, index) => (
                <ResultCard
                  key={`${hit.type}-${hit.href}-${index}`}
                  hit={hit}
                  onPlan={planFromHere}
                  t={t}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default SearchPage;
