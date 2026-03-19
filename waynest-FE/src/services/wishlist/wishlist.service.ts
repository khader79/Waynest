import { del, get, postJson } from "@/services/http/apiService";
import { WISHLIST_ENDPOINTS } from "@/services/http/endpoints";

export const fetchWishlist = async () => get(WISHLIST_ENDPOINTS.LIST);

export const addWishlistItem = async (placeId: string) =>
  postJson(WISHLIST_ENDPOINTS.ADD, { placeId });

export const removeWishlistItem = async (placeId: string) =>
  del(WISHLIST_ENDPOINTS.REMOVE(placeId));
