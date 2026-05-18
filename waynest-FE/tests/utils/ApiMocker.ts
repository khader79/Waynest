import { Page } from "@playwright/test";

/**
 * API mocking utilities for intercepting and mocking API responses.
 */
export class ApiMocker {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async mockCountries(response?: any[]) {
    await this.page.route("**/api/countries*", async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify(
          response || [
            { id: "1", name: "Palestine", code: "PS" },
            { id: "2", name: "Italy", code: "IT" },
            { id: "3", name: "Turkey", code: "TR" },
          ],
        ),
      });
    });
  }

  async mockCities(response?: any[]) {
    await this.page.route("**/api/cities*", async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify(
          response || [
            { id: "1", name: "Bethlehem", countryId: "1" },
            { id: "2", name: "Rome", countryId: "2" },
            { id: "3", name: "Istanbul", countryId: "3" },
          ],
        ),
      });
    });
  }

  async mockTags(response?: any[]) {
    await this.page.route("**/api/tag*", async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify(
          response || [
            { id: "1", name: "History" },
            { id: "2", name: "Food" },
            { id: "3", name: "Nature" },
          ],
        ),
      });
    });
  }

  async mockCurrencies(response?: any[]) {
    await this.page.route("**/api/currencies*", async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify(
          response || [
            { id: "1", code: "USD", iso: "USD" },
            { id: "2", code: "EUR", iso: "EUR" },
            { id: "3", code: "ILS", iso: "ILS" },
          ],
        ),
      });
    });
  }

  async mockSocialFeed(response?: any[]) {
    await this.page.route("**/api/social-content/feed*", async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify(response || []),
      });
    });
  }

  async mockTripGeneration(response?: any) {
    await this.page.route("**/api/trip-planner", async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify(
          response || {
            id: "test-trip-id",
            days: [],
            budget: 500,
            currency: "USD",
          },
        ),
      });
    });
  }

  async mockLogin(response?: any) {
    await this.page.route("**/api/auth/login", async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify(
          response || {
            access_token: "mock-jwt-token",
            user: {
              id: "test-user-id",
              email: "test@waynest.com",
              username: "testuser",
              role: "USER",
              isEmailVerified: true,
            },
          },
        ),
      });
    });
  }

  async mockLoginFailure() {
    await this.page.route("**/api/auth/login", async (route) => {
      await route.fulfill({
        status: 401,
        body: JSON.stringify({
          message: "Invalid credentials",
          error: "Unauthorized",
        }),
      });
    });
  }

  async mockContactSubmission(response?: any) {
    await this.page.route("**/api/contact", async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify(response || { success: true }),
      });
    });
  }

  async mockSearch(response?: any[]) {
    await this.page.route("**/api/search*", async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify(response || []),
      });
    });
  }

  async mockLandingStats(response?: any) {
    await this.page.route("**/api/public/landing-stats*", async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify(
          response || {
            placesCount: 100,
            eventsCount: 50,
            providersCount: 25,
          },
        ),
      });
    });
  }

  async mockAllCatalogData() {
    await this.mockCountries();
    await this.mockCities();
    await this.mockTags();
    await this.mockCurrencies();
    await this.mockLandingStats();
  }

  async unrouteAll() {
    await this.page.unrouteAll();
  }
}
