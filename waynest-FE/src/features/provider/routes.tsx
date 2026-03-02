import { ProtectedRoute } from "../../routes/ProtectedRoutes";
import ProviderLayout from "./ProviderLayout";

const providerRoutes = [
  {
    path: "/provider-panel",
    element: (
      <ProtectedRoute roleRequired="PROVIDER">
        <ProviderLayout />
      </ProtectedRoute>
    ),
  },
];

export default providerRoutes;
