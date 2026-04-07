import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchProviderBookings, updateBookingStatus } from "@/api/provider";

const extractRows = (payload) => {
  const list = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray(payload.data)
      ? payload.data
      : [];
  return list.filter(Boolean);
};

export const useProviderBookingsData = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [pendingId, setPendingId] = useState(null);

  const query = useQuery({
    queryKey: ["provider", "bookings"],
    queryFn: async () => {
      const raw = await fetchProviderBookings();
      return extractRows(raw);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => updateBookingStatus(id, { status }),
    onMutate: ({ id }) => {
      setPendingId(id);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["provider", "bookings"] });
    },
    onError: () => {
      message.error(
        t("provider.bookings.feedback.statusError", {
          defaultValue: "Could not update booking status",
        }),
      );
    },
    onSettled: () => {
      setPendingId(null);
    },
  });

  return {
    bookings: query.data ?? [],
    loading: query.isLoading,
    refetch: query.refetch,
    updateStatus: statusMutation.mutateAsync,
    pendingId,
  };
};
