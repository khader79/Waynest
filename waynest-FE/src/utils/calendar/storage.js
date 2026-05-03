import { STORAGE_KEYS } from "@/utils/storageKeys";

const CALENDAR_STORAGE_KEY = STORAGE_KEYS.calendarEntries;

const isRecord = (value) => value !== null && typeof value === "object";

const createEntryId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `calendar_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const normalizeDate = (value) => {
  const parsed = new Date(value ?? "");
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

export const normalizeCalendarEntry = (value) => {
  if (!isRecord(value)) {
    return null;
  }

  const date = normalizeDate(value.date);
  const title = normalizeText(value.title || value.placeName || value.eventName);

  if (!date || !title) {
    return null;
  }

  const id = normalizeText(value.id) || createEntryId();

  return {
    id,
    title,
    date,
    time: normalizeText(value.time),
    endTime: normalizeText(value.endTime),
    notes: normalizeText(value.notes),
    placeId: normalizeText(value.placeId),
    placeName: normalizeText(value.placeName),
    eventId: normalizeText(value.eventId),
    cityName: normalizeText(value.cityName),
    sourceType: normalizeText(value.sourceType) || "manual",
    sourceLabel: normalizeText(value.sourceLabel),
    createdAt: normalizeDate(value.createdAt) || new Date().toISOString(),
  };
};

export const loadCalendarEntries = () => {
  try {
    const stored = localStorage.getItem(CALENDAR_STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map(normalizeCalendarEntry).filter(Boolean);
  } catch {
    return [];
  }
};

export const saveCalendarEntries = (entries) => {
  try {
    const next = Array.isArray(entries)
      ? entries.map(normalizeCalendarEntry).filter(Boolean)
      : [];
    localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch {
    return [];
  }
};

export const upsertCalendarEntry = (entry) => {
  const normalized = normalizeCalendarEntry(entry);
  if (!normalized) {
    return loadCalendarEntries();
  }

  const current = loadCalendarEntries();
  const next = [
    normalized,
    ...current.filter((item) => item.id !== normalized.id),
  ];
  saveCalendarEntries(next);
  return next;
};

export const removeCalendarEntry = (entryId) => {
  const id = normalizeText(entryId);
  if (!id) {
    return loadCalendarEntries();
  }

  const next = loadCalendarEntries().filter((entry) => entry.id !== id);
  saveCalendarEntries(next);
  return next;
};