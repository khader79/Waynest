import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/core/providers/AuthContext";
import { RouteLoadingState } from "@/ui/feedback/RouteLoadingState";
import "./PublicLayout.css";
import { NavbarPublic } from "./components/navbar/NavbarPublic";
import MainLayout from "./layout/facebook/Layout/MainLayout";

export type PublicLayoutVariant = "guest-discovery" | "signed-in-social" | "auth";

const authPaths = new Set(["/login", "/register", "/verify-email", "/invite"]);

const signedInSocialPrefixes = ["/social", "/community", "/u/", "/inbox", "/notifications"];

const getLayoutVariant = (
  pathname: string,
  isAuthenticated: boolean,
): PublicLayoutVariant => {
  if (authPaths.has(pathname)) {
    return "auth";
  }

  if (
    isAuthenticated &&
    (pathname === "/" ||
      signedInSocialPrefixes.some((prefix) => pathname.startsWith(prefix)))
  ) {
    return "signed-in-social";
  }

  return "guest-discovery";
};

const PublicLayout = () => {
  const location = useLocation();
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return <RouteLoadingState />;
  }

  if (isAuthenticated && user?.role === "ADMIN") {
    return <Navigate to="/admin-panel" replace />;
  }

  const variant = getLayoutVariant(location.pathname, isAuthenticated);

  return (
    <div className={`public-container public-container--${variant}`}>
      <NavbarPublic />
      <main className="public-content">
        <MainLayout variant={variant}>
          <div className={`public-page public-page--${variant}`}>
            <Outlet />
          </div>
        </MainLayout>
      </main>
    </div>
  );
};

export default PublicLayout;
