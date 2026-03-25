import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { PublicRoute } from "../../core/router/PublicRoute";
import PublicLayout from "./PublicLayout";
import Landing from "./pages/landing/LandingPage";
import Login from "./pages/login/Login";
import Register from "./pages/register/Register";
import VerifyEmail from "./pages/verifyEmail/VerifyEmail";
import About from "./pages/about/About";
import Contact from "./pages/contact/Contact";
import InvitePage from "./pages/invite/InvitePage";
import Profile from "../user/pages/profile/Profile";
import Wishlist from "../user/pages/wishlist/Wishlist";
import SavedPlans from "../user/pages/savedPlans/SavedPlans";
import { useAuth } from "@/core/providers/AuthContext";
import { RouteLoadingState } from "@/ui/feedback/RouteLoadingState";
import { Explore, PlaceDetail, EventDetail } from "@/features/places";
import { Bookings } from "@/features/bookings";
import {
  MessengerHub,
  SocialPostDetail,
  UserSocialProfile,
  InboxPage,
  ConversationPage,
  NotificationsPage,
} from "@/features/social";
import { ProviderSocialProfile } from "@/features/providers";
import { TripPlanner, PublicTripPage } from "@/features/trips";
import SearchPage from "./pages/search/SearchPage";
import LegacyUserProfileRedirect from "./pages/social/LegacyUserProfileRedirect";
import LegacyProviderProfileRedirect from "./pages/social/LegacyProviderProfileRedirect";
import CommunityTabPlaceholder from "./pages/community/CommunityTabPlaceholder";

const AuthenticatedRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return <RouteLoadingState />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role === "ADMIN") {
    return <Navigate to="/admin-panel" replace />;
  }

  if (user?.role !== "USER") {
    return <Navigate to="/" replace />;
  }

  return children;
};

const LoggedInRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, loading, user } = useAuth();
  if (loading) {
    return <RouteLoadingState />;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (user?.role === "ADMIN") {
    return <Navigate to="/admin-panel" replace />;
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
        path: "explore",
        element: <Explore />,
      },
      {
        path: "destinations",
        element: <TripPlanner />,
      },
      {
        path: "plan",
        element: <TripPlanner />,
      },
      {
        path: "trip/:slug",
        element: <PublicTripPage />,
      },
      {
        path: "about",
        element: <About />,
      },
      {
        path: "search",
        element: <SearchPage />,
      },
      {
        path: "u/:username",
        element: (
          <LoggedInRoute>
            <UserSocialProfile />
          </LoggedInRoute>
        ),
      },
      {
        path: "p/:slug",
        element: <ProviderSocialProfile />,
      },
      {
        path: "social",
        element: (
          <LoggedInRoute>
            <MessengerHub />
          </LoggedInRoute>
        ),
      },
      {
        path: "social/post/:id",
        element: (
          <LoggedInRoute>
            <SocialPostDetail />
          </LoggedInRoute>
        ),
      },
      {
        path: "social/users/:legacy",
        element: (
          <LoggedInRoute>
            <LegacyUserProfileRedirect />
          </LoggedInRoute>
        ),
      },
      {
        path: "social/providers/:legacy",
        element: <LegacyProviderProfileRedirect />,
      },
      {
        path: "community/:tab",
        element: (
          <LoggedInRoute>
            <CommunityTabPlaceholder />
          </LoggedInRoute>
        ),
      },
      {
        path: "contact",
        element: <Contact />,
      },
      {
        path: "invite",
        element: <InvitePage />,
      },
      {
        path: "places/:id",
        element: <PlaceDetail />,
      },
      {
        path: "events/:id",
        element: <EventDetail />,
      },
      {
        path: "profile",
        element: (
          <AuthenticatedRoute>
            <Profile />
          </AuthenticatedRoute>
        ),
      },
      {
        path: "wishlist",
        element: (
          <AuthenticatedRoute>
            <Wishlist />
          </AuthenticatedRoute>
        ),
      },
      {
        path: "bookings",
        element: (
          <AuthenticatedRoute>
            <Bookings />
          </AuthenticatedRoute>
        ),
      },
      {
        path: "saved-plans",
        element: (
          <AuthenticatedRoute>
            <SavedPlans />
          </AuthenticatedRoute>
        ),
      },
      {
        path: "inbox",
        element: (
          <LoggedInRoute>
            <InboxPage />
          </LoggedInRoute>
        ),
      },
      {
        path: "inbox/:id",
        element: (
          <LoggedInRoute>
            <ConversationPage />
          </LoggedInRoute>
        ),
      },
      {
        path: "notifications",
        element: (
          <LoggedInRoute>
            <NotificationsPage />
          </LoggedInRoute>
        ),
      },
      {
        path: "login",
        element: (
          <PublicRoute>
            <Login />
          </PublicRoute>
        ),
      },
      {
        path: "register",
        element: (
          <PublicRoute>
            <Register />
          </PublicRoute>
        ),
      },
      {
        path: "verify-email",
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
