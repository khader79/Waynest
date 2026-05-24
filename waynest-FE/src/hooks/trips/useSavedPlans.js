/**
 * useSavedPlans Hook
 * Handles saved trip plans CRUD operations
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

import { extractTripPlans } from "@/utils/trips/dataNormalizers";
import { getApiErrorStatus } from "@/utils/errors";
import { fetchSavedTripPlans, deleteTripPlan } from "@/api/trips";
import { useAuth } from "@/context/AuthContext";

export const useSavedPlans = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [savedPlans, setSavedPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const plansRef = useRef(savedPlans);

  useEffect(() => {
    plansRef.current = savedPlans;
  }, [savedPlans]);

  // Load saved plans when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      void loadSavedPlans();
    } else {
      setSavedPlans([]);
    }
  }, [isAuthenticated]);

  const loadSavedPlans = useCallback(async () => {
    try {
      setLoadingPlans(true);
      const payload = await fetchSavedTripPlans();
      const plans = extractTripPlans(payload);
      setSavedPlans(plans);
    } catch (error) {
      if (getApiErrorStatus(error) !== 401) {
        toast.error(t("toasts.savedPlans.failedToLoad"));
      }
    } finally {
      setLoadingPlans(false);
    }
  }, []);

  const removePlan = useCallback(async (planId) => {
    const snapshot = plansRef.current;
    const removed = snapshot.find((p) => p.id === planId);
    setSavedPlans((current) =>
      current.filter((plan) => plan.id !== planId),
    );

    try {
      await deleteTripPlan(planId);
      toast.success(t("toasts.savedPlans.planDeleted"));
    } catch (error) {
      if (removed) {
        setSavedPlans((current) => [...current, removed]);
      }
      if (getApiErrorStatus(error) === 401) {
        navigate("/login");
      } else {
        toast.error(t("toasts.savedPlans.failedToDeletePlan"));
      }
    }
  }, [navigate]);

  return {
    savedPlans,
    loadingPlans,
    loadSavedPlans,
    removePlan,
  };
};
