const panelsLinks = {
  provider: [
    { type: "section", labelKey: "provider.sidebar.sectionOverview" },
    {
      type: "link",
      name: "Feed",
      path: "/account/provider",
      labelKey: "provider.sidebar.feed",
      icon: "home",
      end: true,
    },
    {
      type: "link",
      name: "Create Post",
      path: "/account/provider/create-post",
      labelKey: "provider.sidebar.createPost",
      icon: "post",
    },
    { type: "section", labelKey: "provider.sidebar.sectionOperations" },
    {
      type: "link",
      name: "My Places",
      path: "/account/provider/places",
      labelKey: "provider.sidebar.myPlaces",
      icon: "store",
    },
    {
      type: "link",
      name: "Events",
      path: "/account/provider/events",
      labelKey: "provider.sidebar.events",
      icon: "calendar",
    },
    {
      type: "link",
      name: "Bookings",
      path: "/account/provider/bookings",
      labelKey: "provider.sidebar.bookings",
      icon: "event",
    },
    {
      type: "reviews",
      name: "Guest reviews",
      labelKey: "provider.sidebar.reviews",
      icon: "reviews",
    },
    { type: "section", labelKey: "provider.sidebar.sectionPresence" },
    {
      type: "publicPage",
      labelKey: "provider.sidebar.publicPage",
      icon: "public",
    },
    { type: "section", labelKey: "provider.sidebar.sectionAccount" },
    {
      type: "link",
      name: "Settings",
      path: "/account/provider/settings",
      labelKey: "provider.sidebar.businessSettings",
      icon: "settings",
    },
  ],

  admin: [
    {
      name: "Dashboard",
      path: "/admin-panel",
      labelKey: "admin.sidebar.dashboard",
    },
    {
      name: "Devices",
      path: "/admin-panel/devices",
      labelKey: "admin.sidebar.devices",
    },
    {
      name: "Users",
      path: "/admin-panel/users",
      labelKey: "admin.sidebar.users",
    },
    {
      name: "Providers",
      path: "/admin-panel/providers",
      labelKey: "admin.sidebar.providers",
    },
    {
      name: "Places",
      path: "/admin-panel/places",
      labelKey: "admin.sidebar.places",
    },
    {
      name: "Countries",
      path: "/admin-panel/countries",
      labelKey: "admin.sidebar.countries",
    },
    {
      name: "Cities",
      path: "/admin-panel/cities",
      labelKey: "admin.sidebar.cities",
    },
    {
      name: "Currencies",
      path: "/admin-panel/currencies",
      labelKey: "admin.sidebar.currencies",
    },
    { name: "Tags", path: "/admin-panel/tags", labelKey: "admin.sidebar.tags" },
    {
      name: "Events",
      path: "/admin-panel/events",
      labelKey: "admin.sidebar.events",
    },
    {
      name: "Reviews",
      path: "/admin-panel/reviews",
      labelKey: "admin.sidebar.reviews",
    },
    {
      name: "Place Pricing",
      path: "/admin-panel/place-pricing",
      labelKey: "admin.sidebar.placePricing",
    },
    {
      name: "Opening Hours",
      path: "/admin-panel/place-opening-hours",
      labelKey: "admin.sidebar.openingHours",
    },
    {
      name: "Provider Membership",
      path: "/admin-panel/provider-membership",
      labelKey: "admin.sidebar.providerMembership",
    },
    {
      name: "Provider Applications",
      path: "/admin-panel/provider-applications",
      labelKey: "admin.sidebar.providerApplications",
    },
  ],
};

export default panelsLinks;
