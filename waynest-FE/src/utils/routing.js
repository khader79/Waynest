export const getDefaultDashboardPath = (role) => {
  switch (role) {
    case "ADMIN":
      return "/admin-panel";
    case "PROVIDER":
      return "/provider-panel";
    case "USER":
      return "/user-panel";
    default:
      return "/";
  }
};
