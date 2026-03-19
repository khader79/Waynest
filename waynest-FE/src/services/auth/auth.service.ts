import {
  get,
  post,
  postJson,
  postNoBody,
} from "@/services/http/apiService";
import { AUTH_ENDPOINTS } from "@/services/http/endpoints";

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: "ADMIN" | "USER" | "PROVIDER";
  exp: number;
  username: string;
}

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
}

export interface InviteLinkResponse {
  token: string;
  expiresAt: string;
}

export const loginWithCredentials = async (payload: LoginPayload) =>
  post(AUTH_ENDPOINTS.LOGIN, payload.identifier, payload.password);

export const registerUser = async (payload: RegisterPayload) =>
  postJson(AUTH_ENDPOINTS.SIGNUP, payload);

export const fetchAuthenticatedUser = async () =>
  (await get(AUTH_ENDPOINTS.getPayload)) as AuthenticatedUser;

export const logoutCurrentUser = async () => postNoBody(AUTH_ENDPOINTS.LOGOUT);

export const createInviteLink = async () =>
  (await postNoBody(AUTH_ENDPOINTS.INVITE_CREATE)) as InviteLinkResponse;

export const activateInviteLink = async (token: string) =>
  postJson(AUTH_ENDPOINTS.INVITE_JOIN, { token });
