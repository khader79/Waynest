import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface Props {
  children: any;
  roleRequired?: "ADMIN" | "USER";
}

export const ProtectedRoute = ({ children, roleRequired }: Props) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div>Loading...</div>;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roleRequired && user?.role !== roleRequired) {
    const redirectPath =
      user?.role === "ADMIN" ? "/admin-panel" : "/user-panel";

    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};
