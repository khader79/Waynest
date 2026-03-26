import { get } from "@/api/request";
import { ROUTES } from "@/api/routes";

export const fetchPublicUserCard = async (usernameOrLegacyId) =>
  get(ROUTES.public.user(usernameOrLegacyId));

export const fetchPublicProviderBySlug = async (slug) =>
  get(ROUTES.public.providerBySlug(slug));

export const globalSearch = async (q, limit = 12) =>
  get(ROUTES.search.global(q.trim(), undefined, limit));
