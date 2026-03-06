import { ADMIN_ENDPOINTS } from "./endpoints";
import { get, postJson, patch, del } from "./apiService";

export type ResourceKey =
  | "users"
  | "providers"
  | "places"
  | "cities"
  | "countries"
  | "currencies"
  | "tags"
  | "events"
  | "reviews"
  | "placePricing"
  | "placeOpeningHours"
  | "providerMembership";

export const adminService = {
  fetchList: async (resourceKey: ResourceKey, params?: any) => {
    const endpoint = ADMIN_ENDPOINTS[resourceKey].list;
    return await get(endpoint);
  },

  createItem: async (resourceKey: ResourceKey, payload: any) => {
    const endpoint = ADMIN_ENDPOINTS[resourceKey].create;
    return await postJson(endpoint, payload);
  },

  updateItem: async (resourceKey: ResourceKey, id: string, payload: any) => {
    const endpoint = ADMIN_ENDPOINTS[resourceKey].update(id);
    return await patch(endpoint, payload);
  },

  deleteItem: async (resourceKey: ResourceKey, id: string) => {
    const endpoint = ADMIN_ENDPOINTS[resourceKey].delete(id);
    return await del(endpoint);
  },

  getItem: async (resourceKey: ResourceKey, id: string) => {
    const endpoint = ADMIN_ENDPOINTS[resourceKey].get(id);
    return await get(endpoint);
  },
};
