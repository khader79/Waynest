export type Role = "user" | "provider" | "admin";

type SidebarLink = {
  name: string;
  path: string;
};

const panelsLinks: Record<Role, SidebarLink[]> = {
  user: [
    { name: "Dashboard", path: "/user-panel" },
    { name: "Profile", path: "/user-panel/profile/" },
    { name: "Bookings", path: "/user-panel/bookings" },
    { name: "Wishlist", path: "/user-panel/wishlist" },
    { name: "Geo Data", path: "/user-panel/geo" },
  ],
  provider: [
    { name: "Dashboard", path: "/provider-panel" },
    { name: "Profile", path: "/provider-panel/profile" },
    { name: "My Places", path: "/provider-panel/places" },
    { name: "Bookings", path: "/provider-panel/bookings" },
  ],
  admin: [
    { name: "Dashboard", path: "/admin-panel" },
    { name: "Users", path: "/admin-panel/users" },
    { name: "Providers", path: "/admin-panel/providers" },
    { name: "Places", path: "/admin-panel/places" },
    { name: "Countries", path: "/admin-panel/countries" },
    { name: "Cities", path: "/admin-panel/cities" },
    { name: "Currencies", path: "/admin-panel/currencies" },
    { name: "Tags", path: "/admin-panel/tags" },
    { name: "Events", path: "/admin-panel/events" },
    { name: "Reviews", path: "/admin-panel/reviews" },
    { name: "Place Pricing", path: "/admin-panel/place-pricing" },
    { name: "Opening Hours", path: "/admin-panel/place-opening-hours" },
    { name: "Provider Membership", path: "/admin-panel/provider-membership" },
  ],
};

export default panelsLinks;
