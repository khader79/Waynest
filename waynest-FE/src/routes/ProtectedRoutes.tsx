import { Navigate, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface Props {
  roleRequired?: "ADMIN" | "USER" | "PROVIDER";
}

export const ProtectedRoute = ({ roleRequired }: Props) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "var(--color-bg)",
          color: "var(--color-text-secondary)",
          fontSize: "15px",
          fontFamily: "var(--font-sans, sans-serif)",
        }}>
        Loading…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roleRequired && user?.role !== roleRequired) {
    const redirectPath =
      user?.role === "ADMIN"
        ? "/admin-panel"
        : user?.role === "PROVIDER"
          ? "/provider-panel"
          : "/user-panel";

    return <Navigate to={redirectPath} replace />;
  }

  return <Outlet />;
};
