import { STORAGE_KEYS } from "@/utils/storageKeys";
import { postJson } from "@/api/request";
import { ROUTES } from "@/api/routes";

const readStoredUser = () => {
  try {
    const serializedUser = localStorage.getItem(STORAGE_KEYS.authUser);
    return serializedUser ? JSON.parse(serializedUser) : null;
  } catch {
    return null;
  }
};

const persistSession = (payload) => {
  const token = payload?.access_token ?? null;
  const user = payload?.user ?? null;

  if (token) {
    localStorage.setItem(STORAGE_KEYS.authToken, token);
  } else {
    localStorage.removeItem(STORAGE_KEYS.authToken);
  }

  if (user) {
    localStorage.setItem(STORAGE_KEYS.authUser, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEYS.authUser);
  }

  return user;
};

export const fetchAuthenticatedUser = async () => readStoredUser();

export const loginWithCredentials = async (payload) => {
  const response = await postJson(ROUTES.auth.login, payload);
  persistSession(response);
  return response;
};

export const registerUser = async (payload) => postJson(ROUTES.auth.register, payload);

export const logoutCurrentUser = async () => {
  localStorage.removeItem(STORAGE_KEYS.authToken);
  localStorage.removeItem(STORAGE_KEYS.authUser);
  window.dispatchEvent(new CustomEvent("auth:logout"));
};

export const createInviteLink = async () => postJson(ROUTES.auth.createInvite, {});

export const activateInviteLink = async (token) =>
  postJson(ROUTES.auth.activateInvite, { token });

export const verifyEmailCode = async (code) =>
  postJson(ROUTES.auth.verifyEmail, { code });

export const resendEmailVerificationCode = async (identifier) =>
  postJson(ROUTES.auth.resendVerification, { identifier });
