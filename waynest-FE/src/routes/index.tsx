import { createBrowserRouter } from "react-router-dom";
import publicRoutes from "../features/public/routes";
import NotFound from "../features/system/pages/notfound/NotFound";
import Unauthorized from "../features/system/pages/unauthorized/Unauthorized";
import userRoutes from "../features/user/routes";
import AuthLoader from "./AuthLoader";
const router = createBrowserRouter([
  {
    element: <AuthLoader />,
    children: [
      ...publicRoutes,
      ...userRoutes,
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
