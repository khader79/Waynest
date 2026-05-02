import { lazy, Suspense } from "react";
import { Navigate, createBrowserRouter, useLocation } from "react-router-dom";
import GlobalInteractionRoot from "@/components/routing/GlobalInteractionRoot";
import { useAuth } from "@/context/AuthContext";
import { RouteLoadingState } from "@/components/shared/RouteLoadingState";
import { getDefaultDashboardPath } from "@/utils/routing";
import ProfileConnections, {
  UserPublicFollowersRoute,
  UserPublicFollowingRoute,
  UserPublicFriendsRoute,
} from "@/pages/user/profile/ProfileConnections";

const GuestLayout = lazy(() => import("@/layouts/GuestLayout"));
const AuthLayout = lazy(() => import("@/layouts/AuthLayout"));
const SocialLayout = lazy(() => import("@/layouts/SocialLayout"));
const AdminLayout = lazy(() => import("@/layouts/AdminLayout"));
const ProviderLayout = lazy(() => import("@/layouts/ProviderLayout"));

const LandingPage = lazy(() => import("@/pages/guest/landing/LandingPage"));
const Explore = lazy(() => import("@/pages/guest/explore/Explore"));
const Destinations = lazy(
  () => import("@/pages/guest/destinations/Destinations"),
);
const About = lazy(() => import("@/pages/guest/about/About"));
const Contact = lazy(() => import("@/pages/guest/contact/Contact"));
const SearchPage = lazy(() => import("@/pages/guest/search/SearchPage"));
const PlaceDetail = lazy(() => import("@/pages/guest/placeDetail/PlaceDetail"));
const EventDetail = lazy(() => import("@/pages/guest/eventDetail/EventDetail"));
const PublicTripPage = lazy(
  () => import("@/pages/guest/tripShare/PublicTripPage"),
);
const Login = lazy(() => import("@/pages/auth/login/Login"));
const Register = lazy(() => import("@/pages/auth/register/Register"));
const VerifyEmail = lazy(() => import("@/pages/auth/verifyEmail/VerifyEmail"));
const ChooseAccountMode = lazy(
  () => import("@/pages/auth/chooseAccount/ChooseAccountMode"),
);
const InvitePage = lazy(() => import("@/pages/auth/invite/InvitePage"));
const SocialFeed = lazy(() => import("@/pages/social/SocialFeed"));
const MessengerHub = lazy(() => import("@/pages/social/MessengerHub"));
const SocialPostDetail = lazy(() => import("@/pages/social/SocialPostDetail"));
const ActivitiesPage = lazy(() => import("@/pages/social/ActivitiesPage"));
const UserSocialProfile = lazy(
  () => import("@/pages/social/UserSocialProfile"),
);
const InboxPage = lazy(() => import("@/pages/social/InboxPage"));
const ConversationPage = lazy(() => import("@/pages/social/ConversationPage"));
const NotificationsPage = lazy(
  () => import("@/pages/social/NotificationsPage"),
);
const CommunityTabPlaceholder = lazy(
  () => import("@/pages/social/community/CommunityTabPlaceholder"),
);
const Profile = lazy(() => import("@/pages/user/profile/Profile"));
const Settings = lazy(() => import("@/pages/user/settings/Settings"));
const Bookings = lazy(() => import("@/pages/user/bookings/Bookings"));
const Wishlist = lazy(() => import("@/pages/user/wishlist/Wishlist"));
const GeoTables = lazy(() => import("@/pages/user/geo/GeoTables"));
const SavedPlans = lazy(() => import("@/pages/user/savedPlans/SavedPlans"));
const ProviderBusinessFeed = lazy(
  () => import("@/pages/provider/feed/ProviderBusinessFeed"),
);
const ProviderBusinessLayout = lazy(
  () => import("@/pages/provider/ProviderBusinessLayout"),
);
const ProviderCreatePostPage = lazy(
  () => import("@/pages/provider/create/ProviderCreatePostPage"),
);
const ProviderProfilePage = lazy(
  () => import("@/pages/provider/ProviderProfilePage"),
);
const ProviderReviewsPage = lazy(
  () => import("@/pages/provider/ProviderReviewsPage"),
);
const ProviderPanelProfile = lazy(
  () => import("@/pages/provider/profile/ProviderPanelProfile"),
);
const ProviderEvents = lazy(
  () => import("@/pages/provider/events/ProviderEvents"),
);
const ProviderPlaces = lazy(
  () => import("@/pages/provider/places/ProviderPlaces"),
);
const ProviderBookings = lazy(
  () => import("@/pages/provider/bookings/ProviderBookings"),
);
const ProviderApplyPage = lazy(
  () => import("@/pages/provider/apply/ProviderApplyPage"),
);
const AdminDashboard = lazy(
  () => import("@/pages/admin/dashboard/AdminDashboard"),
);
const DevicesPage = lazy(() => import("@/pages/admin/devices/DevicesPage"));
const UsersPage = lazy(() => import("@/pages/admin/users/UsersPage"));
const ProvidersPage = lazy(
  () => import("@/pages/admin/providers/ProvidersPage"),
);
const PlacesPage = lazy(() => import("@/pages/admin/places/PlacesPage"));
const CountriesPage = lazy(
  () => import("@/pages/admin/countries/CountriesPage"),
);
const CitiesPage = lazy(() => import("@/pages/admin/cities/CitiesPage"));
const CurrenciesPage = lazy(
  () => import("@/pages/admin/currencies/CurrenciesPage"),
);
const TagsPage = lazy(() => import("@/pages/admin/tags/TagsPage"));
const EventsPage = lazy(() => import("@/pages/admin/events/EventsPage"));
const ReviewsPage = lazy(() => import("@/pages/admin/reviews/ReviewsPage"));
const PlacePricingPage = lazy(
  () => import("@/pages/admin/placePricing/PlacePricingPage"),
);
const PlaceOpeningHoursPage = lazy(
  () => import("@/pages/admin/placeOpeningHours/PlaceOpeningHoursPage"),
);
const ProviderMembershipPage = lazy(
  () => import("@/pages/admin/providerMembership/ProviderMembershipPage"),
);
const ProviderApplicationsAdminPage = lazy(
  () =>
    import("@/pages/admin/providerApplications/ProviderApplicationsAdminPage"),
);
const VerificationRequests = lazy(
  () => import("@/pages/admin/VerificationRequests"),
);
const TripPlanner = lazy(() => import("@/pages/shared/TripPlanner"));
const TripPlannerCalendarPage = lazy(
  () => import("@/pages/shared/TripPlannerCalendarPage"),
);
const NotFound = lazy(() => import("@/pages/system/notfound/NotFound"));
const Unauthorized = lazy(
  () => import("@/pages/system/unauthorized/Unauthorized"),
);

const MEMBER_ROLES = ["USER", "PROVIDER"];

const getRoleFallbackPath = (role) => {
  if (role === "ADMIN" || role === "PROVIDER" || role === "USER") {
    return getDefaultDashboardPath(role);
  }

  return "/unauthorized";
};

/** Public business page: `/p/:slug` + optional `/places|events` (same component; tab follows URL). */
const providerBusinessChildRoutes = [
  { index: true, element: <ProviderProfilePage /> },
  { path: "places", element: <ProviderProfilePage /> },
  { path: "events", element: <ProviderProfilePage /> },
  { path: "reviews", element: <Navigate to=".." replace /> },
  { path: "services", element: <Navigate to="../places" replace /> },
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
    return <Navigate to={getRoleFallbackPath(user?.role)} replace />;
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
      <GuestLayout showRail={false} fullWidth>
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
    return <Navigate to={getRoleFallbackPath(user?.role)} replace />;
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

function LegacyTripPlannerRedirect() {
  const location = useLocation();
  return (
    <Navigate
      to={`/plan${location.search || ""}${location.hash || ""}`}
      replace
    />
  );
}

function LegacyCalendarRedirect() {
  const location = useLocation();
  return (
    <Navigate
      to={`/calendar${location.search || ""}${location.hash || ""}`}
      replace
    />
  );
}

const router = createBrowserRouter([
  {
    element: <GlobalInteractionRoot />,
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
          { path: "/calendar", element: <TripPlannerCalendarPage /> },
          { path: "/plan/calendar", element: <LegacyCalendarRedirect /> },
          { path: "/trip-planner", element: <LegacyTripPlannerRedirect /> },
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
          {
            path: "/u/:username/followers",
            element: <UserPublicFollowersRoute />,
          },
          {
            path: "/u/:username/friends",
            element: <UserPublicFriendsRoute />,
          },
          {
            path: "/u/:username/following",
            element: <UserPublicFollowingRoute />,
          },
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
            path: "/profile/settings",
            element: (
              <TravelerOrRedirect>
                <Settings />
              </TravelerOrRedirect>
            ),
          },
          {
            path: "/settings",
            element: (
              <TravelerOrRedirect>
                <Settings />
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
            path: "/activities",
            element: (
              <TravelerOrRedirect>
                <ActivitiesPage />
              </TravelerOrRedirect>
            ),
          },
          {
            path: "/saved-posts",
            element: <Navigate to="/activities" replace />,
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
        path: "/account/provider/apply",
        element: (
          <RequireUserRole>
            <GuestLayout showRail={false} showFooter={false} fullWidth>
              <ProviderApplyPage />
            </GuestLayout>
          </RequireUserRole>
        ),
      },
      {
        path: "/register/provider",
        element: (
          <RequireUserRole>
            <GuestLayout showRail={false} showFooter={false} fullWidth>
              <ProviderApplyPage />
            </GuestLayout>
          </RequireUserRole>
        ),
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
          { path: "provider/create-post", element: <ProviderCreatePostPage /> },
          {
            path: "provider/public",
            element: <ProviderBusinessLayout />,
            children: providerBusinessChildRoutes,
          },
          {
            path: "provider/reviews",
            element: <ProviderBusinessLayout />,
            children: [{ index: true, element: <ProviderReviewsPage /> }],
          },
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
      {
        path: "/provider-panel",
        element: <Navigate to="/account/provider" replace />,
      },
      {
        path: "/provider-panel/profile",
        element: <Navigate to="/account/provider/settings" replace />,
      },
      {
        path: "/provider-panel/places",
        element: <Navigate to="/account/provider/places" replace />,
      },
      {
        path: "/provider-panel/events",
        element: <Navigate to="/account/provider/events" replace />,
      },
      {
        path: "/provider-panel/bookings",
        element: <Navigate to="/account/provider/bookings" replace />,
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
          {
            path: "provider-applications",
            element: <ProviderApplicationsAdminPage />,
          },
          {
            path: "provider-verification-requests",
            element: <VerificationRequests />,
          },
        ],
      },
      { path: "/user-panel", element: <Navigate to="/" replace /> },
      {
        path: "/user-panel/profile",
        element: <Navigate to="/profile" replace />,
      },
      {
        path: "/user-panel/bookings",
        element: <Navigate to="/bookings" replace />,
      },
      {
        path: "/user-panel/wishlist",
        element: <Navigate to="/wishlist" replace />,
      },
      {
        path: "/user-panel/saved-plans",
        element: <Navigate to="/saved-plans" replace />,
      },
      {
        path: "/user-panel/activities",
        element: <Navigate to="/activities" replace />,
      },
      {
        path: "/user-panel/saved-posts",
        element: <Navigate to="/activities" replace />,
      },
      {
        path: "/user-panel/trip-planner",
        element: <LegacyTripPlannerRedirect />,
      },
      { path: "/user-panel/geo", element: <Navigate to="/geo" replace /> },
      { path: "/messenger", element: <SocialRedirect section="inbox" /> },
      { path: "/unauthorized", element: <Unauthorized /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

export default router;
