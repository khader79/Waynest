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
    accounts: Array.isArray(payload.accounts)
      ? payload.accounts
          .filter(
            (account) =>
              account &&
              typeof account === "object" &&
              typeof account.type === "string" &&
              typeof account.id === "string" &&
              typeof account.label === "string" &&
              typeof account.path === "string",
          )
          .map((account) => ({
            type: account.type,
            id: account.id,
            label: account.label,
            path: account.path,
            slug: typeof account.slug === "string" ? account.slug : null,
            logoUrl:
              typeof account.logoUrl === "string" ? account.logoUrl : null,
            coverPhotoUrl:
              typeof account.coverPhotoUrl === "string"
                ? account.coverPhotoUrl
                : null,
          }))
      : [],
  };
};

const persistSession = (payload) => {
  const user = normalizeAuthenticatedUser(payload?.user);
  const token = payload?.access_token ?? payload?.token ?? null;

  if (token) {
    localStorage.setItem(STORAGE_KEYS.authToken, token);
  } else {
    localStorage.removeItem(STORAGE_KEYS.authToken);
  }

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
