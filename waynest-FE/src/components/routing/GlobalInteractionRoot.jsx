import { ProviderModeGate } from "@/components/routing/ProviderModeGate";
import GlobalAiConciergeLauncher from "@/components/shared/GlobalAiConciergeLauncher";
import { GlobalShareProvider } from "@/context/GlobalShareContext";

const GlobalInteractionRoot = () => (
  <GlobalShareProvider>
    <ProviderModeGate />
    <GlobalAiConciergeLauncher />
  </GlobalShareProvider>
);

export default GlobalInteractionRoot;
