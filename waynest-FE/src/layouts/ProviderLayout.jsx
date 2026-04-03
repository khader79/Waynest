import PanelLayout from "@/layouts/PanelLayout";
import { ProviderWorkspaceProvider } from "@/context/ProviderWorkspaceContext";
import "./providerWorkspace.css";

const ProviderLayout = () => (
  <ProviderWorkspaceProvider>
    <PanelLayout role="provider" />
  </ProviderWorkspaceProvider>
);

export default ProviderLayout;
