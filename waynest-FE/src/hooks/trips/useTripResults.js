/**
 * useTripResults Hook
 * Handles trip plan generation and display
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { normalizeGeneratedPlan, normalizeStoredPlan } from '@/utils/trips/dataNormalizers';
import { saveTripResult, loadTripResult, clearTripResult, saveGuestToken } from '@/utils/trips/storage';
import { getApiErrorMessage, getApiErrorStatus, isApiTimeoutError } from '@/utils/errors';
import { generateTripPlan } from '@/api/trips';













export const useTripResults = () => {
  const navigate = useNavigate();
  const resultsRef = useRef(null);
  const [tripPlan, setTripPlanState] = useState(null);
  const [generating, setGenerating] = useState(false);

  // Load saved result on mount
  useEffect(() => {
    const savedResult = loadTripResult();
    if (savedResult) {
      setTripPlanState(savedResult);
    }
  }, []);

  // Persist result on change
  useEffect(() => {
    if (tripPlan) {
      saveTripResult(tripPlan);
    } else {
      clearTripResult();
    }
  }, [tripPlan]);

  const setTripPlan = useCallback((plan) => {
    setTripPlanState(plan);
  }, []);

  const clearPlan = useCallback(() => {
    setTripPlanState(null);
    clearTripResult();
    toast.info('Plan cleared');
  }, []);

  const submitTrip = useCallback(async (formData) => {
    if (!formData.cityId) {
      toast.error('Please select a city');
      return;
    }

    // Check for budget warning
    const minimumBudget = formData.persons * formData.days * 100;
    if (formData.budget < minimumBudget) {
      toast.warn(`Budget may be too low. Recommended minimum: ${minimumBudget} ILS`);
    }

    toast.info('Generating your trip...', {
      autoClose: 25000,
      toastId: 'trip-generation'
    });

    try {
      setGenerating(true);
      const payload = await generateTripPlan(
        formData
      );
      const nextTripPlan = normalizeGeneratedPlan(payload);

      if (!nextTripPlan) {
        throw new Error('Invalid response from server');
      }

      // Store guest token if returned
      if (payload.guestToken) {
        saveGuestToken(payload.guestToken);
      }

      setTripPlanState(nextTripPlan);
      toast.dismiss('trip-generation');
      toast.success('Trip plan ready!');

      // Scroll to results
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      toast.dismiss('trip-generation');

      if (isApiTimeoutError(error)) {
        toast.error('Request timed out. Please try again.');
        return;
      }

      if (getApiErrorStatus(error) === 429) {
        toast.error(getApiErrorMessage(error, 'Too many requests. Please wait a few minutes.'));
        return;
      }

      if (getApiErrorStatus(error) === 401) {
        navigate('/login');
        return;
      }

      toast.error(getApiErrorMessage(error, 'Failed to generate trip plan'));
    } finally {
      setGenerating(false);
    }
  }, [navigate]);

  const loadSavedPlan = useCallback(async (planId) => {
    try {
      const { fetchTripPlanById } = await import('@/api/trips');
      const payload = await fetchTripPlanById(planId);
      const nextTripPlan = normalizeStoredPlan(payload);

      if (!nextTripPlan) {
        toast.error('Failed to load selected plan');
        return;
      }

      setTripPlanState(nextTripPlan);
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      if (getApiErrorStatus(error) === 401) {
        navigate('/login');
      } else {
        toast.error('Failed to load selected plan');
      }
    }
  }, [navigate]);

  const addToWishlist = useCallback(async (placeId) => {
    try {
      const { addWishlistItem } = await import('@/api/user');
      await addWishlistItem(placeId);
      toast.success('Added to wishlist');
    } catch (error) {
      if (getApiErrorStatus(error) === 409) {
        toast.info('Already in wishlist');
        return;
      }
      toast.error(getApiErrorMessage(error, 'Failed to add to wishlist'));
    }
  }, []);

  const viewPlace = useCallback((placeId) => {
    navigate(`/places/${placeId}`);
  }, [navigate]);

  return {
    tripPlan,
    generating,
    resultsRef,
    setTripPlan,
    clearPlan,
    submitTrip,
    loadSavedPlan,
    addToWishlist,
    viewPlace
  };
};