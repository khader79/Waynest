import type { User } from "@/core/providers/AuthContext";

export const getDefaultDashboardPath = (role?: User["role"]) => {
  switch (role) {
    case "ADMIN":
      return "/admin-panel";
    case "PROVIDER":
      return "/provider-panel";
    default:
      return "/user-panel";
  }
};
