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
  localStorage.removeItem(STORAGE_KEYS.authToken);
  localStorage.removeItem(STORAGE_KEYS.authUser);
}
