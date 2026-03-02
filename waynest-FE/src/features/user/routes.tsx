import { ProtectedRoute } from "../../routes/ProtectedRoutes";
import UserLayout from "./UserLayout";
import Dashboard from "./pages/dashboard/Dashboard";
import Profile from "./pages/profile/Profile";
import Bookings from "./pages/bookings/Bookings";
import Wishlist from "./pages/wishlist/Wishlist";

const userRoutes = [
  {
    path: "/user-panel",
    element: (
      <ProtectedRoute roleRequired="USER">
        <UserLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Dashboard />,
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
    ],
  },
];

export default userRoutes;
