import { createBrowserRouter, Outlet } from "react-router-dom";
import publicRoutes from "../features/public/routes";
import NotFound from "../features/system/pages/notfound/NotFound";
import Unauthorized from "../features/system/pages/unauthorized/Unauthorized";
import userRoutes from "../features/user/routes";
import adminRoutes from "../features/admin/routes";
import { AuthProvider } from "../context/AuthContext";
import { ProtectedRoute } from "./ProtectedRoutes";

const RootLayout = () => (
  <AuthProvider>
    <Outlet />
  </AuthProvider>
);

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      ...publicRoutes,
      {
        element: <ProtectedRoute roleRequired="USER" />,
        children: userRoutes,
      },
      {
        element: <ProtectedRoute roleRequired="ADMIN" />,
        children: adminRoutes,
      },
      {
        path: "/unauthorized",
        element: <Unauthorized />,
      },
      {
        path: "*",
        element: <NotFound />,
      },
    ],
  },
]);

export default router;
