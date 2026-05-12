import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";
import { globalSearch } from "@/api/public";
import { fetchPublicTripBrowse } from "@/api/trips";
import { getApiErrorMessage, isApiCanceledError } from "@/utils/errors";
import { GlobalSearchBar } from "@/components/public/search/GlobalSearchBar";
import "./SearchPage.css";

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

  const visibleItems = isAuthenticated
    ? items
    : items.filter((hit) => hit.type !== "user");

  return (
    <div className="search-page">
      <h1 className="search-page__title">
        {t("search.emptyTitle", { defaultValue: "Search" })}
      </h1>
      <div className="search-page__toolbar">
        <GlobalSearchBar />
      </div>

      <section
        className="search-page__public-trips"
        aria-labelledby="search-public-trips-heading">
        <h2
          id="search-public-trips-heading"
          className="search-page__section-title">
          {t("search.publicTripsTitle", {
            defaultValue: "Public trips from travelers",
          })}
        </h2>
        {publicTripsLoading ? (
          <div className="sk-search-section" />
        ) : publicTrips.length === 0 ? (
          <p className="search-page__hint">
            {t("search.publicTripsEmpty", {
              defaultValue: "No public trips yet. Share a plan to see it here.",
            })}
          </p>
        ) : (
          <ul className="search-page__trip-cards">
            {publicTrips.map((trip) => (
              <li key={trip.shareSlug} className="search-page__trip-card">
                <Link
                  className="search-page__trip-link"
                  to={`/trip/${encodeURIComponent(trip.shareSlug)}`}>
                  {trip.title?.trim()
                    ? trip.title
                    : t("tripPlanner.savedPlans", {
                        defaultValue: "Saved plan",
                      })}
                </Link>
                <span className="search-page__trip-by">
                  {t("search.publicTripsBy", {
                    username: trip.username,
                    defaultValue: `By @${trip.username}`,
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {q ? (
        <section
          className="search-page__results"
          aria-labelledby="search-results-heading">
          <h2
            id="search-results-heading"
            className="search-page__section-title">
            {t("search.resultsFor", { defaultValue: 'Results for "{{q}}"', q })}
          </h2>
          {loading ? (
            <div className="sk-search-list">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="sk-search-item" />
              ))}
            </div>
          ) : visibleItems.length === 0 ? (
            <p>{t("search.noResults", { defaultValue: "No matches yet." })}</p>
          ) : (
            <ul className="search-page__list">
              {visibleItems.map((hit, index) => (
                <li
                  key={`${hit.type}-${hit.href}-${index}`}
                  className="search-page__item">
                  <div className="search-page__item-main">
                    <span className="search-page__badge">{hit.type}</span>
                    <Link className="search-page__link" to={hit.href}>
                      {hit.title}
                    </Link>
                    {hit.subtitle ? (
                      <span className="search-page__sub">{hit.subtitle}</span>
                    ) : null}
                  </div>
                  {hit.type === "place" ? (
                    <button
                      type="button"
                      className="search-page__plan-btn"
                      onClick={() => planFromHere(hit)}>
                      {t("search.planFromHere", {
                        defaultValue: "Plan from here",
                      })}
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <p className="search-page__hint search-page__hint--below">
          {t("search.typeToSearch", {
            defaultValue:
              "Type above to search people, providers, places, and events.",
          })}
        </p>
      )}
    </div>
  );
};

export default SearchPage;
