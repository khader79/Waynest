import { useCallback, useState } from "react";
import { API_ROUTES } from "../../config/api";
import axios from "../../config/axios";

type DeliveryStatus = "pending" | "sent" | "delivered" | "seen";

interface MessageStatusState {
  status: DeliveryStatus;
  isUpdating: boolean;
  error: string | null;
}

/**
 * Hook for tracking and updating message delivery status
 * Manages the state of individual messages and provides methods to update delivery status
 */
export const useMessageStatus = (initialStatus: DeliveryStatus = "pending") => {
  const [state, setState] = useState<MessageStatusState>({
    status: initialStatus,
    isUpdating: false,
    error: null,
  });

  const updateStatus = useCallback(
    async (messageId: string, newStatus: DeliveryStatus) => {
      setState((prev) => ({ ...prev, isUpdating: true, error: null }));
      try {
        const response = await axios.patch(
          `${API_ROUTES.MESSAGING.BASE}messages/${messageId}/delivery-status`,
          { deliveryStatus: newStatus },
        );
        setState((prev) => ({
          ...prev,
          status: newStatus,
          isUpdating: false,
        }));
        return response.data;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to update message status";
        setState((prev) => ({
          ...prev,
          isUpdating: false,
          error: errorMessage,
        }));
        throw err;
      }
    },
    [],
  );

  const setStatus = useCallback((newStatus: DeliveryStatus) => {
    setState((prev) => ({ ...prev, status: newStatus, error: null }));
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    updateStatus,
    setStatus,
    clearError,
  };
};
