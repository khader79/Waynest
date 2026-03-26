import api from './api';

export interface City {
  id: string;
  name: string;
  country: string;
  description: string;
  image: string;
  currency: string;
  language: string;
}

export interface Place {
  id: string;
  name: string;
  description: string;
  cityId: string;
  type: string;
  price: number;
  rating: number;
  image: string;
  openingHours: any;
}

export const catalogApi = {
  getCities: () => api.get<City[]>('/catalog/cities'),
  getCity: (id: string) => api.get<City>(`/catalog/cities/${id}`),
  getPlaces: (cityId: string) => api.get<Place[]>(`/catalog/places?cityId=${cityId}`),
  getPlace: (id: string) => api.get<Place>(`/catalog/places/${id}`),
};