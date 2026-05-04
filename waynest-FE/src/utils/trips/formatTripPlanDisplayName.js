/**
 * Builds a short, human-friendly label for saved trip plans.
 * Hides bad AI/placeholder titles (UUIDs, "Trip Destination", "uuid in N days").
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function looksLikeUuid(value) {
  return typeof value === "string" && UUID_RE.test(value.trim());
}

/** @param {string} s */
function isGarbageTripTitle(s) {
  const trimmed = s.trim();
  if (!trimmed) {
    return true;
  }
  const first = trimmed.split(/\s+/)[0] ?? "";
  if (looksLikeUuid(first)) {
    return true;
  }
  // e.g. "5bfc5fe4-... in 1 days"
  if (/^[0-9a-f-]{36}\s+in\s+\d+\s+days?/i.test(trimmed)) {
    return true;
  }
  if (/^trip\s+destination\b/i.test(trimmed)) {
    return true;
  }
  return false;
}

/**
 * @param {{
 *  title?: string | null;
 *  cityName?: string | null;
 *  city?: { name?: string | null } | null;
 *  destination?: string | null;
 *  days?: number;
 * }} plan
 * @param {(key: string, opts?: Record<string, unknown>) => string} t - i18n `t`
 */
export function formatTripPlanDisplayName(plan, t) {
  const daysRaw = Number(plan?.days);
  const days =
    Number.isFinite(daysRaw) && daysRaw > 0 ? Math.floor(daysRaw) : 1;

  const cityFromName =
    typeof plan?.cityName === "string" ? plan.cityName.trim() : "";
  const cityFromPlan =
    typeof plan?.city?.name === "string" ? plan.city.name.trim() : "";
  const destinationRaw =
    typeof plan?.destination === "string" ? plan.destination.trim() : "";
  const cityValue = cityFromName || cityFromPlan || destinationRaw;
  if (cityValue) {
    const city =
      cityValue.length > 26 ? `${cityValue.slice(0, 24)}…` : cityValue;
    return t("trips.display.cityDays", {
      city,
      count: days,
      defaultValue: "{{city}} · {{count}} days",
    });
  }

  let title = typeof plan?.title === "string" ? plan.title.trim() : "";
  title = title.replace(/\s*\(copy\)\s*$/i, "").trim();

  if (title && !isGarbageTripTitle(title)) {
    return title.length > 38 ? `${title.slice(0, 36)}…` : title;
  }

  return t("trips.display.shortTrip", {
    count: days,
    defaultValue: "Trip · {{count}} days",
  });
}
