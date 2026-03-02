import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const GuestGuard = () => {
  const { user } = useAuth();

  if (user) {
    return <Navigate to="/user-panel" replace />;
  }

  return <Outlet />;
};
