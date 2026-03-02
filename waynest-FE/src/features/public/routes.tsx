import { GuestGuard } from "../../routes/GuestGuard";
import PublicLayout from "./PublicLayout";
import Explore from "./pages/explore/Explore";
import Landing from "./pages/landing/LandingPage";
import Login from "./pages/login/Login";

const publicRoutes = [
  {
    path: "/",
    element: <PublicLayout />,
    children: [
      {
        index: true,
        element: <Landing />,
      },
      {
        path: "/explore",
        element: <Explore />,
      },
      {
        element: <GuestGuard />,
        children: [
          {
            path: "/login",
            element: <Login />,
          },
        ],
      },
    ],
  },
];

export default publicRoutes;
