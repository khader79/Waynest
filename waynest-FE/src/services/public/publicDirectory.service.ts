import { get } from "@/services/http/apiService";
import { PUBLIC_ENDPOINTS, PROVIDERS_PUBLIC_ENDPOINTS } from "@/services/http/endpoints";

export type PublicUserCard = {
  username: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: string;
  providerSlug?: string | null;
};

export const fetchPublicUserCard = async (usernameOrLegacyId: string) =>
  get<PublicUserCard>(PUBLIC_ENDPOINTS.USER(usernameOrLegacyId));

export const fetchPublicProviderBySlug = async (slug: string) =>
  get<{
    id: string;
    slug: string;
    displayName: string;
    ownerUserId?: string | null;
    city?: { name?: string };
  }>(PROVIDERS_PUBLIC_ENDPOINTS.BY_SLUG(slug));
