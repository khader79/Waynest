/**
 * useTripSharing Hook
 * Handles trip plan sharing functionality
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { toast } from "react-toastify";

import { getApiErrorMessage } from "@/utils/errors";
import { copyTextToClipboard } from "@/utils/clipboard";
import { publishTripPlan } from "@/api/trips";

const toLocalTripUrl = (rawUrl, shareSlug) => {
  if (typeof window === "undefined") {
    return null;
  }
  if (shareSlug) {
    return `${window.location.origin}/trip/${shareSlug}`;
  }
  if (!rawUrl) {
    return null;
  }
  try {
    const parsed = new URL(rawUrl);
    return `${window.location.origin}${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
};

export const useTripSharing = (tripPlan, setTripPlan, formData) => {
  const [publishing, setPublishing] = useState(false);
  const [shareTitle, setShareTitle] = useState("");
  const [shareVisibility, setShareVisibility] = useState("PUBLIC");

  useEffect(() => {
    setShareTitle(tripPlan?.title?.trim() || "");
    setShareVisibility(tripPlan?.shareVisibility || "PUBLIC");
  }, [
    tripPlan?.shareVisibility,
    tripPlan?.title,
    tripPlan?.tripPlanId,
  ]);

  const hasShareLink = useMemo(
    () => Boolean(tripPlan?.shareSlug || tripPlan?.shareUrl),
    [tripPlan?.shareUrl, tripPlan?.shareSlug],
  );

  const getShareUrl = useCallback((shareSlug) => {
    if (!shareSlug || typeof window === "undefined") {
      return null;
    }
    return `${window.location.origin}/trip/${shareSlug}`;
  }, []);

  const publicShareUrl = useMemo(
    () =>
      hasShareLink
        ? (toLocalTripUrl(tripPlan?.shareUrl, tripPlan?.shareSlug) ?? "")
        : "",
    [hasShareLink, tripPlan?.shareUrl, tripPlan?.shareSlug],
  );

  const publishPlan = useCallback(async () => {
    if (!tripPlan) {
      toast.error("Generate a trip first");
      return;
    }

    try {
      const title = shareTitle.trim();
      if (!title) {
        toast.error("Choose a trip name before saving or sharing");
        return;
      }

      setPublishing(true);

      const description =
        tripPlan.description ??
        `A ${formData.days}-day itinerary for ${formData.persons} traveler(s)${formData.interests?.length ? ` focused on ${formData.interests.join(", ")}` : ""}.`;

      // Call API to publish
      const response = await publishTripPlan(tripPlan.tripPlanId, {
        description,
        shareVisibility,
        title,
      });

      // Get share URL
      const shareUrl = toLocalTripUrl(response.shareUrl, response.shareSlug);
      if (!shareUrl) {
        throw new Error("Share link missing");
      }

      // Update trip plan with sharing info
      const nextTripPlan = {
        ...tripPlan,
        description,
        isPublic: response.isPublic,
        shareSlug: response.shareSlug,
        shareUrl,
        shareVisibility: response.shareVisibility || shareVisibility,
        title,
      };

      setTripPlan(nextTripPlan);
      await copyTextToClipboard(shareUrl);
      toast.success("Public link copied to clipboard!");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to publish trip"));
    } finally {
      setPublishing(false);
    }
  }, [tripPlan, formData, setTripPlan, shareTitle, shareVisibility]);

  const copyShareLink = useCallback(async () => {
    const shareUrl = toLocalTripUrl(tripPlan?.shareUrl, tripPlan?.shareSlug);

    if (!shareUrl) {
      // No share link yet, trigger publish
      await publishPlan();
      return;
    }

    try {
      await copyTextToClipboard(shareUrl);
      toast.success("Link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link");
    }
  }, [tripPlan, publishPlan]);

  return {
    publishing,
    hasShareLink,
    publicShareUrl,
    publishPlan,
    copyShareLink,
    getShareUrl,
    shareTitle,
    setShareTitle,
    shareVisibility,
    setShareVisibility,
  };
};
