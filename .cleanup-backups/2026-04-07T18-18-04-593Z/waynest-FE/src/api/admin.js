import { del, get, patch, postJson } from "@/api/request";
import { ROUTES } from "@/api/routes";

const resolvePath = (path, query) => (typeof path === "function" ? path(query) : path);
const buildPaginatedPath = (path, page = 1, pageSize = 100) =>
  `${path}?page=${page}&limit=${pageSize}`;

const createCrud = (config) => ({
  cacheKey: config.cacheKey,
  list: async (query) => get(resolvePath(config.listPath, query)),
  create: async (payload) => {
    if (!config.createPath) {
      throw new Error("Create operation is not configured for this resource.");
    }

    return postJson(config.createPath, payload);
  },
  update: async (id, payload) => patch(config.updatePath(id), payload),
  remove: async (id) => del(config.deletePath(id)),
});

export const usersAdminService = createCrud({
  cacheKey: "users",
  listPath: ROUTES.admin.usersList,
  createPath: ROUTES.admin.usersCreate,
  updatePath: ROUTES.admin.usersUpdate,
  deletePath: ROUTES.admin.usersDelete,
});

export const providersAdminService = createCrud({
  cacheKey: "providers",
  listPath: ROUTES.admin.providersList,
  updatePath: ROUTES.admin.providersUpdate,
  deletePath: ROUTES.admin.providersDelete,
});

export const placesAdminService = createCrud({
  cacheKey: "places",
  listPath: ({ page = 1, pageSize = 100 } = {}) =>
    buildPaginatedPath(ROUTES.admin.placesList, page, pageSize),
  createPath: ROUTES.admin.placesCreate,
  updatePath: ROUTES.admin.placesUpdate,
  deletePath: ROUTES.admin.placesDelete,
});

export const countriesAdminService = createCrud({
  cacheKey: "countries",
  listPath: ({ page, pageSize } = {}) => ROUTES.admin.countriesList(page, pageSize),
  createPath: ROUTES.admin.countriesCreate,
  updatePath: ROUTES.admin.countriesUpdate,
  deletePath: ROUTES.admin.countriesDelete,
});

export const citiesAdminService = createCrud({
  cacheKey: "cities",
  listPath: ({ page, pageSize } = {}) => ROUTES.admin.citiesList(page, pageSize),
  createPath: ROUTES.admin.citiesCreate,
  updatePath: ROUTES.admin.citiesUpdate,
  deletePath: ROUTES.admin.citiesDelete,
});

export const currenciesAdminService = createCrud({
  cacheKey: "currencies",
  listPath: ROUTES.admin.currenciesList,
  createPath: ROUTES.admin.currenciesCreate,
  updatePath: ROUTES.admin.currenciesUpdate,
  deletePath: ROUTES.admin.currenciesDelete,
});

export const tagsAdminService = createCrud({
  cacheKey: "tags",
  listPath: ROUTES.admin.tagsList,
  createPath: ROUTES.admin.tagsCreate,
  updatePath: ROUTES.admin.tagsUpdate,
  deletePath: ROUTES.admin.tagsDelete,
});

export const eventsAdminService = createCrud({
  cacheKey: "events",
  listPath: ({ page = 1, pageSize = 100 } = {}) =>
    buildPaginatedPath(ROUTES.admin.eventsList, page, pageSize),
  createPath: ROUTES.admin.eventsCreate,
  updatePath: ROUTES.admin.eventsUpdate,
  deletePath: ROUTES.admin.eventsDelete,
});

export const reviewsAdminService = createCrud({
  cacheKey: "reviews",
  listPath: ROUTES.admin.reviewsList,
  createPath: ROUTES.admin.reviewsCreate,
  updatePath: ROUTES.admin.reviewsUpdate,
  deletePath: ROUTES.admin.reviewsDelete,
});

export const placePricingAdminService = createCrud({
  cacheKey: "placePricing",
  listPath: ROUTES.admin.placePricingList,
  createPath: ROUTES.admin.placePricingCreate,
  updatePath: ROUTES.admin.placePricingUpdate,
  deletePath: ROUTES.admin.placePricingDelete,
});

export const placeOpeningHoursAdminService = createCrud({
  cacheKey: "placeOpeningHours",
  listPath: ROUTES.admin.placeOpeningHoursList,
  createPath: ROUTES.admin.placeOpeningHoursCreate,
  updatePath: ROUTES.admin.placeOpeningHoursUpdate,
  deletePath: ROUTES.admin.placeOpeningHoursDelete,
});

export const providerMembershipAdminService = createCrud({
  cacheKey: "providerMembership",
  listPath: ROUTES.admin.providerMembershipList,
  createPath: ROUTES.admin.providerMembershipCreate,
  updatePath: ROUTES.admin.providerMembershipUpdate,
  deletePath: ROUTES.admin.providerMembershipDelete,
});

export const devicesAdminService = {
  add: async (fingerprint) => postJson(ROUTES.admin.devicesAdd, { fingerprint }),
  list: async () => get(ROUTES.admin.devicesList),
  remove: async (fingerprint) => del(ROUTES.admin.devicesDelete, { fingerprint }),
};

export const adminDashboardService = {
  fetchSummary: async () => {
    const [users, providers, places, reviews] = await Promise.all([
      get(ROUTES.admin.usersList),
      get(ROUTES.admin.providersList),
      get(ROUTES.admin.placesList),
      get(ROUTES.admin.reviewsList),
    ]);

    return { users, providers, places, reviews };
  },
};
