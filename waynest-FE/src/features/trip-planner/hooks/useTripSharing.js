/**
 * useTripSharing Hook
 * Handles trip plan sharing functionality
 */

import { useState, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';

import { getApiErrorMessage } from '@/core/utils/errors';
import { copyTextToClipboard } from '@/core/utils/clipboard';
import { publishTripPlan } from '@/features/trip-planner/api';










const toLocalTripUrl = (rawUrl, shareSlug) => {
  if (typeof window === 'undefined') {
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

export const useTripSharing = (
tripPlan,
setTripPlan,
formData) =>
{
  const [publishing, setPublishing] = useState(false);

  const hasShareLink = useMemo(
    () => Boolean(tripPlan?.isPublic && (tripPlan.shareUrl || tripPlan.shareSlug)),
    [tripPlan?.isPublic, tripPlan?.shareUrl, tripPlan?.shareSlug]
  );

  const getShareUrl = useCallback((shareSlug) => {
    if (!shareSlug || typeof window === 'undefined') {
      return null;
    }
    return `${window.location.origin}/trip/${shareSlug}`;
  }, []);

  const publicShareUrl = useMemo(
    () =>
    hasShareLink ?
    toLocalTripUrl(tripPlan?.shareUrl, tripPlan?.shareSlug) ?? '' :
    '',
    [hasShareLink, tripPlan?.shareUrl, tripPlan?.shareSlug]
  );

  const publishPlan = useCallback(async () => {
    if (!tripPlan) {
      toast.error('Generate a trip first');
      return;
    }

    try {
      setPublishing(true);

      // Generate title and description
      const cityLabel = formData.cityId || 'Trip Destination';
      const title = tripPlan.title ?? `${cityLabel} in ${formData.days} days`;
      const description =
      tripPlan.description ??
      `A ${formData.days}-day itinerary for ${formData.persons} traveler(s)${formData.interests?.length ? ` focused on ${formData.interests.join(', ')}` : ''}.`;

      // Call API to publish
      const response = await publishTripPlan(tripPlan.tripPlanId, {
        description,
        isPublic: true,
        title
      });

      // Get share URL
      const shareUrl = toLocalTripUrl(response.shareUrl, response.shareSlug);
      if (!shareUrl) {
        throw new Error('Share link missing');
      }

      // Update trip plan with sharing info
      const nextTripPlan = {
        ...tripPlan,
        description,
        isPublic: response.isPublic,
        shareSlug: response.shareSlug,
        shareUrl,
        title
      };

      setTripPlan(nextTripPlan);
      await copyTextToClipboard(shareUrl);
      toast.success('Public link copied to clipboard!');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to publish trip'));
    } finally {
      setPublishing(false);
    }
  }, [tripPlan, formData, setTripPlan, getShareUrl]);

  const copyShareLink = useCallback(async () => {
    const shareUrl = tripPlan?.isPublic ?
    toLocalTripUrl(tripPlan.shareUrl, tripPlan.shareSlug) :
    null;

    if (!shareUrl) {
      // No share link yet, trigger publish
      await publishPlan();
      return;
    }

    try {
      await copyTextToClipboard(shareUrl);
      toast.success('Link copied to clipboard!');
    } catch {
      toast.error('Failed to copy link');
    }
  }, [tripPlan, getShareUrl, publishPlan]);

  return {
    publishing,
    hasShareLink,
    publicShareUrl,
    publishPlan,
    copyShareLink,
    getShareUrl
  };
};