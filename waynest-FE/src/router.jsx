import { Navigate, createBrowserRouter, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { RouteLoadingState } from "@/components/shared/RouteLoadingState";
import GuestLayout from "@/layouts/GuestLayout";
import AuthLayout from "@/layouts/AuthLayout";
import SocialLayout from "@/layouts/SocialLayout";
import ProviderLayout from "@/layouts/ProviderLayout";
import AdminLayout from "@/layouts/AdminLayout";
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
import InvitePage from "@/pages/auth/invite/InvitePage";
import SocialFeed from "@/pages/social/SocialFeed";
import MessengerHub from "@/pages/social/MessengerHub";
import SocialPostDetail from "@/pages/social/SocialPostDetail";
import UserSocialProfile from "@/pages/social/UserSocialProfile";
import ProviderSocialProfile from "@/pages/social/ProviderSocialProfile";
import InboxPage from "@/pages/social/InboxPage";
import ConversationPage from "@/pages/social/ConversationPage";
import NotificationsPage from "@/pages/social/NotificationsPage";
import CommunityTabPlaceholder from "@/pages/social/community/CommunityTabPlaceholder";
import Dashboard from "@/pages/user/dashboard/Dashboard";
import Profile from "@/pages/user/profile/Profile";
import Bookings from "@/pages/user/bookings/Bookings";
import Wishlist from "@/pages/user/wishlist/Wishlist";
import GeoTables from "@/pages/user/geo/GeoTables";
import SavedPlans from "@/pages/user/savedPlans/SavedPlans";
import ProviderDashboard from "@/pages/provider/dashboard/ProviderDashboard";
import ProviderProfile from "@/pages/provider/profile/ProviderProfile";
import ProviderPlaces from "@/pages/provider/places/ProviderPlaces";
import ProviderBookings from "@/pages/provider/bookings/ProviderBookings";
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
import TripPlanner from "@/pages/shared/TripPlanner";
import NotFound from "@/pages/system/notfound/NotFound";
import Unauthorized from "@/pages/system/unauthorized/Unauthorized";

const MEMBER_ROLES = ["USER", "PROVIDER"];

const getSignedInHomePath = (role) => {
  if (role === "ADMIN") {
    return "/admin-panel";
  }
  if (role === "PROVIDER") {
    return "/provider-panel";
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

  if (user?.role === "PROVIDER") {
    return <Navigate to="/provider-panel" replace />;
  }

  return (
    <SocialLayout variant="signed-in-social">
      <SocialFeed />
    </SocialLayout>
  );
}

/** USER-only pages inside SocialLayout; providers are sent to their panel. */
function TravelerOrRedirect({ children, providerFallback = "/provider-panel" }) {
  const { loading, user } = useAuth();

  if (loading) {
    return <RouteLoadingState />;
  }

  if (user?.role === "PROVIDER") {
    return <Navigate to={providerFallback} replace />;
  }

  if (user?.role !== "USER") {
    return <Navigate to="/unauthorized" replace />;
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
  { path: "/", element: <HomeEntry /> },
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
    element: <SocialLayout variant="signed-in-social" />,
    children: [
      { path: "/u/:username", element: <UserSocialProfile /> },
      { path: "/p/:slug", element: <ProviderSocialProfile /> },
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
      {
        path: "/dashboard",
        element: (
          <TravelerOrRedirect>
            <Dashboard />
          </TravelerOrRedirect>
        ),
      },
      {
        path: "/profile",
        element: (
          <TravelerOrRedirect providerFallback="/provider-panel/profile">
            <Profile />
          </TravelerOrRedirect>
        ),
      },
      {
        path: "/bookings",
        element: (
          <TravelerOrRedirect providerFallback="/provider-panel/bookings">
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
    ],
  },
  {
    path: "/provider-panel",
    element: (
      <RequireAuth allowedRoles={["PROVIDER"]}>
        <ProviderLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <ProviderDashboard /> },
      { path: "profile", element: <ProviderProfile /> },
      { path: "places", element: <ProviderPlaces /> },
      { path: "bookings", element: <ProviderBookings /> },
    ],
  },
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
    ],
  },
  { path: "/user-panel", element: <Navigate to="/dashboard" replace /> },
  { path: "/user-panel/profile", element: <Navigate to="/profile" replace /> },
  { path: "/user-panel/bookings", element: <Navigate to="/bookings" replace /> },
  { path: "/user-panel/wishlist", element: <Navigate to="/wishlist" replace /> },
  { path: "/user-panel/saved-plans", element: <Navigate to="/saved-plans" replace /> },
  { path: "/user-panel/trip-planner", element: <Navigate to="/trip-planner" replace /> },
  { path: "/user-panel/geo", element: <Navigate to="/geo" replace /> },
  { path: "/messenger", element: <SocialRedirect section="inbox" /> },
  { path: "/unauthorized", element: <Unauthorized /> },
  { path: "*", element: <NotFound /> },
]);

export default router;
