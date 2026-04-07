import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { setRemixDraft } from '@/utils/trips/inMemoryDraft';
import { useAuth } from "@/context/AuthContext";
import { copyTextToClipboard } from "@/utils/clipboard";
import { getApiErrorMessage, getApiErrorStatus } from "@/utils/errors";
import { API_BASE_URL } from "@/api/client";
import { copyTripPlan, fetchPublicTripPlan } from "@/api/trips";







































const isRecord = (value) =>
typeof value === "object" && value !== null;

const normalizeNumber = (value, fallback = 0) => {
  const result = typeof value === "number" ? value : Number(value);
  return Number.isFinite(result) ? result : fallback;
};

const normalizeSlot = (value) => {
  if (!isRecord(value)) {
    return null;
  }

  const name = typeof value.name === "string" ? value.name : "";
  const duration = typeof value.duration === "string" ? value.duration : "";
  if (!name || !duration) {
    return null;
  }

  return {
    closeTime:
    typeof value.closeTime === "string" ? value.closeTime : undefined,
    duration,
    estimatedCost: normalizeNumber(value.estimatedCost, 0),
    name,
    openTime: typeof value.openTime === "string" ? value.openTime : undefined,
    placeId: typeof value.placeId === "string" ? value.placeId : undefined,
    type: typeof value.type === "string" ? value.type : undefined
  };
};

const normalizeDay = (value, index) => {
  if (!isRecord(value)) {
    return null;
  }

  return {
    afternoon: normalizeSlot(value.afternoon),
    day: typeof value.day === "number" ? value.day : index + 1,
    evening: normalizeSlot(value.evening),
    morning: normalizeSlot(value.morning),
    totalDayCost: normalizeNumber(value.totalDayCost, 0)
  };
};

const normalizePublicTrip = (value) => {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.shareSlug !== "string") {
    return null;
  }

  if (!isRecord(value.generatedPlan)) {
    return null;
  }

  const generatedPlan = value.generatedPlan;
  const days = Array.isArray(generatedPlan.days) ?
  generatedPlan.days.
  map((day, index) => normalizeDay(day, index)).
  filter((day) => day !== null) :
  [];

  return {
    budget: normalizeNumber(value.budget, 0),
    cityId: typeof value.cityId === "string" ? value.cityId : "",
    cityName:
    typeof value.cityName === "string" && value.cityName.trim().length > 0 ?
    value.cityName :
    null,
    createdAt:
    typeof value.createdAt === "string" ?
    value.createdAt :
    new Date().toISOString(),
    days: normalizeNumber(value.days, days.length || 0),
    description:
    typeof value.description === "string" ? value.description : null,
    generatedPlan: {
      days,
      tips: Array.isArray(generatedPlan.tips) ?
      generatedPlan.tips.filter((tip) => typeof tip === "string") :
      [],
      totalEstimatedCost: normalizeNumber(generatedPlan.totalEstimatedCost, 0)
    },
    id: value.id,
    isPublic: Boolean(value.isPublic),
    persons: normalizeNumber(value.persons, 0),
    shareSlug: value.shareSlug,
    title:
    typeof value.title === "string" && value.title.trim().length > 0 ?
    value.title :
    `Trip to ${typeof value.cityName === "string" ? value.cityName : "Waynest"}`,
    viewCount: normalizeNumber(value.viewCount, 0)
  };
};

export const usePublicTripPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [remixing, setRemixing] = useState(false);

  useEffect(() => {
    if (!slug) {
      setTrip(null);
      setLoading(false);
      return;
    }

    let isActive = true;

    const loadTrip = async () => {
      try {
        setLoading(true);
        const payload = await fetchPublicTripPlan(slug);
        const nextTrip = normalizePublicTrip(payload);
        if (!isActive) {
          return;
        }

        if (!nextTrip) {
          throw new Error("Invalid trip data");
        }

        setTrip(nextTrip);
      } catch (error) {
        if (!isActive) {
          return;
        }

        if (getApiErrorStatus(error) === 404) {
          setTrip(null);
        } else {
          toast.error(getApiErrorMessage(error, "Failed to load trip"));
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    void loadTrip();

    return () => {
      isActive = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!trip || typeof window === "undefined") {
      return;
    }

    const metaTitle = `${trip.title} | Waynest`;
    const metaDescription =
    trip.description ??
    `${trip.days}-day travel plan for ${trip.cityName ?? "your next trip"}.`;
    const canonicalUrl = `${window.location.origin}/trip/${trip.shareSlug}`;
    const ogImage = `${API_BASE_URL}/trip-planner/public/${trip.shareSlug}/og-image`;

    document.title = metaTitle;

    const upsertMeta = (
    attribute,
    key,
    value) =>
    {
      let tag = document.head.querySelector(
        `meta[${attribute}="${key}"]`
      );
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute(attribute, key);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", value);
    };

    const upsertLink = (rel, href) => {
      let tag = document.head.querySelector(`link[rel="${rel}"]`);
      if (!tag) {
        tag = document.createElement("link");
        tag.setAttribute("rel", rel);
        document.head.appendChild(tag);
      }
      tag.setAttribute("href", href);
    };

    upsertMeta("name", "description", metaDescription);
    upsertMeta("property", "og:title", metaTitle);
    upsertMeta("property", "og:description", metaDescription);
    upsertMeta("property", "og:type", "article");
    upsertMeta("property", "og:url", canonicalUrl);
    upsertMeta("property", "og:image", ogImage);
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", metaTitle);
    upsertMeta("name", "twitter:description", metaDescription);
    upsertMeta("name", "twitter:image", ogImage);
    upsertLink("canonical", canonicalUrl);
  }, [trip]);

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined" || !trip?.shareSlug) {
      return "";
    }

    return `${window.location.origin}/trip/${trip.shareSlug}`;
  }, [trip?.shareSlug]);

  const copyLink = async () => {
    if (!shareUrl) {
      return;
    }

    try {
      await copyTextToClipboard(shareUrl);
      toast.success("Link copied");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const remixTrip = async () => {
    if (!trip) {
      return;
    }

    try {
      setRemixing(true);
      if (isAuthenticated) {
        await copyTripPlan(trip.id);
        toast.success("Trip copied to your saved plans");
        navigate("/plan");
        return;
      }
      setRemixDraft({
        budget: trip.budget,
        cityId: trip.cityId,
        days: trip.days,
        persons: trip.persons,
        sourceDescription: trip.description,
        sourceSlug: trip.shareSlug,
        sourceTitle: trip.title
      });
      navigate("/plan");
    } catch {
      toast.error("Failed to load draft");
    } finally {
      setRemixing(false);
    }
  };

  return {
    copyLink,
    isAuthenticated,
    loading,
    remixTrip,
    remixing,
    shareUrl,
    trip
  };
};