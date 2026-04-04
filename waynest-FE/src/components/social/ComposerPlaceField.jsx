import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiMapPin, FiNavigation } from "react-icons/fi";
import { toast } from "react-toastify";
import { fetchNearestPlaces, searchPlaces } from "@/api/public";
import { getApiErrorMessage } from "@/utils/errors";

const PLACES_INITIAL_LIMIT = 40;
const PLACES_SEARCH_LIMIT = 24;

function formatPlaceLabel(hit) {
  const city = hit.subtitle?.trim();
  return city ? `${hit.title}, ${city}` : hit.title;
}

function formatPlaceFromEntity(p) {
  const city = p.city?.name?.trim();
  return city ? `${p.name}, ${city}` : p.name;
}

/**
 * @param {{ placeId: string; label: string; lat: number; lng: number; slug: string }} place
 */
export function ComposerPlaceField({
  value,
  onChange,
  selectedPlace,
  onSelectPlace,
  locating,
  onLocatingChange,
}) {
  const { t } = useTranslation();
  const rootRef = useRef(null);
  const debounceRef = useRef(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingAll, setLoadingAll] = useState(true);
  const [hits, setHits] = useState([]);
  const [basePlaces, setBasePlaces] = useState([]);

  useEffect(() => {
    const onDoc = (e) => {
      if (!rootRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoadingAll(true);
      try {
        const res = await searchPlaces("", PLACES_INITIAL_LIMIT);
        const items = Array.isArray(res?.items) ? res.items : [];
        const places = items.filter((h) => h.type === "place" && h.placeId);
        if (!cancelled) {
          setBasePlaces(places);
          setHits(places);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(
            getApiErrorMessage(
              error,
              t("social.feed.composer.placeSearchFailed", { defaultValue: "Could not load places" }),
            ),
          );
          setBasePlaces([]);
          setHits([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingAll(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  useEffect(() => {
    const q = value.trim();
    window.clearTimeout(debounceRef.current);

    if (q.length >= 2) {
      debounceRef.current = window.setTimeout(() => {
        void (async () => {
          setLoading(true);
          try {
            const res = await searchPlaces(q, PLACES_SEARCH_LIMIT);
            const items = Array.isArray(res?.items) ? res.items : [];
            const places = items.filter((h) => h.type === "place" && h.placeId);
            setHits(places);
            setOpen(true);
          } catch (error) {
            toast.error(
              getApiErrorMessage(
                error,
                t("social.feed.composer.placeSearchFailed", { defaultValue: "Could not load places" }),
              ),
            );
            setHits([]);
          } finally {
            setLoading(false);
          }
        })();
      }, 320);
      return () => window.clearTimeout(debounceRef.current);
    }

    setLoading(false);
    const low = q.toLowerCase();
    if (q.length === 0) {
      setHits(basePlaces);
    } else {
      setHits(
        basePlaces.filter(
          (h) =>
            (h.title && h.title.toLowerCase().includes(low)) ||
            (h.subtitle && h.subtitle.toLowerCase().includes(low)),
        ),
      );
    }
    return undefined;
  }, [value, basePlaces, t]);

  const pickHit = useCallback(
    (hit) => {
      onSelectPlace({
        placeId: hit.placeId,
        label: formatPlaceLabel(hit),
        lat: hit.latitude,
        lng: hit.longitude,
        slug: hit.slug,
      });
      onChange(formatPlaceLabel(hit));
      setOpen(false);
    },
    [onChange, onSelectPlace],
  );

  const useMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error(
        t("social.feed.composer.geoUnsupported", {
          defaultValue: "Location is not supported in this browser",
        }),
      );
      return;
    }
    onLocatingChange(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const list = await fetchNearestPlaces(
            pos.coords.latitude,
            pos.coords.longitude,
            6,
          );
          const rows = Array.isArray(list) ? list : [];
          if (rows.length === 0) {
            toast.error(
              t("social.feed.composer.noNearbyPlaces", {
                defaultValue: "No Waynest places found near you yet",
              }),
            );
            onLocatingChange(false);
            return;
          }
          const p = rows[0];
          const label = formatPlaceFromEntity(p);
          onSelectPlace({
            placeId: p.id,
            label,
            lat: Number(p.latitude),
            lng: Number(p.longitude),
            slug: p.slug,
          });
          onChange(label);
          setOpen(false);
          toast.success(
            t("social.feed.composer.nearestPlaceSet", {
              defaultValue: "Nearest place selected",
            }),
          );
        } catch (error) {
          toast.error(
            getApiErrorMessage(
              error,
              t("social.feed.composer.nearestFailed", { defaultValue: "Could not load nearby places" }),
            ),
          );
        } finally {
          onLocatingChange(false);
        }
      },
      () => {
        toast.error(
          t("social.feed.composer.geoDenied", {
            defaultValue: "Could not read your location — try typing a place or pick from the list",
          }),
        );
        onLocatingChange(false);
      },
      { enableHighAccuracy: false, timeout: 14_000, maximumAge: 60_000 },
    );
  }, [onChange, onLocatingChange, onSelectPlace, t]);

  const showList = open && hits.length > 0;
  const showLoading = loading || loadingAll;

  return (
    <div className="social-composer-extra">
      <div className="social-composer-extra__head">
        <FiMapPin aria-hidden className="social-composer-extra__icon" />
        <span className="social-composer-extra__title">
          {t("social.feed.composer.placeSection", { defaultValue: "Place" })}
        </span>
      </div>
      <p className="social-composer-extra__hint">
        {t("social.feed.composer.placeHintDb", {
          defaultValue:
            "All Waynest places load below — type to search the full list, or use your location.",
        })}
      </p>
      <div className="social-composer-place-row" ref={rootRef}>
        <div className="social-composer-place-autocomplete">
          <input
            type="text"
            className={`social-composer-field__input social-composer-place-input${
              selectedPlace ? " social-composer-place-input--linked" : ""
            }`}
            placeholder={t("social.feed.composer.placePlaceholder", {
              defaultValue: "Search or pick from the list…",
            })}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              if (selectedPlace) {
                onSelectPlace(null);
              }
            }}
            onFocus={() => {
              setOpen(true);
            }}
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={open}
          />
          {selectedPlace ? (
            <span
              className="social-composer-place-badge"
              title={t("social.feed.composer.linkedPlace", { defaultValue: "Linked to Waynest place" })}
            >
              ✓
            </span>
          ) : null}
          {showList ? (
            <ul className="social-composer-place-suggestions" role="listbox">
              {hits.map((hit) => (
                <li key={hit.placeId} role="none">
                  <button
                    type="button"
                    role="option"
                    className="social-composer-place-suggestion"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pickHit(hit)}
                  >
                    <span className="social-composer-place-suggestion__title">{hit.title}</span>
                    {hit.subtitle ? (
                      <span className="social-composer-place-suggestion__sub">{hit.subtitle}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {showLoading ? (
            <span className="social-composer-place-loading" aria-live="polite">
              {t("common.loading", { defaultValue: "Loading…" })}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          className="social-composer-locate-btn"
          onClick={() => void useMyLocation()}
          disabled={locating}
          title={t("social.feed.composer.useMyLocation", { defaultValue: "Use my location" })}
        >
          <FiNavigation aria-hidden />
          <span className="social-composer-locate-btn__label">
            {locating
              ? t("social.feed.composer.locating", { defaultValue: "Locating…" })
              : t("social.feed.composer.useMyLocationShort", { defaultValue: "My location" })}
          </span>
        </button>
      </div>
    </div>
  );
}
