import { useState, useCallback } from "react";

/**
 * Global loading state hook for API operations
 * Tracks loading, error, and success states for async operations
 */
export const useLoading = () => {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>(
    {},
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const startLoading = useCallback((key: string) => {
    setLoadingStates((prev) => ({ ...prev, [key]: true }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  }, []);

  const stopLoading = useCallback((key: string) => {
    setLoadingStates((prev) => ({ ...prev, [key]: false }));
  }, []);

  const setError = useCallback((key: string, error: string) => {
    setErrors((prev) => ({ ...prev, [key]: error }));
    setLoadingStates((prev) => ({ ...prev, [key]: false }));
  }, []);

  const clearError = useCallback((key: string) => {
    setErrors((prev) => ({ ...prev, [key]: "" }));
  }, []);

  const isLoading = useCallback(
    (key?: string) => {
      if (!key) return Object.values(loadingStates).some(Boolean);
      return loadingStates[key] ?? false;
    },
    [loadingStates],
  );

  const getError = useCallback((key: string) => errors[key] ?? "", [errors]);

  const executeAsync = useCallback(
    async <T>(
      key: string,
      asyncFn: () => Promise<T>,
    ): Promise<{ success: boolean; data?: T; error?: string }> => {
      startLoading(key);
      try {
        const data = await asyncFn();
        stopLoading(key);
        return { success: true, data };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An error occurred";
        setError(key, errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [startLoading, stopLoading, setError],
  );

  return {
    loadingStates,
    errors,
    isLoading,
    getError,
    startLoading,
    stopLoading,
    setError,
    clearError,
    executeAsync,
  };
};
