import Dashboard from "./pages/dashboard/Dashboard";
import Profile from "./pages/profile/Profile";
import Bookings from "./pages/bookings/Bookings";
import Wishlist from "./pages/wishlist/Wishlist";
import GeoTables from "./pages/geo/GeoTables";
import Layout from "../../ui/layout/Layout";
import { TripPlanner } from "@/features/trips";

const userRoutes = [
  {
    path: "/user-panel",
    element: <Layout role="user" />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: "profile/:name",
        element: <Profile />,
      },
      {
        path: "profile",
        element: <Profile />,
      },
      {
        path: "bookings",
        element: <Bookings />,
      },
      {
        path: "wishlist",
        element: <Wishlist />,
      },
      {
        path: "geo",
        element: <GeoTables />,
      },
      {
        path: "trip-planner",
        element: <TripPlanner />,
      },
    ],
  },
];

export default userRoutes;
