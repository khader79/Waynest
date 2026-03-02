import { ProtectedRoute } from "../../routes/ProtectedRoutes";
import AdminLayout from "./AdminLayout";

const adminRoutes = [
  {
    path: "/admin-panel",

    element: (
      <ProtectedRoute roleRequired="ADMIN">
        <AdminLayout />
      </ProtectedRoute>
    ),

    children: [],
  },
];

export default adminRoutes;
