import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { fetchPublicEvents, fetchPublicPlaces } from "@/api/catalog";

const extractPlaces = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === "object" && Array.isArray(payload.data)) {
    return payload.data;
  }

  return [];
};

const extractEvents = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === "object" && Array.isArray(payload.data)) {
    return payload.data;
  }

  return [];
};

const containsText = (value, query) =>
  (value ?? "").toLowerCase().includes(query);

const normalize = (value) => (value ?? "").trim().toLowerCase();

const normalizeId = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toLowerCase();
};

const normalizeCountryCode = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  const code = value.trim().toLowerCase();
  return /^[a-z]{2}$/.test(code) ? code : "";
};

const getCountryName = (city) => city?.country?.name ?? city?.countryName ?? "";
const getCountryId = (city) => city?.country?.id ?? city?.countryId ?? "";
const getCountryCode = (city) =>
  city?.country?.alpha2Code ?? city?.countryCode ?? "";

const getSuggestionRank = (suggestion, query) => {
  const label = normalize(suggestion.label);
  const secondary = normalize(suggestion.secondary);
  if (label.startsWith(query)) {
    return 0;
  }
  if (label.split(" ").some((part) => part.startsWith(query))) {
    return 1;
  }
  if (label.includes(query)) {
    return 2;
  }
  if (secondary.includes(query)) {
    return 3;
  }
  return 4;
};

export const useExplorePage = () => {
  const [searchParams] = useSearchParams();
  const locationFromUrl = searchParams.get("location") ?? "";
  const countryIdFromUrl = searchParams.get("countryId") ?? "";
  const countryCodeFromUrl = searchParams.get("countryCode") ?? "";
  const normalizedCountryIdFromUrl = normalizeId(countryIdFromUrl);
  const normalizedCountryCodeFromUrl = normalizeCountryCode(countryCodeFromUrl);

  const [activeCategory, setActiveCategory] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [locationText, setLocationText] = useState(() => locationFromUrl);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [places, setPlaces] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLocationText(locationFromUrl);
    setSelectedSuggestion(null);
  }, [locationFromUrl, countryIdFromUrl, countryCodeFromUrl]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const country = locationFromUrl || null;
        const eventsLimit = country ? 120 : 18;
        const placesLimit = country ? 100 : 50;
        const [placesPayload, eventsPayload] = await Promise.all([
          fetchPublicPlaces(placesLimit, country),
          fetchPublicEvents(eventsLimit),
        ]);
        setPlaces(extractPlaces(placesPayload));
        setEvents(extractEvents(eventsPayload));
      } catch {
        toast.error("Failed to load explore data");
        setPlaces([]);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [locationFromUrl]);

  const normalizedSearchText = searchText.trim().toLowerCase();
  const normalizedLocationText = locationText.trim().toLowerCase();
  const upcomingEvents = useMemo(() => {
    const currentTime = Date.now();
    return events.filter((event) => {
      if (!event.endDate) {
        return true;
      }
      const endTime = new Date(event.endDate).getTime();
      return Number.isFinite(endTime) && endTime >= currentTime;
    });
  }, [events]);

  const baseSuggestions = useMemo(() => {
    const suggestions = [];
    const seenKeys = new Set();
    const pushSuggestion = (suggestion) => {
      const key = `${suggestion.kind}:${normalize(suggestion.label)}`;
      if (!suggestion.label.trim() || seenKeys.has(key)) {
        return;
      }
      seenKeys.add(key);
      suggestions.push(suggestion);
    };

    places.forEach((place) => {
      pushSuggestion({
        id: `place-${place.id}`,
        kind: "place",
        label: place.name,
        value: place.name,
        secondary: place.city?.name,
      });

      const cityName = place.city?.name;
      const countryName = getCountryName(place.city);
      if (cityName) {
        pushSuggestion({
          id: `city-place-${place.id}-${cityName}`,
          kind: "city",
          label: cityName,
          value: cityName,
          secondary: countryName,
        });
      }
      if (countryName) {
        pushSuggestion({
          id: `country-place-${place.id}-${countryName}`,
          kind: "country",
          label: countryName,
          value: countryName,
        });
      }
    });

    upcomingEvents.forEach((event) => {
      pushSuggestion({
        id: `event-${event.id}`,
        kind: "event",
        label: event.title,
        value: event.title,
        secondary: event.venue?.name,
      });

      const cityName = event.venue?.city?.name;
      const countryName = getCountryName(event.venue?.city);
      if (cityName) {
        pushSuggestion({
          id: `city-event-${event.id}-${cityName}`,
          kind: "city",
          label: cityName,
          value: cityName,
          secondary: countryName,
        });
      }
      if (countryName) {
        pushSuggestion({
          id: `country-event-${event.id}-${countryName}`,
          kind: "country",
          label: countryName,
          value: countryName,
        });
      }
    });

    return suggestions;
  }, [places, upcomingEvents]);

  const suggestions = useMemo(() => {
    if (!normalizedSearchText) {
      return [];
    }

    return baseSuggestions
      .filter((suggestion) => {
        const label = normalize(suggestion.label);
        const secondary = normalize(suggestion.secondary);
        return (
          label.includes(normalizedSearchText) ||
          secondary.includes(normalizedSearchText)
        );
      })
      .sort((left, right) => {
        const rankLeft = getSuggestionRank(left, normalizedSearchText);
        const rankRight = getSuggestionRank(right, normalizedSearchText);
        if (rankLeft !== rankRight) {
          return rankLeft - rankRight;
        }
        return left.label.localeCompare(right.label);
      })
      .slice(0, 8);
  }, [baseSuggestions, normalizedSearchText]);

  const filteredPlaces = useMemo(() => {
    const categoryFiltered =
      activeCategory === "all" || activeCategory === "events"
        ? places
        : places.filter(
            (place) =>
              place.type?.toUpperCase() === activeCategory.toUpperCase(),
          );

    return categoryFiltered.filter((place) => {
      const matchSearch =
        !normalizedSearchText ||
        containsText(place.name, normalizedSearchText) ||
        containsText(place.description, normalizedSearchText) ||
        containsText(place.type, normalizedSearchText);

      const countryName = getCountryName(place.city);
      const countryId = normalizeId(getCountryId(place.city));
      const countryCode = normalizeCountryCode(getCountryCode(place.city));
      const matchCountryIdFromUrl =
        !normalizedCountryIdFromUrl || countryId === normalizedCountryIdFromUrl;
      const matchCountryCodeFromUrl =
        !normalizedCountryCodeFromUrl ||
        countryCode === normalizedCountryCodeFromUrl;
      const matchLocation =
        !normalizedLocationText ||
        containsText(place.city?.name, normalizedLocationText) ||
        containsText(countryName, normalizedLocationText);

      return (
        matchCountryIdFromUrl &&
        matchCountryCodeFromUrl &&
        matchSearch &&
        matchLocation
      );
    });
  }, [
    activeCategory,
    normalizedCountryCodeFromUrl,
    normalizedCountryIdFromUrl,
    normalizedLocationText,
    normalizedSearchText,
    places,
  ]);

  const filteredEvents = useMemo(() => {
    if (!(activeCategory === "all" || activeCategory === "events")) {
      return [];
    }

    return upcomingEvents.filter((event) => {
      const venueCity = event.venue?.city?.name;
      const venueCountry = getCountryName(event.venue?.city);
      const venueCountryId = normalizeId(getCountryId(event.venue?.city));
      const venueCountryCode = normalizeCountryCode(
        getCountryCode(event.venue?.city),
      );
      const matchSearch =
        !normalizedSearchText ||
        containsText(event.title, normalizedSearchText) ||
        containsText(event.description, normalizedSearchText) ||
        containsText(event.venue?.name, normalizedSearchText);
      const matchCountryIdFromUrl =
        !normalizedCountryIdFromUrl ||
        venueCountryId === normalizedCountryIdFromUrl;
      const matchCountryCodeFromUrl =
        !normalizedCountryCodeFromUrl ||
        venueCountryCode === normalizedCountryCodeFromUrl;
      const matchLocation =
        !normalizedLocationText ||
        containsText(venueCity, normalizedLocationText) ||
        containsText(venueCountry, normalizedLocationText);
      return (
        matchCountryIdFromUrl &&
        matchCountryCodeFromUrl &&
        matchSearch &&
        matchLocation
      );
    });
  }, [
    activeCategory,
    normalizedCountryCodeFromUrl,
    normalizedCountryIdFromUrl,
    normalizedLocationText,
    normalizedSearchText,
    upcomingEvents,
  ]);

  const handleSearchTextChange = (value) => {
    setSearchText(value);
    setShowSuggestions(Boolean(value.trim()));
    if (!value.trim()) {
      setSelectedSuggestion(null);
    }
  };

  const selectSuggestion = (suggestion) => {
    setSelectedSuggestion(suggestion);
    if (suggestion.kind === "city" || suggestion.kind === "country") {
      setLocationText(suggestion.value);
    } else {
      setSearchText(suggestion.value);
    }
    setShowSuggestions(false);
  };

  const closeSuggestions = () => {
    setShowSuggestions(false);
  };

  const openSuggestions = () => {
    if (searchText.trim()) {
      setShowSuggestions(true);
    }
  };

  return {
    activeCategory,
    events: filteredEvents,
    filteredPlaces,
    locationText,
    loading,
    selectedSuggestion,
    searchText,
    showSuggestions,
    suggestions,
    closeSuggestions,
    handleSearchTextChange,
    openSuggestions,
    selectSuggestion,
    setActiveCategory,
    setLocationText,
    setSearchText,
  };
};
