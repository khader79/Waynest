/**
 * useTripResults Hook
 * Handles trip plan generation and display
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { generateTripPlan } from "@/api/trips";
import { STORAGE_KEYS } from "@/utils/storageKeys";

export const useTripResults = () => {
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
    toast.info("Plan cleared");
  }, [isAuthenticated]);

  const submitTrip = useCallback(
    async (formData) => {
      if (!formData?.cityId) {
        toast.error("Please select a city");
        return;
      }

      // Check for budget warning
      const minimumBudget = formData.persons * formData.days * 100;
      if (formData.budget < minimumBudget) {
        toast.warn(
          `Budget may be too low. Recommended minimum: ${minimumBudget} ILS`,
        );
      }

      setGenerating(true);
      try {
        const sanitizedTripInput = sanitizeTripData(formData);
        const plannerPayload = sanitizedTripInput;
        const payload = await generateTripPlan(plannerPayload);
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
          toast.error("Request timed out. Please try again.");
          return;
        }

        if (getApiErrorStatus(error) === 429) {
          toast.error(
            getApiErrorMessage(
              error,
              "Too many requests. Please wait a few minutes.",
            ),
          );
          return;
        }

        if (getApiErrorStatus(error) === 401) {
          navigate("/login");
          return;
        }

        toast.error(getApiErrorMessage(error, "Failed to generate trip plan"));
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
    toast.success("Trip plan ready!");
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [pendingTrip]);

  const loadSavedPlan = useCallback(
    async (planId) => {
      try {
        const { fetchTripPlanById } = await import("@/api/trips");
        const payload = await fetchTripPlanById(planId);
        const nextTripPlan = normalizeStoredPlan(payload);

        if (!nextTripPlan) {
          toast.error("Failed to load selected plan");
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
          toast.error("Failed to load selected plan");
        }
      }
    },
    [navigate],
  );

  const addToWishlist = useCallback(async (placeId) => {
    try {
      const { addWishlistItem } = await import("@/api/user");
      await addWishlistItem(placeId);
      toast.success("Added to wishlist");
    } catch (error) {
      if (getApiErrorStatus(error) === 409) {
        toast.info("Already in wishlist");
        return;
      }
      toast.error(getApiErrorMessage(error, "Failed to add to wishlist"));
    }
  }, []);

  const viewPlace = useCallback(
    (placeId) => {
      navigate(`/places/${placeId}`);
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
    finishAnimation,
    commitPendingPlan,
  };
};
