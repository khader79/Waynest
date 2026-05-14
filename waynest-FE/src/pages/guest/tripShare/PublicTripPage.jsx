import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  FiArrowLeft,
  FiCalendar,
  FiClock,
  FiCopy,
  FiEye,
  FiMapPin,
  FiShare2,
  FiUsers,
} from "react-icons/fi";
import { useGlobalShare } from "@/context/GlobalShareContext";
import { usePublicTripPage } from "@/hooks/public/usePublicTripPage";
import "./PublicTripPage.css";

const PublicTripPage = () => {
  const { openShare } = useGlobalShare();
  const { t } = useTranslation();
  const {
    accessDenied,
    copyLink,
    isAuthenticated,
    loading,
    remixTrip,
    remixing,
    trip,
  } = usePublicTripPage();

  const handleShare = () => {
    if (!trip) {
      return;
    }

    const destinationName =
      trip.cityName ??
      t("publicTrip.placeholders.destination", {
        defaultValue: "this destination",
      });

    openShare({
      dialogTitle: t("publicTrip.share.dialogTitle", {
        defaultValue: "Share itinerary",
      }),
      title: trip.title,
      text:
        trip.description ??
        t("publicTrip.share.defaultText", {
          defaultValue: "{{days}}-day trip to {{destination}}.",
          days: trip.days,
          destination: destinationName,
        }),
      url: trip.shareUrl,
      copyText: t("publicTrip.share.copyText", {
        defaultValue: "{{title}}\n\n{{url}}",
        title: trip.title,
        url: trip.shareUrl,
      }),
      internalMessage: t("publicTrip.share.internalMessage", {
        defaultValue:
          "Take a look at this trip on Waynest:\n\n{{title}}\n{{url}}",
        title: trip.title,
        url: trip.shareUrl,
      }),
    });
  };

  if (loading) {
    return (
      <div className="public-trip-page">
        <div className="public-trip-hero public-trip-loading">
          <div className="public-trip-shimmer title" />
          <div className="public-trip-shimmer subtitle" />
          <div className="public-trip-shimmer stat" />
          <div className="public-trip-shimmer stat" />
          <div className="public-trip-shimmer stat" />
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="public-trip-page">
        <section className="public-trip-empty">
          <Link to="/plan" className="public-trip-back">
            <FiArrowLeft size={16} />
            {t("publicTrip.navigation.backToPlanner", {
              defaultValue: "Back to planner",
            })}
          </Link>
          <h1>
            {accessDenied
              ? t("publicTrip.empty.accessDeniedTitle", {
                  defaultValue: "Friends-only trip",
                })
              : t("publicTrip.empty.notFoundTitle", {
                  defaultValue: "Trip not found",
                })}
          </h1>
          <p>
            {accessDenied
              ? t("publicTrip.empty.accessDeniedMessage", {
                  defaultValue:
                    "This itinerary is shared with friends only. Log in with an account that is connected to the owner to view it.",
                })
              : t("publicTrip.empty.notFoundMessage", {
                  defaultValue:
                    "This link is no longer available, or the trip has not been shared yet.",
                })}
          </p>
          <div className="public-trip-empty-actions">
            {accessDenied && !isAuthenticated ? (
              <>
                <Link to="/login" className="btn-primary">
                  {t("common.logIn", { defaultValue: "Log in" })}
                </Link>
                <Link to="/register" className="btn-secondary">
                  {t("common.createAccount", {
                    defaultValue: "Create account",
                  })}
                </Link>
              </>
            ) : (
              <>
                <Link to="/plan" className="btn-primary">
                  {t("publicTrip.actions.planNewTrip", {
                    defaultValue: "Plan a new trip",
                  })}
                </Link>
                <Link to="/explore" className="btn-secondary">
                  {t("publicTrip.actions.exploreDestinations", {
                    defaultValue: "Explore destinations",
                  })}
                </Link>
              </>
            )}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="public-trip-page">
      <section className="public-trip-hero">
        <div className="public-trip-hero-copy">
          <Link to="/plan" className="public-trip-back">
            <FiArrowLeft size={16} />
            {t("publicTrip.navigation.backToPlanner", {
              defaultValue: "Back to planner",
            })}
          </Link>
          <span className="public-trip-badge">
            <FiShare2 size={14} />
            {trip.shareVisibility === "FRIENDS"
              ? t("publicTrip.badge.friendsOnly", {
                  defaultValue: "Friends-only itinerary",
                })
              : t("publicTrip.badge.public", {
                  defaultValue: "Public itinerary",
                })}
          </span>
          <h1>{trip.title}</h1>
          <p>
            {trip.description ??
              t("publicTrip.hero.defaultDescription", {
                defaultValue:
                  "{{days}}-day trip to {{destination}} designed to be shared, saved, and remixed.",
                days: trip.days,
                destination:
                  trip.cityName ??
                  t("publicTrip.placeholders.destination", {
                    defaultValue: "this destination",
                  }),
              })}
          </p>

          <div className="public-trip-meta">
            <div className="public-trip-meta-item">
              <FiMapPin />
              <span>
                {trip.cityName ??
                  t("publicTrip.placeholders.unknownDestination", {
                    defaultValue: "Unknown destination",
                  })}
              </span>
            </div>
            <div className="public-trip-meta-item">
              <FiCalendar />
              <span>
                {t("publicTrip.meta.days", {
                  defaultValue: "{{days}} days",
                  days: trip.days,
                })}
              </span>
            </div>
            <div className="public-trip-meta-item">
              <FiUsers />
              <span>
                {t("publicTrip.meta.travelers", {
                  defaultValue: "{{count}} traveler(s)",
                  count: trip.persons,
                })}
              </span>
            </div>
            <div className="public-trip-meta-item">
              <FiEye />
              <span>
                {t("publicTrip.meta.views", {
                  defaultValue: "{{count}} views",
                  count: trip.viewCount,
                })}
              </span>
            </div>
          </div>

          <div className="public-trip-actions">
            {trip.canSaveToMyPlans ? (
              <button
                type="button"
                className="btn-primary"
                onClick={() => void remixTrip()}
                disabled={remixing}>
                {remixing
                  ? t("publicTrip.actions.loading", {
                      defaultValue: "Loading...",
                    })
                  : isAuthenticated
                    ? t("publicTrip.actions.saveToPlans", {
                        defaultValue: "Save to my plans",
                      })
                    : t("publicTrip.actions.copyMyTrip", {
                        defaultValue: "Copy my trip",
                      })}
              </button>
            ) : (
              <Link
                to={`/plan?planId=${encodeURIComponent(trip.id)}`}
                className="btn-primary">
                {t("publicTrip.actions.openInPlanner", {
                  defaultValue: "Open in planner",
                })}
              </Link>
            )}
            <button
              type="button"
              className="btn-secondary"
              onClick={() => void copyLink()}>
              <FiCopy size={16} />
              {t("publicTrip.actions.copyLink", { defaultValue: "Copy link" })}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleShare}>
              <FiShare2 size={16} />
              {t("publicTrip.actions.share", { defaultValue: "Share" })}
            </button>
          </div>
        </div>

        <aside className="public-trip-stats">
          <div className="public-trip-stat">
            <span>
              {t("publicTrip.stats.budget", { defaultValue: "Budget" })}
            </span>
            <strong>{trip.budget.toFixed(0)} ILS</strong>
          </div>
          <div className="public-trip-stat">
            <span>
              {t("publicTrip.stats.estimatedTotal", {
                defaultValue: "Estimated total",
              })}
            </span>
            <strong>
              {trip.generatedPlan.totalEstimatedCost.toFixed(0)} ILS
            </strong>
          </div>
          <div className="public-trip-stat">
            <span>
              {t("publicTrip.stats.daysPlanned", {
                defaultValue: "Days planned",
              })}
            </span>
            <strong>{trip.generatedPlan.days.length}</strong>
          </div>
          {!isAuthenticated && trip.canSaveToMyPlans && (
            <div className="public-trip-login-cta">
              <p>
                ✨{" "}
                {t("publicTrip.auth.saveCta", {
                  defaultValue:
                    "Sign in to save this trip to your account and remix it.",
                })}
              </p>
              <Link
                to="/register"
                className="btn-primary"
                style={{ display: "block", textAlign: "center" }}>
                {t("publicTrip.auth.createFreeAccount", {
                  defaultValue: "Create free account",
                })}
              </Link>
              <Link
                to="/login"
                className="btn-secondary"
                style={{
                  display: "block",
                  textAlign: "center",
                  marginTop: "8px",
                }}>
                {t("common.logIn", { defaultValue: "Log in" })}
              </Link>
            </div>
          )}
        </aside>
      </section>

      <section className="public-trip-summary">
        <div className="public-trip-summary-card">
          <div className="public-trip-summary-heading">
            <h2>
              {t("publicTrip.summary.title", { defaultValue: "At a glance" })}
            </h2>
            <span>
              {t("publicTrip.summary.tipsIncluded", {
                defaultValue: "{{count}} tips included",
                count: trip.generatedPlan.tips.length,
              })}
            </span>
          </div>
          <div className="public-trip-summary-grid">
            <article>
              <span>
                {t("publicTrip.summary.days", { defaultValue: "Days" })}
              </span>
              <strong>{trip.generatedPlan.days.length}</strong>
            </article>
            <article>
              <span>
                {t("publicTrip.summary.budget", { defaultValue: "Budget" })}
              </span>
              <strong>{trip.budget.toFixed(0)} ILS</strong>
            </article>
            <article>
              <span>
                {t("publicTrip.summary.viewCount", {
                  defaultValue: "View count",
                })}
              </span>
              <strong>{trip.viewCount}</strong>
            </article>
          </div>
          <div className="public-trip-summary-footer">
            <FiClock />
            <span>
              {t("publicTrip.summary.openedOn", {
                defaultValue: "Opened {{date}}",
                date: new Date(trip.createdAt).toLocaleDateString(),
              })}
            </span>
          </div>
        </div>
      </section>

      <section className="public-trip-days">
        {trip.generatedPlan.days.map((day) => (
          <article key={day.day} className="public-trip-day-card">
            <div className="public-trip-day-header">
              <div>
                <span className="public-trip-day-label">
                  {t("publicTrip.dayLabel", {
                    defaultValue: "Day {{day}}",
                    day: day.day,
                  })}
                </span>
                <h3>
                  {t("publicTrip.dayHeading", {
                    defaultValue: "Plan for the day",
                  })}
                </h3>
              </div>
              <strong>{day.totalDayCost.toFixed(0)} ILS</strong>
            </div>
            <div className="public-trip-slot-grid">
              <PublicTripSlot
                variant="morning"
                label={t("publicTrip.slotLabels.morning", {
                  defaultValue: "Morning",
                })}
                slot={day.morning}
              />
              <PublicTripSlot
                variant="afternoon"
                label={t("publicTrip.slotLabels.afternoon", {
                  defaultValue: "Afternoon",
                })}
                slot={day.afternoon}
              />
              <PublicTripSlot
                variant="evening"
                label={t("publicTrip.slotLabels.evening", {
                  defaultValue: "Evening",
                })}
                slot={day.evening}
              />
            </div>
          </article>
        ))}
      </section>

      {trip.generatedPlan.tips.length > 0 && (
        <section className="public-trip-tips">
          <div className="public-trip-summary-card">
            <h2>{t("publicTrip.tips.title", { defaultValue: "Tips" })}</h2>
            <ul>
              {trip.generatedPlan.tips.map((tip, index) => (
                <li key={`${tip}-${index}`}>{tip}</li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
};

const PublicTripSlot = ({ label, slot, variant }) => {
  const { t } = useTranslation();
  if (!slot) {
    return (
      <div className={`public-trip-slot empty ${variant}`}>
        <span className="public-trip-slot-label">{label}</span>
        <p>
          {t("publicTrip.slotEmpty", {
            defaultValue: "No suitable stop found",
          })}
        </p>
      </div>
    );
  }

  return (
    <div className={`public-trip-slot ${variant}`}>
      <div className="public-trip-slot-header">
        <span className="public-trip-slot-label">{label}</span>
        <span className="public-trip-slot-duration">{slot.duration}</span>
      </div>
      <h4>{slot.name}</h4>
      {slot.type && <span className="public-trip-slot-type">{slot.type}</span>}
      <div className="public-trip-slot-meta">
        <strong>{slot.estimatedCost.toFixed(0)} ILS</strong>
        {slot.openTime && slot.closeTime && (
          <span>
            {slot.openTime} - {slot.closeTime}
          </span>
        )}
      </div>
    </div>
  );
};

export default PublicTripPage;
