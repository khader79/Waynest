import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { PublicRoute } from "../../core/router/PublicRoute";
import PublicLayout from "./PublicLayout";
import Explore from "./pages/explore/Explore";
import Landing from "./pages/landing/LandingPage";
import Login from "./pages/login/Login";
import Register from "./pages/register/Register";
import VerifyEmail from "./pages/verifyEmail/VerifyEmail";
import TripPlanner from "../../features/trip-planner/TripPlanner";
import About from "./pages/about/About";
import Contact from "./pages/contact/Contact";
import PublicTripPage from "./pages/tripShare/PublicTripPage";
import InvitePage from "./pages/invite/InvitePage";
import PlaceDetail from "./pages/placeDetail/PlaceDetail";
import EventDetail from "./pages/eventDetail/EventDetail";
import Profile from "../user/pages/profile/Profile";
import Wishlist from "../user/pages/wishlist/Wishlist";
import Bookings from "../user/pages/bookings/Bookings";
import SavedPlans from "../user/pages/savedPlans/SavedPlans";
import { useAuth } from "@/core/providers/AuthContext";
import { RouteLoadingState } from "@/ui/feedback/RouteLoadingState";

const AuthenticatedRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return <RouteLoadingState />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== "USER") {
    return <Navigate to="/" replace />;
  }

  return children;
};

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
        path: "/trip/:slug",
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
        path: "/places/:id",
        element: <PlaceDetail />,
      },
      {
        path: "/events/:id",
        element: <EventDetail />,
      },
      {
        path: "/profile",
        element: (
          <AuthenticatedRoute>
            <Profile />
          </AuthenticatedRoute>
        ),
      },
      {
        path: "/wishlist",
        element: (
          <AuthenticatedRoute>
            <Wishlist />
          </AuthenticatedRoute>
        ),
      },
      {
        path: "/bookings",
        element: (
          <AuthenticatedRoute>
            <Bookings />
          </AuthenticatedRoute>
        ),
      },
      {
        path: "/saved-plans",
        element: (
          <AuthenticatedRoute>
            <SavedPlans />
          </AuthenticatedRoute>
        ),
      },
      {
        path: "/user-panel",
        element: <Navigate to="/profile" replace />,
      },
      {
        path: "/user-panel/*",
        element: <Navigate to="/profile" replace />,
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

