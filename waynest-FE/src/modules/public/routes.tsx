import { PublicRoute } from "../../core/router/PublicRoute";
import PublicLayout from "./PublicLayout";
import Explore from "./pages/explore/Explore";
import Landing from "./pages/landing/LandingPage";
import Login from "./pages/login/Login";
import Register from "./pages/register/Register";
import VerifyEmail from "./pages/verifyEmail/VerifyEmail";
import TripPlanner from "../user/pages/tripPlanner/TripPlanner";
import About from "./pages/about/About";
import Contact from "./pages/contact/Contact";
import PublicTripPage from "./pages/tripShare/PublicTripPage";
import InvitePage from "./pages/invite/InvitePage";

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
        path: "/plan",
        element: <TripPlanner />,
      },
      {
        path: "/trip",
        element: <PublicTripPage />,
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
        path: "/invite",
        element: <InvitePage />,
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

