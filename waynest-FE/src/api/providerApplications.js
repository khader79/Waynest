import { get, postJson } from "@/api/request";
import { ROUTES } from "@/api/routes";

export const submitProviderApplication = async (payload) =>
  postJson(ROUTES.providers.applications.submit, payload);

export const fetchMyProviderApplication = async () =>
  get(ROUTES.providers.applications.me);

export const fetchProviderApplicationsAdmin = async () =>
  get(ROUTES.providers.applications.list);

export const approveProviderApplication = async (id) =>
  postJson(ROUTES.providers.applications.approve(id), {});

export const rejectProviderApplication = async (id, payload = {}) =>
  postJson(ROUTES.providers.applications.reject(id), payload);
