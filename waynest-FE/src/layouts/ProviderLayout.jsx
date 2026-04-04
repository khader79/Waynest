import { useEffect } from "react";
import PanelLayout from "@/layouts/PanelLayout";
import { ProviderWorkspaceProvider } from "@/context/ProviderWorkspaceContext";
import { useAuth } from "@/context/AuthContext";
import { setActiveWorkspace } from "@/utils/activeWorkspaceStorage";
import "./providerWorkspace.css";

function ProviderAccountWorkspaceSync() {
  const { user } = useAuth();
  useEffect(() => {
    if (user?.role === "PROVIDER" && user.id) {
      setActiveWorkspace(user.id, "provider");
    }
  }, [user?.id, user?.role]);
  return null;
}

const ProviderLayout = () => (
  <ProviderWorkspaceProvider>
    <ProviderAccountWorkspaceSync />
    <PanelLayout role="provider" />
  </ProviderWorkspaceProvider>
);

export default ProviderLayout;
