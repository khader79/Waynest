import { Outlet, useParams } from "react-router-dom";
import { ProviderProfileProvider } from "@/context/ProviderContext";
import { useProviderWorkspace } from "@/context/ProviderWorkspaceContext";

const ProviderBusinessLayout = () => {
  const { slug = "", param = "" } = useParams();
  const { slug: workspaceSlug } = useProviderWorkspace();
  const raw = slug || param;
  const decoded = raw ? decodeURIComponent(raw) : (workspaceSlug?.trim() ?? "");

  return (
    <ProviderProfileProvider slug={decoded}>
      <Outlet />
    </ProviderProfileProvider>
  );
};

export default ProviderBusinessLayout;
