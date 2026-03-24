import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { fetchPublicEvents, fetchPublicPlaces } from "@/services/catalog/catalog.service";

export interface ExplorePlace {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  ratingAverage: string;
  ratingCount: number;
  slug: string;
  latitude: string;
  longitude: string;
  type: string;
  city?: {
    name: string;
    country?: {
      name?: string;
    };
    countryName?: string;
  };
}

export interface ExploreEvent {
  id: string;
  slug?: string | null;
  title: string;
  description?: string;
  imageUrl?: string | null;
  startDate?: string;
  endDate?: string;
  venue?: {
    name?: string;
    city?: {
      name?: string;
      country?: {
        name?: string;
      };
      countryName?: string;
    };
  };
}

type ExploreSuggestionKind = "place" | "event" | "city" | "country";

export interface ExploreSuggestion {
  id: string;
  label: string;
  value: string;
  kind: ExploreSuggestionKind;
  secondary?: string;
}

const extractPlaces = (payload: unknown) => {
  if (Array.isArray(payload)) {
    return payload as ExplorePlace[];
  }

  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { data?: ExplorePlace[] }).data)
  ) {
    return (payload as { data: ExplorePlace[] }).data;
  }

  return [] as ExplorePlace[];
};

const extractEvents = (payload: unknown) => {
  if (Array.isArray(payload)) {
    return payload as ExploreEvent[];
  }

  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { data?: ExploreEvent[] }).data)
  ) {
    return (payload as { data: ExploreEvent[] }).data;
  }

  return [] as ExploreEvent[];
};

const containsText = (value: string | undefined | null, query: string) =>
  (value ?? "").toLowerCase().includes(query);

const normalize = (value: string | undefined | null) => (value ?? "").trim().toLowerCase();

const getSuggestionRank = (suggestion: ExploreSuggestion, query: string) => {
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
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [locationText, setLocationText] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<ExploreSuggestion | null>(null);
  const [places, setPlaces] = useState<ExplorePlace[]>([]);
  const [events, setEvents] = useState<ExploreEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [placesPayload, eventsPayload] = await Promise.all([
          fetchPublicPlaces(),
          fetchPublicEvents(),
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
  }, []);

  const normalizedSearchText = searchText.trim().toLowerCase();
  const normalizedLocationText = locationText.trim().toLowerCase();
  const upcomingEvents = useMemo(
    () => {
      const currentTime = Date.now();
      return events.filter((event) => {
        if (!event.endDate) {
          return true;
        }
        const endTime = new Date(event.endDate).getTime();
        return Number.isFinite(endTime) && endTime >= currentTime;
      });
    },
    [events],
  );

  const baseSuggestions = useMemo(() => {
    const suggestions: ExploreSuggestion[] = [];
    const seenKeys = new Set<string>();
    const pushSuggestion = (suggestion: ExploreSuggestion) => {
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
      const countryName = place.city?.country?.name ?? place.city?.countryName;
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
      const countryName = event.venue?.city?.country?.name ?? event.venue?.city?.countryName;
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
      return [] as ExploreSuggestion[];
    }

    return baseSuggestions
      .filter((suggestion) => {
        const label = normalize(suggestion.label);
        const secondary = normalize(suggestion.secondary);
        return label.includes(normalizedSearchText) || secondary.includes(normalizedSearchText);
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
        : places.filter((place) => place.type?.toUpperCase() === activeCategory.toUpperCase());

    return categoryFiltered.filter((place) => {
      const matchSearch =
        !normalizedSearchText ||
        containsText(place.name, normalizedSearchText) ||
        containsText(place.description, normalizedSearchText) ||
        containsText(place.type, normalizedSearchText);

      const countryName = place.city?.country?.name ?? place.city?.countryName;
      const matchLocation =
        !normalizedLocationText ||
        containsText(place.city?.name, normalizedLocationText) ||
        containsText(countryName, normalizedLocationText);

      return matchSearch && matchLocation;
    });
  }, [activeCategory, normalizedLocationText, normalizedSearchText, places]);

  const filteredEvents = useMemo(() => {
    if (!(activeCategory === "all" || activeCategory === "events")) {
      return [] as ExploreEvent[];
    }

    return upcomingEvents
      .filter((event) => {
        const venueCity = event.venue?.city?.name;
        const venueCountry = event.venue?.city?.country?.name ?? event.venue?.city?.countryName;
        const matchSearch =
          !normalizedSearchText ||
          containsText(event.title, normalizedSearchText) ||
          containsText(event.description, normalizedSearchText) ||
          containsText(event.venue?.name, normalizedSearchText);
        const matchLocation =
          !normalizedLocationText ||
          containsText(venueCity, normalizedLocationText) ||
          containsText(venueCountry, normalizedLocationText);
        return matchSearch && matchLocation;
      });
  }, [activeCategory, normalizedLocationText, normalizedSearchText, upcomingEvents]);

  const handleSearchTextChange = (value: string) => {
    setSearchText(value);
    setShowSuggestions(Boolean(value.trim()));
    if (!value.trim()) {
      setSelectedSuggestion(null);
    }
  };

  const selectSuggestion = (suggestion: ExploreSuggestion) => {
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
