import ProviderLayout from "./ProviderLayout";
import ProviderDashboard from "./pages/dashboard/ProviderDashboard";
import ProviderProfile from "./pages/profile/ProviderProfile";
import ProviderPlaces from "./pages/places/ProviderPlaces";
import ProviderBookings from "./pages/bookings/ProviderBookings";

const providerRoutes = [
  {
    path: "/provider-panel",
    element: <ProviderLayout />,
    children: [
      {
        index: true,
        element: <ProviderDashboard />,
      },
      {
        path: "profile",
        element: <ProviderProfile />,
      },
      {
        path: "places",
        element: <ProviderPlaces />,
      },
      {
        path: "bookings",
        element: <ProviderBookings />,
      },
    ],
  },
];

export default providerRoutes;
