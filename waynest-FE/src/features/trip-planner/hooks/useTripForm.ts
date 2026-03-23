/**
 * useTripForm Hook
 * Handles form state, validation, and persistence
 */

import { useState, useCallback, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import { toast } from 'react-toastify';
import type { CreateTripPlannerDto, TripPlannerCity, TripPlannerTag } from '../types';
import { validateTripForm, sanitizeTripData, isBudgetTooLow } from '../validation/tripValidation';
import { saveTripForm, loadTripForm } from '../utils/storage';

const DEFAULT_FORM_DATA: CreateTripPlannerDto = {
  budget: 1000,
  cityId: '',
  days: 3,
  interests: [],
  persons: 2,
};

export interface UseTripFormReturn {
  formData: CreateTripPlannerDto;
  errors: Record<string, string>;
  isValid: boolean;
  budgetTooLow: boolean;
  minimumBudget: number;
  updateCity: (value: string) => void;
  updateDays: (event: ChangeEvent<HTMLInputElement>) => void;
  updateBudget: (event: ChangeEvent<HTMLInputElement>) => void;
  updatePersons: (event: ChangeEvent<HTMLInputElement>) => void;
  toggleInterest: (tagName: string) => void;
  resetForm: () => void;
  setFormData: (data: Partial<CreateTripPlannerDto>) => void;
}

export const useTripForm = (): UseTripFormReturn => {
  const [formData, setFormDataState] = useState<CreateTripPlannerDto>(DEFAULT_FORM_DATA);

  // Load saved form data on mount
  useEffect(() => {
    const savedForm = loadTripForm();
    if (savedForm) {
      setFormDataState((current) => ({
        ...current,
        ...savedForm,
        interests: savedForm.interests ?? current.interests ?? [],
      }));
    }
  }, []);

  // Persist form data on change
  useEffect(() => {
    saveTripForm(formData);
  }, [formData]);

  // Validation
  const { errors, isValid } = validateTripForm(formData);
  const minimumBudget = formData.persons * formData.days * 100;
  const budgetTooLow = isBudgetTooLow(formData.budget, formData.persons, formData.days);

  // Handlers
  const updateCity = useCallback((value: string) => {
    setFormDataState((current) => ({ ...current, cityId: value }));
  }, []);

  const updateDays = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(1, Math.min(14, Number(event.target.value || 1)));
    setFormDataState((current) => ({ ...current, days: value }));
  }, []);

  const updateBudget = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(0, Number(event.target.value || 0));
    setFormDataState((current) => ({ ...current, budget: value }));
  }, []);

  const updatePersons = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(1, Math.min(20, Number(event.target.value || 1)));
    setFormDataState((current) => ({ ...current, persons: value }));
  }, []);

  const toggleInterest = useCallback((tagName: string) => {
    setFormDataState((current) => {
      const interests = current.interests ?? [];
      return {
        ...current,
        interests: interests.includes(tagName)
          ? interests.filter((i) => i !== tagName)
          : [...interests, tagName],
      };
    });
  }, []);

  const resetForm = useCallback(() => {
    setFormDataState(DEFAULT_FORM_DATA);
    toast.info('Form reset');
  }, []);

  const setFormData = useCallback((data: Partial<CreateTripPlannerDto>) => {
    setFormDataState((current) => ({
      ...current,
      ...sanitizeTripData(data as CreateTripPlannerDto),
    }));
  }, []);

  return {
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
    resetForm,
    setFormData,
  };
};
