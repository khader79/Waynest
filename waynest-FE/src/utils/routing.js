export const getDefaultDashboardPath = (role) => {
  switch (role) {
    case "ADMIN":
      return "/admin-panel";
    case "PROVIDER":
      return "/account/provider";
    case "USER":
      return "/dashboard";
    default:
      return "/";
  }
};
