import { get, postJson } from "@/api/request";
import { ROUTES } from "@/api/routes";

export const submitProviderApplication = async (payload) =>
  postJson(ROUTES.providerApplications.create, payload);

export const fetchMyProviderApplication = async () =>
  get(ROUTES.providerApplications.me);

export const fetchProviderApplicationsAdmin = async () =>
  get(ROUTES.providerApplications.list);

export const approveProviderApplication = async (id) =>
  postJson(ROUTES.providerApplications.approve(id), {});

export const rejectProviderApplication = async (id, payload = {}) =>
  postJson(ROUTES.providerApplications.reject(id), payload);
