import { get, patch } from "@/services/http/apiService";
import { ADMIN_ENDPOINTS, PROVIDER_ENDPOINTS } from "@/services/http/endpoints";

export const fetchProviderProfile = async () => get(PROVIDER_ENDPOINTS.MY_PROFILE);
export const updateMyProviderProfile = async (payload: Record<string, unknown>) =>
  patch(PROVIDER_ENDPOINTS.MY_PROFILE_UPDATE, payload);

export const fetchProviderStats = async () => get(PROVIDER_ENDPOINTS.MY_STATS);

export const fetchProviders = async () => get(ADMIN_ENDPOINTS.PROVIDERS_LIST);

export const updateProvider = async (
  providerId: string,
  payload: Record<string, unknown>,
) => patch(ADMIN_ENDPOINTS.PROVIDERS_UPDATE(providerId), payload);

export const fetchProviderPlaces = async () => get(PROVIDER_ENDPOINTS.MY_PLACES);

export const fetchProviderEvents = async () => get(PROVIDER_ENDPOINTS.MY_EVENTS);
