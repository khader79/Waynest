import { del, get, patch, postJson } from "@/services/http/apiService";
import { ADMIN_ENDPOINTS } from "@/services/http/endpoints";

type CrudListPath<TQuery> = string | ((query: TQuery) => string);

type DevicesAdminResponse = {
  devices: string[];
};

type CrudConfig<TQuery> = {
  createPath?: string;
  deletePath: (id: string) => string;
  listPath: CrudListPath<TQuery>;
  updatePath: (id: string) => string;
};

const resolvePath = <TQuery,>(path: CrudListPath<TQuery>, query?: TQuery) =>
  typeof path === "function" ? path(query as TQuery) : path;

const createCrudService = <TQuery = void,>() => {
  return <TCreate, TUpdate = TCreate>(config: CrudConfig<TQuery>) => ({
    list: async (query?: TQuery) => get(resolvePath(config.listPath, query)),
    create: async (payload: TCreate) => {
      if (!config.createPath) {
        throw new Error("Create operation is not configured for this resource.");
      }

      return postJson(config.createPath, payload);
    },
    update: async (id: string, payload: TUpdate) =>
      patch(config.updatePath(id), payload),
    remove: async (id: string) => del(config.deletePath(id)),
  });
};

const createSimpleCrudService = createCrudService<void>();

export const usersAdminService = createSimpleCrudService({
  listPath: ADMIN_ENDPOINTS.USERS_LIST,
  createPath: ADMIN_ENDPOINTS.USERS_CREATE,
  updatePath: ADMIN_ENDPOINTS.USERS_UPDATE,
  deletePath: ADMIN_ENDPOINTS.USERS_DELETE,
});

export const providersAdminService = createSimpleCrudService({
  listPath: ADMIN_ENDPOINTS.PROVIDERS_LIST,
  updatePath: ADMIN_ENDPOINTS.PROVIDERS_UPDATE,
  deletePath: ADMIN_ENDPOINTS.PROVIDERS_DELETE,
});

export const placesAdminService = createSimpleCrudService({
  listPath: ADMIN_ENDPOINTS.PLACES_LIST,
  createPath: ADMIN_ENDPOINTS.PLACES_CREATE,
  updatePath: ADMIN_ENDPOINTS.PLACES_UPDATE,
  deletePath: ADMIN_ENDPOINTS.PLACES_DELETE,
});

export const countriesAdminService = createCrudService<{
  page: number;
  pageSize: number;
}>()({
  listPath: ({ page, pageSize }) => ADMIN_ENDPOINTS.COUNTRIES_LIST(page, pageSize),
  createPath: ADMIN_ENDPOINTS.COUNTRIES_CREATE,
  updatePath: ADMIN_ENDPOINTS.COUNTRIES_UPDATE,
  deletePath: ADMIN_ENDPOINTS.COUNTRIES_DELETE,
});

export const citiesAdminService = createCrudService<{
  page: number;
  pageSize?: number;
}>()({
  listPath: ({ page, pageSize }) => ADMIN_ENDPOINTS.CITIES_LIST(page, pageSize),
  createPath: ADMIN_ENDPOINTS.CITIES_CREATE,
  updatePath: ADMIN_ENDPOINTS.CITIES_UPDATE,
  deletePath: ADMIN_ENDPOINTS.CITIES_DELETE,
});

export const currenciesAdminService = createSimpleCrudService({
  listPath: ADMIN_ENDPOINTS.CURRENCIES_LIST,
  createPath: ADMIN_ENDPOINTS.CURRENCIES_CREATE,
  updatePath: ADMIN_ENDPOINTS.CURRENCIES_UPDATE,
  deletePath: ADMIN_ENDPOINTS.CURRENCIES_DELETE,
});

export const tagsAdminService = createSimpleCrudService({
  listPath: ADMIN_ENDPOINTS.TAGS_LIST,
  createPath: ADMIN_ENDPOINTS.TAGS_CREATE,
  updatePath: ADMIN_ENDPOINTS.TAGS_UPDATE,
  deletePath: ADMIN_ENDPOINTS.TAGS_DELETE,
});

export const eventsAdminService = createSimpleCrudService({
  listPath: ADMIN_ENDPOINTS.EVENTS_LIST,
  createPath: ADMIN_ENDPOINTS.EVENTS_CREATE,
  updatePath: ADMIN_ENDPOINTS.EVENTS_UPDATE,
  deletePath: ADMIN_ENDPOINTS.EVENTS_DELETE,
});

export const reviewsAdminService = createSimpleCrudService({
  listPath: ADMIN_ENDPOINTS.REVIEWS_LIST,
  createPath: ADMIN_ENDPOINTS.REVIEWS_CREATE,
  updatePath: ADMIN_ENDPOINTS.REVIEWS_UPDATE,
  deletePath: ADMIN_ENDPOINTS.REVIEWS_DELETE,
});

export const placePricingAdminService = createSimpleCrudService({
  listPath: ADMIN_ENDPOINTS.PLACE_PRICING_LIST,
  createPath: ADMIN_ENDPOINTS.PLACE_PRICING_CREATE,
  updatePath: ADMIN_ENDPOINTS.PLACE_PRICING_UPDATE,
  deletePath: ADMIN_ENDPOINTS.PLACE_PRICING_DELETE,
});

export const placeOpeningHoursAdminService = createSimpleCrudService({
  listPath: ADMIN_ENDPOINTS.PLACE_OPENING_HOURS_LIST,
  createPath: ADMIN_ENDPOINTS.PLACE_OPENING_HOURS_CREATE,
  updatePath: ADMIN_ENDPOINTS.PLACE_OPENING_HOURS_UPDATE,
  deletePath: ADMIN_ENDPOINTS.PLACE_OPENING_HOURS_DELETE,
});

export const providerMembershipAdminService = createSimpleCrudService({
  listPath: ADMIN_ENDPOINTS.PROVIDER_MEMBERSHIP_LIST,
  createPath: ADMIN_ENDPOINTS.PROVIDER_MEMBERSHIP_CREATE,
  updatePath: ADMIN_ENDPOINTS.PROVIDER_MEMBERSHIP_UPDATE,
  deletePath: ADMIN_ENDPOINTS.PROVIDER_MEMBERSHIP_DELETE,
});

export const devicesAdminService = {
  add: async (fingerprint: string) =>
    postJson<DevicesAdminResponse, { fingerprint: string }>(
      ADMIN_ENDPOINTS.ADMIN_DEVICES_ADD,
      { fingerprint },
    ),
  list: async () => get<DevicesAdminResponse>(ADMIN_ENDPOINTS.ADMIN_DEVICES_LIST),
  remove: async (fingerprint: string) =>
    del<DevicesAdminResponse, { fingerprint: string }>(
      ADMIN_ENDPOINTS.ADMIN_DEVICES_DELETE,
      { fingerprint },
    ),
};

export const adminDashboardService = {
  fetchSummary: async () => {
    const [users, providers, places, reviews] = await Promise.all([
      get(ADMIN_ENDPOINTS.USERS_LIST),
      get(ADMIN_ENDPOINTS.PROVIDERS_LIST),
      get(ADMIN_ENDPOINTS.PLACES_LIST),
      get(ADMIN_ENDPOINTS.REVIEWS_LIST),
    ]);

    return {
      users,
      providers,
      places,
      reviews,
    };
  },
};
