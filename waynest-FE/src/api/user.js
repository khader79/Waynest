import { del, get, patch, postJson } from "@/api/request";
import { ROUTES } from "@/api/routes";

export const fetchMyBookings = async () => get(ROUTES.bookings.mine);

export const cancelBooking = async (bookingId) =>
  patch(ROUTES.bookings.cancel(bookingId), {});

export const fetchUserProfile = async (userId) => get(ROUTES.users.profile(userId));
export const fetchAllReviews = async () => get(ROUTES.admin.reviewsList);

export const fetchWishlist = async () => get(ROUTES.wishlist.list);

export const addWishlistItem = async (placeId) =>
  postJson(ROUTES.wishlist.add, { placeId });

export const removeWishlistItem = async (placeId) =>
  del(ROUTES.wishlist.remove(placeId));
