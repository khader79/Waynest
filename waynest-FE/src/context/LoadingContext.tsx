import React, { createContext, useContext, useCallback, useState } from "react";

interface LoadingContextType {
  loadingStates: Record<string, boolean>;
  startLoading: (key: string) => void;
  stopLoading: (key: string) => void;
  isLoading: (key?: string) => boolean;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

/**
 * Provider for global loading state management
 * Tracks loading states for different operations across the app
 */
export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>(
    {},
  );

  const startLoading = useCallback((key: string) => {
    setLoadingStates((prev) => ({ ...prev, [key]: true }));
  }, []);

  const stopLoading = useCallback((key: string) => {
    setLoadingStates((prev) => ({ ...prev, [key]: false }));
  }, []);

  const isLoading = useCallback(
    (key?: string) => {
      if (!key) return Object.values(loadingStates).some(Boolean);
      return loadingStates[key] ?? false;
    },
    [loadingStates],
  );

  return (
    <LoadingContext.Provider
      value={{ loadingStates, startLoading, stopLoading, isLoading }}>
      {children}
    </LoadingContext.Provider>
  );
};

/**
 * Hook to access global loading context
 */
export const useGlobalLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error("useGlobalLoading must be used within LoadingProvider");
  }
  return context;
};
