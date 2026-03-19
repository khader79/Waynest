import { get } from "@/services/http/apiService";
import { ADMIN_ENDPOINTS, GENERAL_ENDPOINTS } from "@/services/http/endpoints";

export const fetchPublicPlaces = async () => get(GENERAL_ENDPOINTS.PLACE);

export const fetchCountries = async (page = 1, pageSize = 10) =>
  get(ADMIN_ENDPOINTS.COUNTRIES_LIST(page, pageSize));

export const fetchCities = async (page = 1) =>
  get(ADMIN_ENDPOINTS.CITIES_LIST(page));

export const fetchCurrencies = async () => get(ADMIN_ENDPOINTS.CURRENCIES_LIST);

export const fetchTags = async () => get(ADMIN_ENDPOINTS.TAGS_LIST);
