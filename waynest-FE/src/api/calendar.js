import { del, get, patch, postJson } from "@/api/request";
import { ROUTES } from "@/api/routes";

export const fetchCalendarEntries = async () => get(ROUTES.calendar.list);

export const createCalendarEntry = async (payload) =>
  postJson(ROUTES.calendar.create, payload);

export const updateCalendarEntry = async (entryId, payload) =>
  patch(ROUTES.calendar.update(entryId), payload);

export const deleteCalendarEntry = async (entryId) =>
  del(ROUTES.calendar.remove(entryId));