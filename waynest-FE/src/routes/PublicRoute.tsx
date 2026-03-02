import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const PublicRoute = ({ children }: { children: any }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (isAuthenticated) {
    if (user?.role === "ADMIN") return <Navigate to="/admin-panel" replace />;
    if (user?.role === "PROVIDER")
      return <Navigate to="/provider-dashboard" replace />;
    return <Navigate to="/user-panel" replace />;
  }

  return children;
};
