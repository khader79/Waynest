import { lazy, Suspense } from "react";
import { Navigate, createBrowserRouter, useLocation } from "react-router-dom";
import { ProviderModeGate } from "@/components/routing/ProviderModeGate";
import { useAuth } from "@/context/AuthContext";
import { RouteLoadingState } from "@/components/shared/RouteLoadingState";
import GuestLayout from "@/layouts/GuestLayout";
import AuthLayout from "@/layouts/AuthLayout";
import SocialLayout from "@/layouts/SocialLayout";
import AdminLayout from "@/layouts/AdminLayout";
import ProviderLayout from "@/layouts/ProviderLayout";
import LandingPage from "@/pages/guest/landing/LandingPage";
import Explore from "@/pages/guest/explore/Explore";
import Destinations from "@/pages/guest/destinations/Destinations";
import About from "@/pages/guest/about/About";
import Contact from "@/pages/guest/contact/Contact";
import SearchPage from "@/pages/guest/search/SearchPage";
import PlaceDetail from "@/pages/guest/placeDetail/PlaceDetail";
import EventDetail from "@/pages/guest/eventDetail/EventDetail";
import PublicTripPage from "@/pages/guest/tripShare/PublicTripPage";
import Login from "@/pages/auth/login/Login";
import Register from "@/pages/auth/register/Register";
import VerifyEmail from "@/pages/auth/verifyEmail/VerifyEmail";
import ChooseAccountMode from "@/pages/auth/chooseAccount/ChooseAccountMode";
import InvitePage from "@/pages/auth/invite/InvitePage";
import SocialFeed from "@/pages/social/SocialFeed";
import MessengerHub from "@/pages/social/MessengerHub";
import SocialPostDetail from "@/pages/social/SocialPostDetail";
import UserSocialProfile from "@/pages/social/UserSocialProfile";
import InboxPage from "@/pages/social/InboxPage";
import ConversationPage from "@/pages/social/ConversationPage";
import NotificationsPage from "@/pages/social/NotificationsPage";
import CommunityTabPlaceholder from "@/pages/social/community/CommunityTabPlaceholder";
import Profile from "@/pages/user/profile/Profile";
import ProfileConnections, {
  UserPublicFollowersRoute,
  UserPublicFollowingRoute,
} from "@/pages/user/profile/ProfileConnections";
import Bookings from "@/pages/user/bookings/Bookings";
import Wishlist from "@/pages/user/wishlist/Wishlist";
import GeoTables from "@/pages/user/geo/GeoTables";
import SavedPlans from "@/pages/user/savedPlans/SavedPlans";
import ProviderBusinessFeed from "@/pages/provider/feed/ProviderBusinessFeed";
import ProviderBusinessLayout from "@/pages/provider/ProviderBusinessLayout";
import ProviderProfilePage from "@/pages/provider/ProviderProfilePage";
import ProviderPanelProfile from "@/pages/provider/profile/ProviderPanelProfile";

const ProviderServicesPage = lazy(() => import("@/pages/provider/ProviderServicesPage"));
const ProviderReviewsPage = lazy(() => import("@/pages/provider/ProviderReviewsPage"));
const ProviderEvents = lazy(() => import("@/pages/provider/events/ProviderEvents"));
const ProviderPublicEventsPage = lazy(() =>
  import("@/pages/provider/ProviderPublicEventsPage"),
);
import ProviderPlaces from "@/pages/provider/places/ProviderPlaces";
import ProviderBookings from "@/pages/provider/bookings/ProviderBookings";
import ProviderApplyPage from "@/pages/provider/apply/ProviderApplyPage";
import AdminDashboard from "@/pages/admin/dashboard/AdminDashboard";
import DevicesPage from "@/pages/admin/devices/DevicesPage";
import UsersPage from "@/pages/admin/users/UsersPage";
import ProvidersPage from "@/pages/admin/providers/ProvidersPage";
import PlacesPage from "@/pages/admin/places/PlacesPage";
import CountriesPage from "@/pages/admin/countries/CountriesPage";
import CitiesPage from "@/pages/admin/cities/CitiesPage";
import CurrenciesPage from "@/pages/admin/currencies/CurrenciesPage";
import TagsPage from "@/pages/admin/tags/TagsPage";
import EventsPage from "@/pages/admin/events/EventsPage";
import ReviewsPage from "@/pages/admin/reviews/ReviewsPage";
import PlacePricingPage from "@/pages/admin/placePricing/PlacePricingPage";
import PlaceOpeningHoursPage from "@/pages/admin/placeOpeningHours/PlaceOpeningHoursPage";
import ProviderMembershipPage from "@/pages/admin/providerMembership/ProviderMembershipPage";
import ProviderApplicationsAdminPage from "@/pages/admin/providerApplications/ProviderApplicationsAdminPage";
import TripPlanner from "@/pages/shared/TripPlanner";
import NotFound from "@/pages/system/notfound/NotFound";
import Unauthorized from "@/pages/system/unauthorized/Unauthorized";

const MEMBER_ROLES = ["USER", "PROVIDER"];

const providerBusinessChildRoutes = [
  { index: true, element: <ProviderProfilePage /> },
  {
    path: "services",
    element: (
      <Suspense fallback={<RouteLoadingState />}>
        <ProviderServicesPage />
      </Suspense>
    ),
  },
  {
    path: "events",
    element: (
      <Suspense fallback={<RouteLoadingState />}>
        <ProviderPublicEventsPage />
      </Suspense>
    ),
  },
  {
    path: "reviews",
    element: (
      <Suspense fallback={<RouteLoadingState />}>
        <ProviderReviewsPage />
      </Suspense>
    ),
  },
];

const getSignedInHomePath = (role) => {
  if (role === "ADMIN") {
    return "/admin-panel";
  }
  return "/";
};

function RequireAuth({ allowedRoles, children }) {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return <RouteLoadingState />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles?.length && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}

function RequireGuest({ children }) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return <RouteLoadingState />;
  }

  if (isAuthenticated) {
    return <Navigate to={getSignedInHomePath(user?.role)} replace />;
  }

  return children;
}

function HomeEntry() {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return <RouteLoadingState />;
  }

  if (!isAuthenticated) {
    return (
      <GuestLayout showRail={false}>
        <LandingPage />
      </GuestLayout>
    );
  }

  if (user?.role === "ADMIN") {
    return <Navigate to="/admin-panel" replace />;
  }

  if (user?.role === "USER" || user?.role === "PROVIDER") {
    return (
      <SocialLayout variant="signed-in-social">
        <SocialFeed />
      </SocialLayout>
    );
  }

  return <Navigate to="/unauthorized" replace />;
}

/** Traveler account pages: USER and PROVIDER; admins go to admin panel elsewhere. */
function TravelerOrRedirect({ children }) {
  const { loading, user } = useAuth();

  if (loading) {
    return <RouteLoadingState />;
  }

  if (user?.role === "ADMIN") {
    return <Navigate to="/admin-panel" replace />;
  }

  if (user?.role !== "USER" && user?.role !== "PROVIDER") {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}

function RequireUserRole({ children }) {
  const { loading, user } = useAuth();

  if (loading) {
    return <RouteLoadingState />;
  }

  if (user?.role !== "USER") {
    return <Navigate to="/" replace />;
  }

  return children;
}

function SocialRedirect({ section }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <RouteLoadingState />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const targets = {
    inbox: "/social",
    notifications: "/notifications",
  };

  return <Navigate to={targets[section] || "/"} replace />;
}

const router = createBrowserRouter([
  {
    element: <ProviderModeGate />,
    children: [
  { path: "/", element: <HomeEntry /> },
  {
    path: "/dashboard/provider",
    element: <Navigate to="/account/provider" replace />,
  },
  {
    element: <GuestLayout showRail />,
    children: [
      { path: "/explore", element: <Explore /> },
      { path: "/destinations", element: <Destinations /> },
      { path: "/plan", element: <TripPlanner /> },
      { path: "/trip/:slug", element: <PublicTripPage /> },
      { path: "/places/:id", element: <PlaceDetail /> },
      { path: "/events/:id", element: <EventDetail /> },
      { path: "/about", element: <About /> },
      { path: "/contact", element: <Contact /> },
      { path: "/search", element: <SearchPage /> },
    ],
  },
  {
    element: (
      <RequireGuest>
        <AuthLayout />
      </RequireGuest>
    ),
    children: [
      { path: "/login", element: <Login /> },
      { path: "/register", element: <Register /> },
      { path: "/verify-email", element: <VerifyEmail /> },
    ],
  },
  {
    element: <AuthLayout />,
    children: [{ path: "/invite", element: <InvitePage /> }],
  },
  {
    path: "/choose-account",
    element: (
      <RequireAuth allowedRoles={["PROVIDER"]}>
        <AuthLayout />
      </RequireAuth>
    ),
    children: [{ index: true, element: <ChooseAccountMode /> }],
  },
  {
    element: <SocialLayout variant="signed-in-social" />,
    children: [
      { path: "/u/:username/followers", element: <UserPublicFollowersRoute /> },
      { path: "/u/:username/following", element: <UserPublicFollowingRoute /> },
      { path: "/u/:username", element: <UserSocialProfile /> },
      {
        path: "/p/:slug",
        element: <ProviderBusinessLayout />,
        children: providerBusinessChildRoutes,
      },
      {
        path: "/provider/:param",
        element: <ProviderBusinessLayout />,
        children: providerBusinessChildRoutes,
      },
      { path: "/social/post/:id", element: <SocialPostDetail /> },
    ],
  },
  {
    element: (
      <RequireAuth allowedRoles={MEMBER_ROLES}>
        <SocialLayout variant="messenger" />
      </RequireAuth>
    ),
    children: [
      { path: "/social", element: <MessengerHub /> },
      { path: "/inbox", element: <InboxPage /> },
      { path: "/inbox/:id", element: <ConversationPage /> },
      { path: "/community/:tab", element: <CommunityTabPlaceholder /> },
    ],
  },
  {
    element: (
      <RequireAuth allowedRoles={MEMBER_ROLES}>
        <SocialLayout variant="signed-in-social" />
      </RequireAuth>
    ),
    children: [
      { path: "/notifications", element: <NotificationsPage /> },
      { path: "/dashboard", element: <Navigate to="/" replace /> },
      {
        path: "/profile",
        element: (
          <TravelerOrRedirect>
            <Profile />
          </TravelerOrRedirect>
        ),
      },
      {
        path: "/profile/friends",
        element: (
          <TravelerOrRedirect>
            <ProfileConnections list="friends" />
          </TravelerOrRedirect>
        ),
      },
      {
        path: "/profile/followers",
        element: (
          <TravelerOrRedirect>
            <ProfileConnections list="followers" />
          </TravelerOrRedirect>
        ),
      },
      {
        path: "/profile/following",
        element: (
          <TravelerOrRedirect>
            <ProfileConnections list="following" />
          </TravelerOrRedirect>
        ),
      },
      {
        path: "/bookings",
        element: (
          <TravelerOrRedirect>
            <Bookings />
          </TravelerOrRedirect>
        ),
      },
      {
        path: "/wishlist",
        element: (
          <TravelerOrRedirect>
            <Wishlist />
          </TravelerOrRedirect>
        ),
      },
      {
        path: "/saved-plans",
        element: (
          <TravelerOrRedirect>
            <SavedPlans />
          </TravelerOrRedirect>
        ),
      },
      {
        path: "/trip-planner",
        element: (
          <TravelerOrRedirect>
            <TripPlanner />
          </TravelerOrRedirect>
        ),
      },
      {
        path: "/geo",
        element: (
          <TravelerOrRedirect>
            <GeoTables />
          </TravelerOrRedirect>
        ),
      },
      {
        path: "/account/provider/apply",
        element: (
          <RequireUserRole>
            <ProviderApplyPage />
          </RequireUserRole>
        ),
      },
      {
        path: "/register/provider",
        element: (
          <RequireUserRole>
            <ProviderApplyPage />
          </RequireUserRole>
        ),
      },
    ],
  },
  {
    path: "/account",
    element: (
      <RequireAuth allowedRoles={["PROVIDER"]}>
        <ProviderLayout />
      </RequireAuth>
    ),
    children: [
      { path: "provider", element: <ProviderBusinessFeed /> },
      { path: "provider/places", element: <ProviderPlaces /> },
      {
        path: "provider/events",
        element: (
          <Suspense fallback={<RouteLoadingState />}>
            <ProviderEvents />
          </Suspense>
        ),
      },
      { path: "provider/bookings", element: <ProviderBookings /> },
      { path: "provider/settings", element: <ProviderPanelProfile /> },
    ],
  },
  { path: "/provider-panel", element: <Navigate to="/account/provider" replace /> },
  { path: "/provider-panel/profile", element: <Navigate to="/account/provider/settings" replace /> },
  { path: "/provider-panel/places", element: <Navigate to="/account/provider/places" replace /> },
  { path: "/provider-panel/events", element: <Navigate to="/account/provider/events" replace /> },
  { path: "/provider-panel/bookings", element: <Navigate to="/account/provider/bookings" replace /> },
  {
    path: "/admin-panel",
    element: (
      <RequireAuth allowedRoles={["ADMIN"]}>
        <AdminLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <AdminDashboard /> },
      { path: "devices", element: <DevicesPage /> },
      { path: "users", element: <UsersPage /> },
      { path: "providers", element: <ProvidersPage /> },
      { path: "places", element: <PlacesPage /> },
      { path: "countries", element: <CountriesPage /> },
      { path: "cities", element: <CitiesPage /> },
      { path: "currencies", element: <CurrenciesPage /> },
      { path: "tags", element: <TagsPage /> },
      { path: "events", element: <EventsPage /> },
      { path: "reviews", element: <ReviewsPage /> },
      { path: "place-pricing", element: <PlacePricingPage /> },
      { path: "place-opening-hours", element: <PlaceOpeningHoursPage /> },
      { path: "provider-membership", element: <ProviderMembershipPage /> },
      {
        path: "provider-applications",
        element: <ProviderApplicationsAdminPage />,
      },
    ],
  },
  { path: "/user-panel", element: <Navigate to="/" replace /> },
  { path: "/user-panel/profile", element: <Navigate to="/profile" replace /> },
  { path: "/user-panel/bookings", element: <Navigate to="/bookings" replace /> },
  { path: "/user-panel/wishlist", element: <Navigate to="/wishlist" replace /> },
  { path: "/user-panel/saved-plans", element: <Navigate to="/saved-plans" replace /> },
  { path: "/user-panel/trip-planner", element: <Navigate to="/trip-planner" replace /> },
  { path: "/user-panel/geo", element: <Navigate to="/geo" replace /> },
  { path: "/messenger", element: <SocialRedirect section="inbox" /> },
  { path: "/unauthorized", element: <Unauthorized /> },
  { path: "*", element: <NotFound /> },
    ],
  },
]);

export default router;
