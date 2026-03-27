import { get } from "@/api/request";

export const fetchPublicPlaces = async (limit = 18) =>
  get(`/place?page=1&limit=${limit}`);

export const fetchPlaceById = async (id) => get(`/place/${id}`);

export const fetchPublicEvents = async (limit = 18) =>
  get(`/events?page=1&limit=${limit}`);

export const fetchEventById = async (id) => get(`/events/${id}`);

export const fetchAllCountries = async (limit = 1000) =>
  get(`/countries?page=1&limit=${limit}`);

export const fetchAllCities = async (limit = 1000) =>
  get(`/cities?page=1&limit=${limit}`);

export const fetchAllCurrencies = async (limit = 1000) =>
  get(`/currencies?page=1&limit=${limit}`);

export const fetchCitiesByCountry = async (countryId) =>
  get(`/cities/by-country/${countryId}`);

export const fetchCityById = async (cityId) => get(`/cities/${cityId}`);
export const fetchTags = async () => get("/tag");
