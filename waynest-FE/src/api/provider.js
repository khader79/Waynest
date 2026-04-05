import { get, patch, postJson } from "@/api/request";
import { ROUTES } from "@/api/routes";

export const fetchProviderProfile = async () => get(ROUTES.providers.myProfile);

export const updateMyProviderProfile = async (payload) =>
  patch(ROUTES.providers.myProfile, payload);

export const fetchProviderStats = async () => get(ROUTES.providers.myStats);
export const fetchProviders = async () => get(ROUTES.admin.providersList);

export const updateProvider = async (providerId, payload) =>
  patch(ROUTES.admin.providersUpdate(providerId), payload);

export const fetchProviderPlaces = async () => get(ROUTES.providers.myPlaces);

export const createProviderPlace = async (payload) =>
  postJson(ROUTES.providers.myPlaces, payload);

export const updateProviderPlace = async (placeId, payload) =>
  patch(ROUTES.providers.myPlace(placeId), payload);

export const fetchProviderEvents = async () => get(ROUTES.providers.myEvents);

export const createProviderEvent = async (payload) =>
  postJson(ROUTES.providers.myEvents, payload);

export const updateProviderEvent = async (eventId, payload) =>
  patch(ROUTES.providers.myEvent(eventId), payload);

export const fetchProviderBookings = async () => get(ROUTES.bookings.providerMine);

export const updateBookingStatus = async (bookingId, payload) =>
  patch(ROUTES.bookings.status(bookingId), payload);
