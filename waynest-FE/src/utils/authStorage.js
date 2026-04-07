import { STORAGE_KEYS } from "@/utils/storageKeys";
import { clearProviderModeChosen } from "@/utils/providerModeStorage";
import { clearActiveWorkspace } from "@/utils/activeWorkspaceStorage";

/** Clears token, cached user, and provider account-mode flag for that user. */
export function clearStoredSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.authUser);
    if (raw) {
      const u = JSON.parse(raw);
      if (u?.id) {
        clearProviderModeChosen(u.id);
        clearActiveWorkspace(u.id);
      }
    }
  } catch {
    /* ignore */
  }
  // Remove standard auth keys
  try {
    localStorage.removeItem(STORAGE_KEYS.authToken);
    localStorage.removeItem(STORAGE_KEYS.authUser);
  } catch {}

  // Remove known app-related keys (trip planner, pending auth, guest token, UI state)
  const optionalKeys = [
    STORAGE_KEYS.pendingLoginCredentials,
    STORAGE_KEYS.pendingAuthRedirect,
    STORAGE_KEYS.pendingTripGeneration,
    STORAGE_KEYS.tripPlannerForm,
    STORAGE_KEYS.tripPlannerResult,
    STORAGE_KEYS.tripPlannerRemixDraft,
    STORAGE_KEYS.guestTripToken,
    // UI/local keys not in STORAGE_KEYS but used across the app
    "waynest-nav-float-dismissed",
    "waynest-theme",
  ];

  try {
    optionalKeys.forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch {}
    });
  } catch {}

  // Remove any keys that start with known prefixes (per-user flags)
  try {
    const prefixes = [
      STORAGE_KEYS.providerModeDonePrefix,
      STORAGE_KEYS.activeWorkspacePrefix,
      "waynest_",
      "trip_planner",
    ];
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (prefixes.some((p) => key.startsWith(p))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch {}
    });
  } catch {}
}
