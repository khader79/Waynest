/**
 * useSavedPlans Hook
 * Handles saved trip plans CRUD operations
 */

import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { extractTripPlans } from '../utils/dataNormalizers';
import { getApiErrorStatus } from '@/core/utils/errors';
import { fetchSavedTripPlans, deleteTripPlan } from '@/features/trip-planner/api';
import { useAuth } from '@/core/providers/AuthContext';











export const useSavedPlans = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [savedPlans, setSavedPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [planToDelete, setPlanToDelete] = useState(null);

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
        toast.error('Failed to load saved plans');
      }
    } finally {
      setLoadingPlans(false);
    }
  }, []);

  const removePlan = useCallback((planId) => {
    setPlanToDelete(planId);
  }, []);

  const confirmDeletePlan = useCallback(async () => {
    if (!planToDelete) return;

    try {
      setLoadingPlans(true);
      await deleteTripPlan(planToDelete);
      setSavedPlans((current) => current.filter((plan) => plan.id !== planToDelete));
      toast.success('Plan deleted');
    } catch (error) {
      if (getApiErrorStatus(error) === 401) {
        navigate('/login');
      } else {
        toast.error('Failed to delete plan');
      }
    } finally {
      setLoadingPlans(false);
      setPlanToDelete(null);
    }
  }, [planToDelete, navigate]);

  const cancelDeletePlan = useCallback(() => {
    setPlanToDelete(null);
  }, []);

  return {
    savedPlans,
    loadingPlans,
    planToDelete,
    loadSavedPlans,
    removePlan,
    confirmDeletePlan,
    cancelDeletePlan
  };
};