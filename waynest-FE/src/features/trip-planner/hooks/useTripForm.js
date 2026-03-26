/**
 * useTripForm Hook
 * Handles form state, validation, and persistence
 */

import { useState, useCallback, useEffect } from 'react';

import { toast } from 'react-toastify';

import { validateTripForm, sanitizeTripData, isBudgetTooLow } from '../validation/tripValidation';
import { saveTripForm, loadTripForm } from '../utils/storage';

const DEFAULT_FORM_DATA = {
  budget: 1000,
  cityId: '',
  days: 3,
  interests: [],
  persons: 2
};
















export const useTripForm = () => {
  const [formData, setFormDataState] = useState(DEFAULT_FORM_DATA);

  // Load saved form data on mount
  useEffect(() => {
    const savedForm = loadTripForm();
    if (savedForm) {
      setFormDataState((current) => ({
        ...current,
        ...savedForm,
        interests: savedForm.interests ?? current.interests ?? []
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
  const updateCity = useCallback((value) => {
    setFormDataState((current) => ({ ...current, cityId: value }));
  }, []);

  const updateDays = useCallback((event) => {
    const value = Math.max(1, Math.min(14, Number(event.target.value || 1)));
    setFormDataState((current) => ({ ...current, days: value }));
  }, []);

  const updateBudget = useCallback((event) => {
    const value = Math.max(0, Number(event.target.value || 0));
    setFormDataState((current) => ({ ...current, budget: value }));
  }, []);

  const updatePersons = useCallback((event) => {
    const value = Math.max(1, Math.min(20, Number(event.target.value || 1)));
    setFormDataState((current) => ({ ...current, persons: value }));
  }, []);

  const toggleInterest = useCallback((tagName) => {
    setFormDataState((current) => {
      const interests = current.interests ?? [];
      return {
        ...current,
        interests: interests.includes(tagName) ?
        interests.filter((i) => i !== tagName) :
        [...interests, tagName]
      };
    });
  }, []);

  const resetForm = useCallback(() => {
    setFormDataState(DEFAULT_FORM_DATA);
    toast.info('Form reset');
  }, []);

  const setFormData = useCallback((data) => {
    setFormDataState((current) => ({
      ...current,
      ...sanitizeTripData(data)
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
    setFormData
  };
};