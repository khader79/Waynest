import { STORAGE_KEYS } from "@/utils/storageKeys";

function keyForUser(userId) {
  return `${STORAGE_KEYS.activeWorkspacePrefix}${userId}`;
}

/**
 * @returns {"personal" | "provider" | null}
 */
export function getActiveWorkspace(userId) {
  if (!userId || typeof userId !== "string") {
    return null;
  }
  try {
    const v = localStorage.getItem(keyForUser(userId));
    if (v === "personal" || v === "provider") {
      return v;
    }
    return null;
  } catch {
    return null;
  }
}

export function setActiveWorkspace(userId, workspace) {
  if (!userId || typeof userId !== "string") {
    return;
  }
  if (workspace !== "personal" && workspace !== "provider") {
    return;
  }
  try {
    localStorage.setItem(keyForUser(userId), workspace);
  } catch {
    /* ignore */
  }
}

export function clearActiveWorkspace(userId) {
  if (!userId || typeof userId !== "string") {
    return;
  }
  try {
    localStorage.removeItem(keyForUser(userId));
  } catch {
    /* ignore */
  }
}

/** Provider panel routes (/account/...) — blocked while workspace is "personal". */
export function isPathProviderPanelPath(pathname) {
  return pathname.startsWith("/account");
}

/** Routes a provider may open while in business workspace (not personal feed). */
export function isPathAllowedInProviderWorkspace(pathname) {
  if (pathname.startsWith("/account")) {
    return true;
  }
  if (pathname === "/choose-account") {
    return true;
  }
  if (pathname.startsWith("/p/") || pathname.startsWith("/provider/")) {
    return true;
  }
  return false;
}
