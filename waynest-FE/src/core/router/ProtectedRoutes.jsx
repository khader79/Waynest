import { Navigate, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "@/core/providers/AuthContext";
import { getDefaultDashboardPath } from "@/core/utils/routing";
import { RouteLoadingState } from "@/ui/feedback/RouteLoadingState";





export const ProtectedRoute = ({ roleRequired }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <RouteLoadingState />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roleRequired && user?.role !== roleRequired) {
    return <Navigate to={getDefaultDashboardPath(user?.role)} replace />;
  }

  return <Outlet />;
};