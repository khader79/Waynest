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
  ],
};

export default panelsLinks;
