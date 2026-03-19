import Layout from "../../ui/layout/Layout";
import AdminDashboard from "./pages/dashboard/AdminDashboard";
import UsersPage from "./pages/users/UsersPage";
import ProvidersPage from "./pages/providers/ProvidersPage";
import PlacesPage from "./pages/places/PlacesPage";
import CountriesPage from "./pages/countries/CountriesPage";
import CitiesPage from "./pages/cities/CitiesPage";
import CurrenciesPage from "./pages/currencies/CurrenciesPage";
import TagsPage from "./pages/tags/TagsPage";
import EventsPage from "./pages/events/EventsPage";
import ReviewsPage from "./pages/reviews/ReviewsPage";
import PlacePricingPage from "./pages/placePricing/PlacePricingPage";
import PlaceOpeningHoursPage from "./pages/placeOpeningHours/PlaceOpeningHoursPage";
import ProviderMembershipPage from "./pages/providerMembership/ProviderMembershipPage";
import DevicesPage from "./pages/devices/DevicesPage";

const adminRoutes = [
  {
    path: "/admin-panel",
    element: <Layout role="admin" />,
    children: [
      {
        index: true,
        element: <AdminDashboard />,
      },
      {
        path: "devices",
        element: <DevicesPage />,
      },
      {
        path: "users",
        element: <UsersPage />,
      },
      {
        path: "providers",
        element: <ProvidersPage />,
      },
      {
        path: "places",
        element: <PlacesPage />,
      },
      {
        path: "countries",
        element: <CountriesPage />,
      },
      {
        path: "cities",
        element: <CitiesPage />,
      },
      {
        path: "currencies",
        element: <CurrenciesPage />,
      },
      {
        path: "tags",
        element: <TagsPage />,
      },
      {
        path: "events",
        element: <EventsPage />,
      },
      {
        path: "reviews",
        element: <ReviewsPage />,
      },
      {
        path: "place-pricing",
        element: <PlacePricingPage />,
      },
      {
        path: "place-opening-hours",
        element: <PlaceOpeningHoursPage />,
      },
      {
        path: "provider-membership",
        element: <ProviderMembershipPage />,
      },
    ],
  },
];

export default adminRoutes;

