export type PlaceType =
  | "HOTEL"
  | "RESTAURANT"
  | "ACTIVITY"
  | "TOUR"
  | "LANDMARK"
  | "CAFE"
  | "PARK"
  | "SHOP";

export type CurrencySymbol = {
  grapheme: string;
  template: string;
  rtl: boolean;
};

export type CatalogCurrency = {
  id: string;
  code: string;
  name?: string | null;
  fractionSize?: number | null;
  symbol?: CurrencySymbol | null;
  uniqSymbol?: string | null;
};

export type CatalogCountry = {
  id: string;
  name: string;
  nativeName?: string | null;
  alpha2Code: string;
  alpha3Code: string;
  numericCode?: string | null;
  region?: string | null;
  subregion?: string | null;
  capital?: string | null;
  population?: number | null;
  area?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  flagUrl?: string | null;
  independent: boolean;
  callingCodes?: string[] | null;
};

export type CatalogCity = {
  id: string;
  name: string;
  stateName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  population?: number | null;
  countryId?: string | null;
  country?: {
    id?: string;
    name?: string | null;
    alpha2Code?: string | null;
    alpha3Code?: string | null;
  } | null;
};
