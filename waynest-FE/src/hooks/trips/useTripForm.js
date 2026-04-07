/**
 * useTripForm Hook
 * Handles form state, validation, and persistence
 */

import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-toastify";

import {
  validateTripForm,
  sanitizeTripData,
  isBudgetTooLow,
} from "@/utils/trips/validation/tripValidation";
import { saveTripForm, loadTripForm } from "@/utils/trips/storage";
import {
  setFormDraft,
  getFormDraft,
  clearFormDraft,
} from "@/utils/trips/inMemoryDraft";

const DEFAULT_FORM_DATA = {
  budget: 1000,
  cityId: "",
  days: 3,
  interests: [],
  persons: 2,
};

export const useTripForm = () => {
  const { isAuthenticated } = useAuth();
  const [formData, setFormDataState] = useState(DEFAULT_FORM_DATA);

  // Load saved form data on mount (localStorage for authenticated users,
  // in-memory draft for guests)
  useEffect(() => {
    const savedForm = isAuthenticated ? loadTripForm() : getFormDraft();
    if (savedForm) {
      setFormDataState((current) => ({
        ...current,
        ...savedForm,
        interests: savedForm.interests ?? current.interests ?? [],
      }));
      if (!isAuthenticated) {
        clearFormDraft();
      }
    }
  }, [isAuthenticated]);

  // Persist form data on change: authenticated => localStorage, guest => in-memory
  useEffect(() => {
    if (isAuthenticated) {
      saveTripForm(formData);
    } else {
      setFormDraft(formData);
    }
  }, [formData, isAuthenticated]);

  // Validation
  const { errors, isValid } = validateTripForm(formData);
  const minimumBudget = formData.persons * formData.days * 100;
  const budgetTooLow = isBudgetTooLow(
    formData.budget,
    formData.persons,
    formData.days,
  );

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
        interests: interests.includes(tagName)
          ? interests.filter((i) => i !== tagName)
          : [...interests, tagName],
      };
    });
  }, []);

  const resetForm = useCallback(() => {
    setFormDataState(DEFAULT_FORM_DATA);
    toast.info("Form reset");
  }, []);

  const setFormData = useCallback((data) => {
    setFormDataState((current) => ({
      ...current,
      ...sanitizeTripData(data),
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
