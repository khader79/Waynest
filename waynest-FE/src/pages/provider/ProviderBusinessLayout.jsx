import { Outlet, useParams } from "react-router-dom";
import { ProviderProfileProvider } from "@/context/ProviderContext";

const ProviderBusinessLayout = () => {
  const { slug = "", param = "" } = useParams();
  const raw = slug || param;
  const decoded = decodeURIComponent(raw);

  return (
    <ProviderProfileProvider slug={decoded}>
      <Outlet />
    </ProviderProfileProvider>
  );
};

export default ProviderBusinessLayout;
