import { get, patch } from "@/services/http/apiService";
import { BOOKINGS_ENDPOINTS } from "@/services/http/endpoints";

export const fetchMyBookings = async () => get(BOOKINGS_ENDPOINTS.MY_BOOKINGS);

export const cancelBooking = async (bookingId: string) =>
  patch(BOOKINGS_ENDPOINTS.CANCEL(bookingId), {});
