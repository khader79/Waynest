import { del, get, patch, postJson } from "@/api/request";
import { ROUTES } from "@/api/routes";

export const fetchMyBookings = async () => get(ROUTES.bookings.mine);

export const cancelBooking = async (bookingId) =>
  patch(ROUTES.bookings.cancel(bookingId), {});

export const fetchUserProfile = async (userId) => get(ROUTES.users.profile(userId));
export const fetchMyProfile = async () => get(ROUTES.users.me);
export const fetchMySummary = async () => get(ROUTES.users.summary);
export const updateUserProfile = async (_userId, data) => patch(ROUTES.users.updateMe, data);

export const fetchAllowedDevices = async () => get(ROUTES.users.allowedDevices);
export const addAllowedDevice = async (fingerprint) =>
  postJson(ROUTES.users.allowedDevices, { fingerprint });
export const removeAllowedDevice = async (fingerprint) =>
  del(ROUTES.users.removeDevice(fingerprint));
export const fetchAllReviews = async () => get(ROUTES.admin.reviewsList);

export const fetchWishlist = async () => get(ROUTES.wishlist.list);

export const addWishlistItem = async (placeId) =>
  postJson(ROUTES.wishlist.add, { placeId });

export const removeWishlistItem = async (placeId) =>
  del(ROUTES.wishlist.remove(placeId));
