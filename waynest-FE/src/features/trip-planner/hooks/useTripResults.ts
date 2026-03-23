/**
 * useTripResults Hook
 * Handles trip plan generation and display
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import type { CreateTripPlannerDto, TripPlanView } from '../types';
import { normalizeGeneratedPlan, normalizeStoredPlan } from '../utils/dataNormalizers';
import { saveTripResult, loadTripResult, clearTripResult, saveGuestToken } from '../utils/storage';
import { getApiErrorMessage, getApiErrorStatus, isApiTimeoutError } from '@/core/utils/errors';
import { generateTripPlan } from '@/services/tripPlanner/tripPlanner.service';

export interface UseTripResultsReturn {
  tripPlan: TripPlanView | null;
  generating: boolean;
  resultsRef: React.RefObject<HTMLDivElement | null>;
  setTripPlan: (plan: TripPlanView | null) => void;
  clearPlan: () => void;
  submitTrip: (formData: CreateTripPlannerDto) => Promise<void>;
  loadSavedPlan: (planId: string) => Promise<void>;
  addToWishlist: (placeId: string) => Promise<void>;
  viewPlace: (placeId: string) => void;
}

export const useTripResults = (): UseTripResultsReturn => {
  const navigate = useNavigate();
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const [tripPlan, setTripPlanState] = useState<TripPlanView | null>(null);
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

  const setTripPlan = useCallback((plan: TripPlanView | null) => {
    setTripPlanState(plan);
  }, []);

  const clearPlan = useCallback(() => {
    setTripPlanState(null);
    clearTripResult();
    toast.info('Plan cleared');
  }, []);

  const submitTrip = useCallback(async (formData: CreateTripPlannerDto) => {
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
      toastId: 'trip-generation',
    });

    try {
      setGenerating(true);
      const payload = (await generateTripPlan(
        formData as unknown as Record<string, unknown>,
      )) as unknown as { guestToken?: string | null };
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

  const loadSavedPlan = useCallback(async (planId: string) => {
    try {
      const { fetchTripPlanById } = await import('@/services/tripPlanner/tripPlanner.service');
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

  const addToWishlist = useCallback(async (placeId: string) => {
    try {
      const { addWishlistItem } = await import('@/services/wishlist/wishlist.service');
      await addWishlistItem(placeId);
      toast.success('Added to wishlist');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to add to wishlist'));
    }
  }, []);

  const viewPlace = useCallback((placeId: string) => {
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
    viewPlace,
  };
};
