import { Outlet, useParams } from "react-router-dom";
import { ProviderProfileProvider } from "@/context/ProviderContext";

const ProviderBusinessLayout = () => {
  const { slug = "" } = useParams();
  const decoded = decodeURIComponent(slug);

  return (
    <ProviderProfileProvider slug={decoded}>
      <Outlet />
    </ProviderProfileProvider>
  );
};

export default ProviderBusinessLayout;
