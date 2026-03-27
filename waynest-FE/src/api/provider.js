import { get, patch } from "@/api/request";
import { ROUTES } from "@/api/routes";

export const fetchProviderProfile = async () => get(ROUTES.providers.myProfile);

export const updateMyProviderProfile = async (payload) =>
  patch(ROUTES.providers.myProfile, payload);

export const fetchProviderStats = async () => get(ROUTES.providers.myStats);
export const fetchProviders = async () => get(ROUTES.admin.providersList);

export const updateProvider = async (providerId, payload) =>
  patch(ROUTES.admin.providersUpdate(providerId), payload);

export const fetchProviderPlaces = async () => get(ROUTES.providers.myPlaces);
export const fetchProviderEvents = async () => get(ROUTES.providers.myEvents);
