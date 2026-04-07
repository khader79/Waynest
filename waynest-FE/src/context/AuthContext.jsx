/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { fetchAuthenticatedUser, logoutCurrentUser } from "@/api/auth";

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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
