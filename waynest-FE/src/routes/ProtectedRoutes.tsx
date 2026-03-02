import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface Props {
  children: any;
  roleRequired?: "ADMIN" | "USER" | "PROVIDER";
}

export const ProtectedRoute = ({ children, roleRequired }: Props) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div>Loading...</div>;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roleRequired && user?.role !== roleRequired) {
    if (user?.role === "ADMIN") {
      return <Navigate to="/admin-panel" replace />;
    }
    if (user?.role === "USER") {
      return <Navigate to="/user-panel" replace />;
    }
    if (user?.role === "PROVIDER") {
      return <Navigate to="" replace />;
    }
  }

  return <>{children}</>;
};
