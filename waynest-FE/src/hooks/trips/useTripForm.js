/**
 * useTripForm Hook
 * Handles form state, validation, and persistence
 */

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";
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

const getDefaultStartDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
};

const DEFAULT_FORM_DATA = {
  budget: 1000,
  cityId: "",
  days: 3,
  interests: [],
  persons: 2,
  currencyCode: "ILS",
  startDate: getDefaultStartDate(),
};

export const useTripForm = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const [formData, setFormDataState] = useState(DEFAULT_FORM_DATA);

  // Load saved form data on mount (localStorage for authenticated users,
  // in-memory draft for guests) and override with query parameters if present
  useEffect(() => {
    const savedForm = isAuthenticated ? loadTripForm() : getFormDraft();
    const initialData = savedForm
      ? { ...DEFAULT_FORM_DATA, ...sanitizeTripData(savedForm) }
      : { ...DEFAULT_FORM_DATA };

    // Override with query parameters if they exist
    const daysParam = searchParams.get("days");
    const budgetParam = searchParams.get("budget");
    const personsParam = searchParams.get("persons");
    const currencyParam =
      searchParams.get("currency") || searchParams.get("currencyCode");
    const interestsParam = searchParams.get("interests");

    if (daysParam) {
      const daysVal = Math.max(1, Math.min(14, Number(daysParam)));
      if (Number.isFinite(daysVal)) {
        initialData.days = daysVal;
      }
    }
    if (budgetParam) {
      const budgetVal = Math.max(0, Number(budgetParam));
      if (Number.isFinite(budgetVal)) {
        initialData.budget = budgetVal;
      }
    }
    if (personsParam) {
      const personsVal = Math.max(1, Math.min(20, Number(personsParam)));
      if (Number.isFinite(personsVal)) {
        initialData.persons = personsVal;
      }
    }
    if (currencyParam) {
      initialData.currencyCode = currencyParam.trim().toUpperCase();
    }
    if (interestsParam) {
      initialData.interests = interestsParam
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    }

    setFormDataState(initialData);

    if (!isAuthenticated && savedForm) {
      clearFormDraft();
    }
  }, [isAuthenticated, searchParams]);

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

  const updateCurrency = useCallback((value) => {
    const next =
      typeof value === "string" ? value : String(value?.target?.value ?? "ILS");
    setFormDataState((current) => ({ ...current, currencyCode: next }));
  }, []);

  const updateStartDate = useCallback((event) => {
    const value =
      typeof event === "string"
        ? event
        : String(event?.target?.value ?? "").trim();
    setFormDataState((current) => ({ ...current, startDate: value }));
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
    toast.info(t("tripPlanner.form.clearForm"));
  }, [t]);

  const setFormData = useCallback((data) => {
    setFormDataState((current) => ({
      ...current,
      ...sanitizeTripData(data, { partial: true }),
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
    updateCurrency,
    updateStartDate,
    toggleInterest,
    resetForm,
    setFormData,
  };
};
