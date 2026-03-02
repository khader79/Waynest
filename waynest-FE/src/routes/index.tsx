import { createBrowserRouter, Outlet } from "react-router-dom";
import publicRoutes from "../features/public/routes";
import NotFound from "../features/system/pages/notfound/NotFound";
import Unauthorized from "../features/system/pages/unauthorized/Unauthorized";
import userRoutes from "../features/user/routes";
import adminRoutes from "../features/admin/routes";
import { AuthProvider } from "../context/AuthContext";
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
      ...userRoutes,
      ...adminRoutes,
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
