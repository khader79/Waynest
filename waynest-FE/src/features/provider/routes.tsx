import { ProtectedRoute } from "../../routes/ProtectedRoutes";
import ProviderLayout from "./ProviderLayout";

const providerRoutes = [
  {
    path: "/provider-panel",
    element: <ProviderLayout />,
  },
];

export default providerRoutes;
