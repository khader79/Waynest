import { del, get, patch, postJson } from "@/api/request";
import { ROUTES } from "@/api/routes";

const resolvePath = (path, query) =>
  typeof path === "function" ? path(query) : path;
const buildPaginatedPath = (path, page = 1, pageSize = 10) =>
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
  listPath: ({ page = 1, pageSize = 10 } = {}) =>
    buildPaginatedPath(ROUTES.admin.users.list, page, pageSize),
  createPath: ROUTES.admin.users.create,
  updatePath: ROUTES.admin.users.update,
  deletePath: ROUTES.admin.users.delete,
});

export const providersAdminService = createCrud({
  cacheKey: "providers",
  listPath: ({ page = 1, pageSize = 10 } = {}) =>
    buildPaginatedPath(ROUTES.admin.providers.list, page, pageSize),
  updatePath: ROUTES.admin.providers.update,
  deletePath: ROUTES.admin.providers.delete,
});

export const placesAdminService = createCrud({
  cacheKey: "places",
  listPath: ({ page = 1, pageSize = 10 } = {}) =>
    buildPaginatedPath(ROUTES.admin.places.list, page, pageSize),
  createPath: ROUTES.admin.places.create,
  updatePath: ROUTES.admin.places.update,
  deletePath: ROUTES.admin.places.delete,
});

export const countriesAdminService = createCrud({
  cacheKey: "countries",
  listPath: ({ page = 1, pageSize = 10 } = {}) =>
    buildPaginatedPath(ROUTES.admin.countries.list, page, pageSize),
  createPath: ROUTES.admin.countries.create,
  updatePath: ROUTES.admin.countries.update,
  deletePath: ROUTES.admin.countries.delete,
});

export const citiesAdminService = createCrud({
  cacheKey: "cities",
  listPath: ({ page = 1, pageSize = 10 } = {}) =>
    buildPaginatedPath(ROUTES.admin.cities.list, page, pageSize),
  createPath: ROUTES.admin.cities.create,
  updatePath: ROUTES.admin.cities.update,
  deletePath: ROUTES.admin.cities.delete,
});

export const currenciesAdminService = createCrud({
  cacheKey: "currencies",
  listPath: ({ page = 1, pageSize = 10 } = {}) =>
    buildPaginatedPath(ROUTES.admin.currencies.list, page, pageSize),
  createPath: ROUTES.admin.currencies.create,
  updatePath: ROUTES.admin.currencies.update,
  deletePath: ROUTES.admin.currencies.delete,
});

export const tagsAdminService = createCrud({
  cacheKey: "tags",
  listPath: ({ page = 1, pageSize = 10 } = {}) =>
    buildPaginatedPath(ROUTES.admin.tags.list, page, pageSize),
  createPath: ROUTES.admin.tags.create,
  updatePath: ROUTES.admin.tags.update,
  deletePath: ROUTES.admin.tags.delete,
});

export const eventsAdminService = createCrud({
  cacheKey: "events",
  listPath: ({ page = 1, pageSize = 10 } = {}) =>
    buildPaginatedPath(ROUTES.admin.events.list, page, pageSize),
  createPath: ROUTES.admin.events.create,
  updatePath: ROUTES.admin.events.update,
  deletePath: ROUTES.admin.events.delete,
});

export const reviewsAdminService = createCrud({
  cacheKey: "reviews",
  listPath: ({ page = 1, pageSize = 10 } = {}) =>
    buildPaginatedPath(ROUTES.admin.reviews.list, page, pageSize),
  createPath: ROUTES.admin.reviews.create,
  updatePath: ROUTES.admin.reviews.update,
  deletePath: ROUTES.admin.reviews.delete,
});

export const placePricingAdminService = createCrud({
  cacheKey: "placePricing",
  listPath: ({ page = 1, pageSize = 10 } = {}) =>
    buildPaginatedPath(ROUTES.admin.placePricing.list, page, pageSize),
  createPath: ROUTES.admin.placePricing.create,
  updatePath: ROUTES.admin.placePricing.update,
  deletePath: ROUTES.admin.placePricing.delete,
});

export const placeOpeningHoursAdminService = createCrud({
  cacheKey: "placeOpeningHours",
  listPath: ({ page = 1, pageSize = 10 } = {}) =>
    buildPaginatedPath(ROUTES.admin.placeOpeningHours.list, page, pageSize),
  createPath: ROUTES.admin.placeOpeningHours.create,
  updatePath: ROUTES.admin.placeOpeningHours.update,
  deletePath: ROUTES.admin.placeOpeningHours.delete,
});

export const providerMembershipAdminService = createCrud({
  cacheKey: "providerMembership",
  listPath: ({ page = 1, pageSize = 10 } = {}) =>
    buildPaginatedPath(ROUTES.admin.providerMembership.list, page, pageSize),
  createPath: ROUTES.admin.providerMembership.create,
  updatePath: ROUTES.admin.providerMembership.update,
  deletePath: ROUTES.admin.providerMembership.delete,
});

export const devicesAdminService = {
  add: async (fingerprint) =>
    postJson(ROUTES.admin.devices.add, { fingerprint }),
  list: async () => get(ROUTES.admin.devices.list),
  remove: async (fingerprint) =>
    del(ROUTES.admin.devices.delete, { fingerprint }),
};

export const adminDashboardService = {
  fetchSummary: async () => {
    const [users, providers, places, reviews] = await Promise.all([
      get(ROUTES.admin.users.list),
      get(ROUTES.admin.providers.list),
      get(ROUTES.admin.places.list),
      get(ROUTES.admin.reviews.list),
    ]);

    return { users, providers, places, reviews };
  },
  fetchStats: async () => get(ROUTES.admin.dashboardStats),
};
