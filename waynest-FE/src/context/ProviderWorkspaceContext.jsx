import { createContext, useContext, useEffect, useState } from "react";
import { fetchProviderProfile } from "@/api/provider";

const ProviderWorkspaceContext = createContext({
  slug: null,
  displayName: null,
  loading: true,
});

export const useProviderWorkspace = () => useContext(ProviderWorkspaceContext);

export const ProviderWorkspaceProvider = ({ children }) => {
  const [value, setValue] = useState({
    slug: null,
    displayName: null,
    loading: true,
  });

  useEffect(() => {
    let active = true;
    void fetchProviderProfile()
      .then((payload) => {
        if (!active) {
          return;
        }
        const slug =
          payload &&
          typeof payload === "object" &&
          typeof payload.slug === "string" &&
          payload.slug.trim()
            ? payload.slug.trim()
            : null;
        const displayName =
          payload &&
          typeof payload === "object" &&
          typeof payload.displayName === "string" &&
          payload.displayName.trim()
            ? payload.displayName.trim()
            : null;
        setValue({ slug, displayName, loading: false });
      })
      .catch(() => {
        if (active) {
          setValue((prev) => ({ ...prev, loading: false }));
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <ProviderWorkspaceContext.Provider value={value}>{children}</ProviderWorkspaceContext.Provider>
  );
};
