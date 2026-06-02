/**
 * useTripResults Hook
 * Handles trip plan generation and display
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";

import {
  normalizeGeneratedPlan,
  normalizeStoredPlan,
} from "@/utils/trips/dataNormalizers";
import { sanitizeTripData } from "@/utils/trips/validation/tripValidation";
import {
  saveTripResult,
  loadTripResult,
  clearTripResult,
  saveGuestToken,
} from "@/utils/trips/storage";
import {
  setResultDraft,
  getResultDraft,
  clearResultDraft,
} from "@/utils/trips/inMemoryDraft";
import {
  getApiErrorMessage,
  getApiErrorStatus,
  isApiTimeoutError,
} from "@/utils/errors";
import { generateTripPlan, getJobResult } from "@/api/trips";
import { STORAGE_KEYS } from "@/utils/storageKeys";

const POLL_INTERVAL_MS = 2_000;
const POLL_MAX_RETRIES = 150; // 5 minutes max

function waitForItinerary(jobId, isAuthenticated, helpers) {
  const {
    setTripPlanState,
    setPendingTrip,
    setFinishAnimation,
    setGenerating,
    normalizeGeneratedPlan,
    saveGuestToken,
    formData,
    t,
    navigate,
  } = helpers;

  const onReady = (payload) => {
    cleanup();
    if (payload.guestToken) saveGuestToken(payload.guestToken);
    const plan = normalizeGeneratedPlan(payload);
    if (!plan) {
      toast.error(t("toasts.tripResults.failedToGenerate"));
      setGenerating(false);
      return;
    }
    setTripPlanState(plan);
    setPendingTrip(plan);
    setFinishAnimation(true);
  };

  const onError = (payload) => {
    cleanup();
    setGenerating(false);
    toast.error(payload?.error || t("toasts.tripResults.failedToGenerate"));
  };

  const cleanup = () => {
    window.removeEventListener("itinerary:ready", onReady);
    window.removeEventListener("itinerary:error", onError);
    pollingCleanup && pollingCleanup();
  };

  let pollingCleanup = null;

  if (isAuthenticated) {
    window.addEventListener("itinerary:ready", onReady);
    window.addEventListener("itinerary:error", onError);
  } else {
    let retries = 0;
    let active = true;

    const poll = async () => {
      if (!active) return;
      try {
        const res = await getJobResult(jobId);
        if (!active) return;

        if (res.status === 'completed') {
          pollingCleanup = null;
          onReady(res.result);
        } else if (res.status === 'failed') {
          pollingCleanup = null;
          onError(res);
        } else if (res.status === 'not_found') {
          pollingCleanup = null;
          onError({ error: 'Job not found' });
        } else if (retries < POLL_MAX_RETRIES) {
          retries++;
          setTimeout(poll, POLL_INTERVAL_MS);
        } else {
          pollingCleanup = null;
          setGenerating(false);
          toast.error(t("toasts.tripResults.failedToGenerate"));
        }
      } catch {
        if (!active) return;
        if (retries < POLL_MAX_RETRIES) {
          retries++;
          setTimeout(poll, POLL_INTERVAL_MS);
        } else {
          pollingCleanup = null;
          setGenerating(false);
          toast.error(t("toasts.tripResults.failedToGenerate"));
        }
      }
    };

    pollingCleanup = () => { active = false; };
    setTimeout(poll, POLL_INTERVAL_MS);
  }
}

export const useTripResults = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const resultsRef = useRef(null);
  const [tripPlan, setTripPlanState] = useState(null);
  const [generating, setGenerating] = useState(false);
  const { isAuthenticated } = useAuth();
  const [pendingTrip, setPendingTrip] = useState(null);
  const [finishAnimation, setFinishAnimation] = useState(false);

  // Load saved result on mount (localStorage for authenticated users,
  // in-memory for guests)
  useEffect(() => {
    if (isAuthenticated) {
      const savedResult = loadTripResult();
      if (savedResult) {
        setTripPlanState(savedResult);
      }
    } else {
      const draft = getResultDraft();
      if (draft) {
        setTripPlanState(draft);
      }
    }
  }, [isAuthenticated]);

  // Persist result on change: authenticated => localStorage, guest => in-memory
  useEffect(() => {
    if (tripPlan) {
      if (isAuthenticated) {
        saveTripResult(tripPlan);
      } else {
        setResultDraft(tripPlan);
      }
    } else {
      if (isAuthenticated) {
        clearTripResult();
      } else {
        clearResultDraft();
      }
    }
  }, [tripPlan, isAuthenticated]);

  const setTripPlan = useCallback((plan) => {
    setTripPlanState(plan);
  }, []);

  const clearPlan = useCallback(() => {
    setTripPlanState(null);
    if (isAuthenticated) {
      clearTripResult();
    } else {
      clearResultDraft();
    }
    toast.info(t("toasts.tripResults.planCleared"));
  }, [isAuthenticated]);

  const submitTrip = useCallback(
    async (formData) => {
      const hasPrompt = Boolean(formData?.naturalLanguagePrompt);

      if (!hasPrompt && !formData?.cityId) {
        toast.error(t("toasts.tripResults.pleaseSelectCity"));
        return;
      }

      // Check for budget warning
      const minimumBudget = formData.persons * formData.days * 100;
      if (formData.budget < minimumBudget) {
        toast.warn(t("toasts.tripResults.budgetTooLow", { amount: minimumBudget, currency: "ILS" }));
      }

      setGenerating(true);
      try {
        const sanitizedTripInput = sanitizeTripData(formData);
        const plannerPayload = { ...sanitizedTripInput };
        if (hasPrompt) plannerPayload.naturalLanguagePrompt = formData.naturalLanguagePrompt;
        const payload = await generateTripPlan(plannerPayload);

        // Async queue flow
        if (payload.jobId && payload.status === 'queued') {
          void waitForItinerary(payload.jobId, isAuthenticated, {
            setTripPlanState,
            setPendingTrip,
            setFinishAnimation,
            setGenerating,
            normalizeGeneratedPlan,
            saveGuestToken,
            formData,
            isAuthenticated,
            t,
            navigate,
          });
          return;
        }

        // Synchronous fallback (queue not available)
        const nextTripPlan = normalizeGeneratedPlan(payload);

        if (!nextTripPlan) throw new Error("Invalid response from server");

        if (payload.guestToken) saveGuestToken(payload.guestToken);

        // Persist raw generated payload + form data for guests so that if they
        // sign in later we can persist the exact same generated plan server-side.
        try {
          if (!isAuthenticated) {
            try {
              localStorage.setItem(
                STORAGE_KEYS.pendingTripGeneration,
                JSON.stringify({ formData, generatedPayload: payload }),
              );
            } catch {}
          }
        } catch {
          /* ignore */
        }

        // Show the generated plan immediately to avoid cases where the
        // skeleton animation never completes (guest browsers, dev hiccups)
        // — still keep the pending animation flow intact.
        setTripPlanState(nextTripPlan);
        setPendingTrip(nextTripPlan);
        setFinishAnimation(true);
        // trip will be committed after skeleton finishes animation
      } catch (error) {
        setGenerating(false);
        if (isApiTimeoutError(error)) {
          toast.error(t("toasts.tripResults.requestTimedOut"));
          return;
        }

        if (getApiErrorStatus(error) === 429) {
          toast.error(
            getApiErrorMessage(
              error,
              t("toasts.tripResults.tooManyRequests"),
            ),
          );
          return;
        }

        if (getApiErrorStatus(error) === 401) {
          navigate("/login");
          return;
        }

        toast.error(getApiErrorMessage(error, t("toasts.tripResults.failedToGenerate")));
      }
    },
    [navigate, isAuthenticated],
  );

  const commitPendingPlan = useCallback(() => {
    if (!pendingTrip) {
      setFinishAnimation(false);
      setGenerating(false);
      return;
    }
    setTripPlanState(pendingTrip);
    setPendingTrip(null);
    setFinishAnimation(false);
    setGenerating(false);
    toast.success(t("toasts.tripResults.tripPlanReady"));
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [pendingTrip]);

  const loadSavedPlan = useCallback(
    async (planId) => {
      try {
        const { fetchTripPlanById } = await import("@/api/trips");
        const payload = await fetchTripPlanById(planId);
        const nextTripPlan = normalizeStoredPlan(payload);

        if (!nextTripPlan) {
          toast.error(t("toasts.tripResults.failedToLoadSelectedPlan"));
          return;
        }

        setTripPlanState(nextTripPlan);
        resultsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      } catch (error) {
        if (getApiErrorStatus(error) === 401) {
          navigate("/login");
        } else {
          toast.error(t("toasts.tripResults.failedToLoadSelectedPlan"));
        }
      }
    },
    [navigate],
  );

  const addToWishlist = useCallback(async (placeId) => {
    try {
      const { addWishlistItem } = await import("@/api/user");
      await addWishlistItem(placeId);
      toast.success(t("toasts.tripResults.addedToWishlist"));
    } catch (error) {
      if (getApiErrorStatus(error) === 409) {
        toast.info(t("toasts.tripResults.alreadyInWishlist"));
        return;
      }
      toast.error(getApiErrorMessage(error, t("toasts.tripResults.failedToAddToWishlist")));
    }
  }, []);

  const viewPlace = useCallback(
    (placeId) => {
      navigate(`/places/${placeId}`);
    },
    [navigate],
  );

  const viewEvent = useCallback(
    (eventId) => {
      navigate(`/events/${eventId}`);
    },
    [navigate],
  );

  return {
    tripPlan,
    generating,
    resultsRef,
    setTripPlan,
    clearPlan,
    submitTrip,
    loadSavedPlan,
    addToWishlist,
    viewPlace,
    viewEvent,
    finishAnimation,
    commitPendingPlan,
  };
};
