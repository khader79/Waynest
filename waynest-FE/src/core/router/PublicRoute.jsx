
import { Navigate } from "react-router-dom";
import { useAuth } from "@/core/providers/AuthContext";
import { getDefaultDashboardPath } from "@/core/utils/routing";
import { RouteLoadingState } from "@/ui/feedback/RouteLoadingState";

export const PublicRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <RouteLoadingState />;
  }

  if (isAuthenticated) {
    return <Navigate to={getDefaultDashboardPath(user?.role)} replace />;
  }

  return children;
};