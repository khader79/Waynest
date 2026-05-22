export const getDefaultDashboardPath = (role) => {
  switch (role) {
    case "ADMIN":
      return "/admin-panel";
    case "PROVIDER":
      return "/account/provider";
    case "USER":
      return "/";
    default:
      return "/";
  }
};

export function hasProviderAccount(user) {
  return Array.isArray(user?.accounts)
    ? user.accounts.some((account) => account?.type === "provider")
    : false;
}

/** Traveler default when opening the app as a provider user (not the business panel). */
export function resolvePersonalPathFromRedirect(redirectTo) {
  const safe = safeInternalPath(redirectTo);
  if (safe && safe.startsWith("/account/provider")) {
    return getDefaultDashboardPath("USER");
  }
  if (safe) {
    return safe;
  }
  return getDefaultDashboardPath("USER");
}

/** Blocks open redirects like `//evil.com` or absolute URLs. */
export function safeInternalPath(path) {
  if (typeof path !== "string") {
    return null;
  }
  const p = path.trim();
  if (!p.startsWith("/") || p.startsWith("//")) {
    return null;
  }
  if (p.includes("://")) {
    return null;
  }
  return p;
}

/**
 * After login or post–email verification: provider users pick traveler vs business;
 * everyone else follows redirect or role default.
 */
export function navigateAfterAuth(navigate, user, redirectTo) {
  if (!user?.role) {
    const safe = safeInternalPath(redirectTo);
    navigate(safe ?? "/");
    return;
  }

  if (user.role === "ADMIN") {
    const safe = safeInternalPath(redirectTo);
    navigate(safe ?? getDefaultDashboardPath("ADMIN"));
    return;
  }

  if (hasProviderAccount(user)) {
    const safe = safeInternalPath(redirectTo);
    navigate("/choose-account", { state: { redirectTo: safe } });
    return;
  }

  const safe = safeInternalPath(redirectTo);
  navigate(safe ?? getDefaultDashboardPath("USER"));
}
