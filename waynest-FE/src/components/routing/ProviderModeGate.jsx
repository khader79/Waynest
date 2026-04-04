import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { RouteLoadingState } from "@/components/shared/RouteLoadingState";
import { hasProviderModeChosen } from "@/utils/providerModeStorage";
import {
  getActiveWorkspace,
  isPathAllowedInProviderWorkspace,
  isPathProviderPanelPath,
} from "@/utils/activeWorkspaceStorage";

const CHOOSE_ACCOUNT_PATH = "/choose-account";
const PROVIDER_HOME = "/account/provider";
const PERSONAL_HOME = "/";

/**
 * Provider-role users must complete account-mode selection before using the app.
 * Workspace "provider": only business-related paths until switching to personal.
 * Workspace "personal" (or unset): cannot open /account/* except via navbar (sets workspace first).
 */
export function ProviderModeGate() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <RouteLoadingState />;
  }

  if (user?.role === "PROVIDER" && !hasProviderModeChosen(user.id)) {
    if (location.pathname !== CHOOSE_ACCOUNT_PATH) {
      return (
        <Navigate
          to={CHOOSE_ACCOUNT_PATH}
          replace
          state={{
            redirectTo: `${location.pathname}${location.search ?? ""}`,
          }}
        />
      );
    }
  }

  if (user?.role === "PROVIDER" && user.id && hasProviderModeChosen(user.id)) {
    const workspace = getActiveWorkspace(user.id);
    const path = location.pathname;

    if (workspace === "provider") {
      if (!isPathAllowedInProviderWorkspace(path)) {
        return <Navigate to={PROVIDER_HOME} replace />;
      }
    }

    if (workspace === "personal" || workspace === null) {
      if (isPathProviderPanelPath(path)) {
        return <Navigate to={PERSONAL_HOME} replace />;
      }
    }
  }

  return <Outlet />;
}
