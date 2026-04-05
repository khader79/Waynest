import { STORAGE_KEYS } from "@/utils/storageKeys";

function keyForUser(userId) {
  return `${STORAGE_KEYS.providerModeDonePrefix}${userId}`;
}

export function hasProviderModeChosen(userId) {
  if (!userId || typeof userId !== "string") {
    return false;
  }
  try {
    return localStorage.getItem(keyForUser(userId)) === "1";
  } catch {
    return false;
  }
}

export function setProviderModeChosen(userId) {
  if (!userId || typeof userId !== "string") {
    return;
  }
  try {
    localStorage.setItem(keyForUser(userId), "1");
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearProviderModeChosen(userId) {
  if (!userId || typeof userId !== "string") {
    return;
  }
  try {
    localStorage.removeItem(keyForUser(userId));
  } catch {
    /* ignore */
  }
}
