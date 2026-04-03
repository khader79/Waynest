import { get } from "@/api/request";
import { ROUTES } from "@/api/routes";

export const fetchPublicUserCard = async (usernameOrLegacyId) =>
  get(ROUTES.public.user(usernameOrLegacyId));

export const fetchPublicProviderBySlug = async (slug) =>
  get(ROUTES.public.providerBySlug(slug));

/** Slug or provider UUID — places, upcoming events, stats, reviews */
export const fetchPublicProviderProfile = async (slugOrId) =>
  get(ROUTES.public.providerProfile(slugOrId));

export const globalSearch = async (q, limit = 12) =>
  get(ROUTES.search.global(q.trim(), undefined, limit));
