import { ProviderModeGate } from "@/components/routing/ProviderModeGate";
import GlobalAiConciergeLauncher from "@/components/shared/GlobalAiConciergeLauncher";
import { GlobalShareProvider } from "@/context/GlobalShareContext";
import AdminNetworkOverlay from "@/components/shared/AdminNetworkOverlay";

const GlobalInteractionRoot = () => (
  <GlobalShareProvider>
    <ProviderModeGate />
    <GlobalAiConciergeLauncher />
    <AdminNetworkOverlay />
  </GlobalShareProvider>
);

export default GlobalInteractionRoot;
