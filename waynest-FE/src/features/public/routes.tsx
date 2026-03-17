import { PublicRoute } from "../../routes/PublicRoute";
import PublicLayout from "./PublicLayout";
import Explore from "./pages/explore/Explore";
import Landing from "./pages/landing/LandingPage";
import Login from "./pages/login/Login";
import Register from "./pages/register/Register";
import VerifyEmail from "./pages/verifyEmail/VerifyEmail";
import TripPlanner from "../user/pages/tripPlanner/TripPlanner";
import About from "./pages/about/About";
import Contact from "./pages/contact/Contact";

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
        path: "/destinations",
        element: <TripPlanner />,
      },
      {
        path: "/about",
        element: <About />,
      },
      {
        path: "/contact",
        element: <Contact />,
      },
      {
        path: "/login",
        element: (
          <PublicRoute>
            <Login />
          </PublicRoute>
        ),
      },
      {
        path: "/register",
        element: (
          <PublicRoute>
            <Register />
          </PublicRoute>
        ),
      },
      {
        path: "/verify-email",
        element: (
          <PublicRoute>
            <VerifyEmail />
          </PublicRoute>
        ),
      },
    ],
  },
];

export default publicRoutes;
