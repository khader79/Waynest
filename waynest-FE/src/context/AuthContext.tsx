import { createContext, useState, useContext, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router";
import { get, postNoBody } from "../api/apiService";
import { AUTH_ENDPOINTS } from "../api/endpoints";

interface User {
  sub: string;
  email: string;
  role: "ADMIN" | "USER" | "PROVIDER";
  exp: number;
  username: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: any) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const authCheck = async () => {
    try {
      const res = await get("/auth/me");
      setUser(res);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    authCheck();
  }, []);

  const login = async () => {
    setLoading(true);
    try {
      const res = await get("/auth/me");
      setUser(res);
      if (res.role === "ADMIN") navigate("/admin-panel");
      else if (res.role === "PROVIDER") navigate("/provider-panel");
      else navigate("/user-panel");
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    void (async () => {
      try {
        await postNoBody(AUTH_ENDPOINTS.LOGOUT);
      } catch (err) {
      } finally {
        localStorage.removeItem("access_token");
        setUser(null);
        navigate("/login");
      }
    })();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        loading,
        isAuthenticated: !!user,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
};
