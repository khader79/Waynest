import { createContext, useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { get, postNoBody } from "../api/apiService";
import { AUTH_ENDPOINTS } from "../api/endpoints";

interface User {
  userId: string;
  email: string;
  role: "ADMIN" | "USER" | "PROVIDER";
  exp: number;
  username: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext(undefined as unknown as AuthContextType | undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const refreshUser = async () => {
    try {
      const res = await get(AUTH_ENDPOINTS.getPayload);
      const typedUser = res as User;
      setUser(typedUser);
      return typedUser;
    } catch {
      setUser(null);
      return null;
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      await refreshUser();
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async () => {
    setLoading(true);

    try {
      const currentUser = await refreshUser();
      if (!currentUser) return;

      switch (currentUser.role) {
        case "ADMIN":
          navigate("/admin-panel");
          break;
        case "PROVIDER":
          navigate("/provider-panel");
          break;
        default:
          navigate("/user-panel");
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await postNoBody(AUTH_ENDPOINTS.LOGOUT);
    } finally {
      setUser(null);
      navigate("/login");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        refreshUser,
        isAuthenticated: !!user,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext) as AuthContextType | undefined;

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
};
