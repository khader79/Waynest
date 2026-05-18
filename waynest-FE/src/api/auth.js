import { STORAGE_KEYS } from "@/utils/storageKeys";
import { clearStoredSession } from "@/utils/authStorage";
import { get, postJson } from "@/api/request";
import { ROUTES } from "@/api/routes";
import { warmProviderProfileCache } from "@/api/provider";

export { clearStoredSession };

const normalizeAuthenticatedUser = (payload) => {
  if (
    !payload ||
    typeof payload !== "object" ||
    typeof payload.id !== "string"
  ) {
    return null;
  }

  return {
    id: payload.id,
    email: typeof payload.email === "string" ? payload.email : "",
    username: typeof payload.username === "string" ? payload.username : "",
    role: typeof payload.role === "string" ? payload.role : "",
    firstName: typeof payload.firstName === "string" ? payload.firstName : "",
    lastName: typeof payload.lastName === "string" ? payload.lastName : "",
    avatarUrl: typeof payload.avatarUrl === "string" ? payload.avatarUrl : null,
    phone: typeof payload.phone === "string" ? payload.phone : null,
    preferredLanguage:
      typeof payload.preferredLanguage === "string"
        ? payload.preferredLanguage
        : undefined,
    isEmailVerified:
      typeof payload.isEmailVerified === "boolean"
        ? payload.isEmailVerified
        : undefined,
    isPhoneVerified:
      typeof payload.isPhoneVerified === "boolean"
        ? payload.isPhoneVerified
        : undefined,
  };
};

const persistSession = (payload) => {
  const user = normalizeAuthenticatedUser(payload?.user);

  if (user) {
    localStorage.setItem(STORAGE_KEYS.authUser, JSON.stringify(user));
    if (user.role === "PROVIDER") {
      warmProviderProfileCache();
    }
  } else {
    localStorage.removeItem(STORAGE_KEYS.authUser);
  }

  return user;
};

const persistAuthenticatedUser = (userPayload) => {
  const user = normalizeAuthenticatedUser(userPayload);
  if (!user) {
    localStorage.removeItem(STORAGE_KEYS.authUser);
    return null;
  }

  localStorage.setItem(STORAGE_KEYS.authUser, JSON.stringify(user));
  if (user.role === "PROVIDER") {
    warmProviderProfileCache();
  }
  return user;
};

export const fetchAuthenticatedUser = async () => {
  try {
    const response = await get(ROUTES.users.me);
    return persistAuthenticatedUser(response);
  } catch {
    clearStoredSession();
    return null;
  }
};

export const loginWithCredentials = async (payload) => {
  const response = await postJson(ROUTES.auth.login, payload);
  persistSession(response);
  return response;
};

export const registerUser = async (payload) =>
  postJson(ROUTES.auth.register, payload);

export const logoutCurrentUser = async () => {
  clearStoredSession();
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("auth:logout"));
      // Replace current location so back button doesn't return to authenticated pages
      try {
        window.location.replace("/login");
      } catch {
        // fallback
        window.location.href = "/login";
      }
    }
  } catch {
    /* ignore */
  }
};

export const createInviteLink = async () =>
  postJson(ROUTES.auth.createInvite, {});

export const activateInviteLink = async (token) =>
  postJson(ROUTES.auth.activateInvite, { token });

export const verifyEmailCode = async (code) =>
  postJson(ROUTES.auth.verifyEmail, { code });

export const resendEmailVerificationCode = async (identifier) =>
  postJson(ROUTES.auth.resendVerification, { identifier });
