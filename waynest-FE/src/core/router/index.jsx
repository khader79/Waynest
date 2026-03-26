/* eslint-disable react-refresh/only-export-components */
import { createBrowserRouter, Outlet, ScrollRestoration } from "react-router-dom";
import adminRoutes from "../../modules/admin/routes";
import providerRoutes from "../../modules/provider/routes";
import publicRoutes from "../../modules/public/routes";
import NotFound from "../../modules/system/pages/notfound/NotFound";
import Unauthorized from "../../modules/system/pages/unauthorized/Unauthorized";
import userRoutes from "../../modules/user/routes";
import { ProtectedRoute } from "./ProtectedRoutes";

const RootLayout = () => (
  <>
    <ScrollRestoration />
    <Outlet />
  </>
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
        element: <ProtectedRoute roleRequired="PROVIDER" />,
        children: providerRoutes,
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
