/**
 * useTripPlanner - Main composable hook
 * Orchestrates all trip planner functionality
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import type { CreateTripPlannerDto, TripPlanView, TripPlanSummary, TripPlannerCity, TripPlannerTag } from '../types';
import type { CatalogCountry } from '@/services/catalog/catalog.service';
import { useAuth } from '@/core/providers/AuthContext';
import { useTripForm } from './useTripForm';
import { useTripResults } from './useTripResults';
import { useTripSharing } from './useTripSharing';
import { useSavedPlans } from './useSavedPlans';
import {
  fetchAllCities,
  fetchAllCountries,
  fetchCitiesByCountry,
  fetchCityById,
  fetchTags,
} from '@/services/catalog/catalog.service';
import { extractCities, extractTags } from '../utils/dataNormalizers';
import { loadRemixDraft, clearRemixDraft } from '../utils/storage';
import { formatDate } from '../utils/formatters';

export interface UseTripPlannerReturn {
  // Form state
  formData: CreateTripPlannerDto;
  errors: Record<string, string>;
  isValid: boolean;
  budgetTooLow: boolean;
  minimumBudget: number;

  // Location data
  countries: CatalogCountry[];
  cities: TripPlannerCity[];
  tags: TripPlannerTag[];
  selectedCountryId: string | null;
  loadingCountries: boolean;
  loadingCities: boolean;

  // Results state
  tripPlan: TripPlanView | null;
  generating: boolean;
  resultsRef: React.RefObject<HTMLDivElement | null>;

  // Sharing state
  publishing: boolean;
  hasShareLink: boolean;
  publicShareUrl: string;

  // Saved plans state
  savedPlans: TripPlanSummary[];
  loadingPlans: boolean;
  planToDelete: string | null;

  // Auth state
  isAuthenticated: boolean;

  // Formatters
  formatCityLabel: (cityId: string) => string;
  formatDate: (value: string) => string;

  // Form handlers
  updateCity: (value: string) => void;
  updateDays: (event: ChangeEvent<HTMLInputElement>) => void;
  updateBudget: (event: ChangeEvent<HTMLInputElement>) => void;
  updatePersons: (event: ChangeEvent<HTMLInputElement>) => void;
  toggleInterest: (tagName: string) => void;
  onCountryChange: (countryId: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;

  // Results handlers
  clearPlan: () => void;
  publishPlan: () => Promise<void>;
  copyShareLink: () => Promise<void>;
  addToWishlist: (placeId: string) => Promise<void>;
  viewPlace: (placeId: string) => void;

  // Saved plans handlers
  loadPlan: (planId: string) => Promise<void>;
  removePlan: (planId: string) => void;
  confirmDeletePlan: () => Promise<void>;
  cancelDeletePlan: () => void;
}

export const useTripPlanner = (): UseTripPlannerReturn => {
  const { isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const appliedCityFromUrlRef = useRef<string | null>(null);

  // Initialize individual hooks
  const {
    formData,
    errors,
    isValid,
    budgetTooLow,
    minimumBudget,
    updateCity,
    updateDays,
    updateBudget,
    updatePersons,
    toggleInterest,
    setFormData,
  } = useTripForm();
  const resultsHook = useTripResults();
  const sharingHook = useTripSharing(resultsHook.tripPlan, resultsHook.setTripPlan, formData);
  const savedPlansHook = useSavedPlans();

  // Location data state
  const [countries, setCountries] = useState<CatalogCountry[]>([]);
  const [cities, setCities] = useState<TripPlannerCity[]>([]);
  const [tags, setTags] = useState<TripPlannerTag[]>([]);
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  // City lookup for label formatting
  const cityLookup = useMemo(() => {
    const map = new Map<string, TripPlannerCity>();
    cities.forEach((city) => map.set(city.id, city));
    return map;
  }, [cities]);

  // Load initial data
  useEffect(() => {
    void loadInitialData();

    // Check for remix draft
    const remixDraft = loadRemixDraft();
    if (remixDraft) {
      setFormData(remixDraft);
      clearRemixDraft();
      toast.info('Shared trip loaded into the planner');
    }
  }, [setFormData]);

  const loadInitialData = async () => {
    await Promise.all([loadCountries(), loadCities(), loadTags()]);
  };

  const loadCountries = async () => {
    try {
      setLoadingCountries(true);
      const data = await fetchAllCountries();
      setCountries(data);
    } catch {
      toast.error('Failed to load countries');
    } finally {
      setLoadingCountries(false);
    }
  };

  const loadCities = async () => {
    try {
      setLoadingCities(true);
      const data = await fetchAllCities();
      setCities(extractCities(data));
    } catch {
      toast.error('Failed to load cities');
    } finally {
      setLoadingCities(false);
    }
  };

  const loadTags = async () => {
    try {
      const data = await fetchTags();
      setTags(extractTags(data));
    } catch {
      toast.error('Failed to load interests');
    }
  };

  const onCountryChange = useCallback(async (countryId: string) => {
    setSelectedCountryId(countryId);
    updateCity(''); // Reset city selection
    setCities([]);

    if (countryId) {
      try {
        setLoadingCities(true);
        const data = await fetchCitiesByCountry(countryId);
        setCities(extractCities(data));
      } catch {
        toast.error('Failed to load cities');
      } finally {
        setLoadingCities(false);
      }
    }
  }, [updateCity]);

  useEffect(() => {
    const cityParam = searchParams.get('cityId')?.trim() ?? '';
    if (!cityParam) {
      appliedCityFromUrlRef.current = null;
      return;
    }
    if (countries.length === 0) {
      return;
    }
    if (appliedCityFromUrlRef.current === cityParam) {
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const city = await fetchCityById(cityParam);
        if (cancelled || !city) {
          return;
        }
        const countryId = city.countryId ?? city.country?.id;
        if (!countryId) {
          return;
        }
        setSelectedCountryId(countryId);
        setLoadingCities(true);
        try {
          const data = await fetchCitiesByCountry(countryId);
          if (cancelled) {
            return;
          }
          setCities(extractCities(data));
        } catch {
          if (!cancelled) {
            toast.error('Failed to load cities');
          }
        } finally {
          if (!cancelled) {
            setLoadingCities(false);
          }
        }
        if (cancelled) {
          return;
        }
        updateCity(cityParam);
        appliedCityFromUrlRef.current = cityParam;
      } catch {
        // ignore invalid city id
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, countries.length, updateCity]);

  const formatCityLabel = useCallback((cityId: string) => {
    const city = cityLookup.get(cityId);
    if (!city) return cityId;
    return city.stateName ? `${city.name} (${city.stateName})` : city.name;
  }, [cityLookup]);

  const onSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void resultsHook.submitTrip(formData);
  }, [formData, resultsHook]);

  // Combine all return values
  return {
    // Form state
    formData,
    errors,
    isValid,
    budgetTooLow,
    minimumBudget,

    // Location data
    countries,
    cities,
    tags,
    selectedCountryId,
    loadingCountries,
    loadingCities,

    // Results state
    tripPlan: resultsHook.tripPlan,
    generating: resultsHook.generating,
    resultsRef: resultsHook.resultsRef,

    // Sharing state
    publishing: sharingHook.publishing,
    hasShareLink: sharingHook.hasShareLink,
    publicShareUrl: sharingHook.publicShareUrl,

    // Saved plans state
    savedPlans: savedPlansHook.savedPlans,
    loadingPlans: savedPlansHook.loadingPlans,
    planToDelete: savedPlansHook.planToDelete,

    // Auth state
    isAuthenticated,

    // Formatters
    formatCityLabel,
    formatDate,

    // Form handlers
    updateCity,
    updateDays,
    updateBudget,
    updatePersons,
    toggleInterest,
    onCountryChange,
    onSubmit,

    // Results handlers
    clearPlan: resultsHook.clearPlan,
    publishPlan: sharingHook.publishPlan,
    copyShareLink: sharingHook.copyShareLink,
    addToWishlist: resultsHook.addToWishlist,
    viewPlace: resultsHook.viewPlace,

    // Saved plans handlers
    loadPlan: resultsHook.loadSavedPlan,
    removePlan: savedPlansHook.removePlan,
    confirmDeletePlan: savedPlansHook.confirmDeletePlan,
    cancelDeletePlan: savedPlansHook.cancelDeletePlan,
  };
};
