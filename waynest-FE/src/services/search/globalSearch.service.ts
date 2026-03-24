import { get } from "@/services/http/apiService";
import { SEARCH_ENDPOINTS } from "@/services/http/endpoints";

export type SearchHit = {
  type: "user" | "provider" | "place" | "event" | string;
  title: string;
  subtitle: string | null;
  href: string;
  imageUrl?: string | null;
  cityId?: string | null;
};

export const globalSearch = async (q: string, limit = 12) =>
  get<{ items: SearchHit[] }>(SEARCH_ENDPOINTS.GLOBAL(q.trim(), undefined, limit));
