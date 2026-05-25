 
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { fetchAuthenticatedUser, logoutCurrentUser } from "@/api/auth";
import i18n from "@/i18n";

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  // Initialize dev user synchronously to avoid route-guard redirects during UI QA.
  const initialDevUser = (() => {
    try {
      if (process.env.NODE_ENV !== "production") {
        const raw = localStorage.getItem("DEV_AUTH_USER");
        if (raw) return JSON.parse(raw);
      }
    } catch {
      /* ignore malformed JSON */
    }
    return null;
  })();

  const [user, setUser] = useState(initialDevUser);
  const [loading, setLoading] = useState(initialDevUser ? false : true);

  const refreshUser = useCallback(async () => {
    try {
      const authenticatedUser = await fetchAuthenticatedUser();
      setUser(authenticatedUser);
      return authenticatedUser;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      // Dev-only: allow a localStorage-based dev user to short-circuit auth
      // Useful for UI QA when backend is unavailable. Guarded by NODE_ENV.
      if (process.env.NODE_ENV !== "production") {
        try {
          const devUserRaw = localStorage.getItem("DEV_AUTH_USER");
          if (devUserRaw) {
            const devUser = JSON.parse(devUserRaw);
            if (devUser) {
              setUser(devUser);
              setLoading(false);
              return;
            }
          }
        } catch {
          // ignore malformed JSON
        }
      }
      const authenticatedUser = await refreshUser();

      if (!isMounted) {
        return;
      }

      setUser(authenticatedUser);
      setLoading(false);
    };

    void initAuth();

    return () => {
      isMounted = false;
    };
  }, [refreshUser]);

  useEffect(() => {
    const handleLogout = () => {
      setUser(null);
      setLoading(false);
    };

    window.addEventListener("auth:logout", handleLogout);

    return () => {
      window.removeEventListener("auth:logout", handleLogout);
    };
  }, []);

  const login = useCallback(
    async (nextUser = null) => {
      if (nextUser) {
        setUser(nextUser);
        setLoading(false);
        return nextUser;
      }

      setLoading(true);

      try {
        const authenticatedUser = await refreshUser();
        setUser(authenticatedUser);

        // Re-sync language from localStorage when auth state changes
        try {
          const storedLang = localStorage.getItem("i18nextLng");
          if (storedLang) {
            const normalized = storedLang.trim().toLowerCase().split(/[-_]/)[0];
            if (normalized && normalized !== i18n.language) {
              i18n.changeLanguage(normalized);
            }
          }
        } catch {
          /* ignore */
        }

        return authenticatedUser;
      } catch {
        setUser(null);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [refreshUser],
  );

  const logout = useCallback(async () => {
    try {
      await logoutCurrentUser();
    } finally {
      setUser(null);
      setLoading(false);
      window.location.href = "/login";
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      refreshUser,
      isAuthenticated: Boolean(user),
    }),
    [loading, login, logout, refreshUser, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
};
