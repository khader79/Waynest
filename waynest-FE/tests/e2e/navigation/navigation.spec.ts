import { test, expect } from "../../fixtures";
import { ApiMocker } from "../../utils/ApiMocker";

test.describe("Navigation & Routing", () => {
  test.beforeEach(async ({ page }) => {
    const mocker = new ApiMocker(page);
    await mocker.mockAllCatalogData();
    await mocker.mockSocialFeed();
  });

  test.describe("Public Routes", () => {
    test("should load landing page", async ({ landingPage }) => {
      await landingPage.goto();
      await expect(landingPage.heroTitle).toBeVisible();
      await expect(landingPage.navbar).toBeVisible();
      await expect(landingPage.footer).toBeVisible();
    });

    test("should navigate to explore page", async ({ page }) => {
      await page.goto("/explore");
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(/\/explore/);
    });

    test("should navigate to destinations page", async ({ page }) => {
      await page.goto("/destinations");
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(/\/destinations/);
    });

    test("should navigate to trip planner", async ({ tripPlannerPage }) => {
      await tripPlannerPage.goto();
      await expect(tripPlannerPage.countrySelect).toBeVisible();
      await expect(tripPlannerPage.citySelect).toBeVisible();
      await expect(tripPlannerPage.generateButton).toBeVisible();
    });

    test("should navigate to contact page", async ({ contactPage }) => {
      await contactPage.goto();
      await expect(contactPage.nameInput).toBeVisible();
      await expect(contactPage.emailInput).toBeVisible();
      await expect(contactPage.messageInput).toBeVisible();
      await expect(contactPage.submitButton).toBeVisible();
    });

    test("should navigate to search page", async ({ searchPage }) => {
      await searchPage.goto();
      await expect(searchPage.searchInput).toBeVisible();
    });

    test("should navigate to about page", async ({ page }) => {
      await page.goto("/about");
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(/\/about/);
    });

    test("should navigate to pricing page", async ({ page }) => {
      await page.goto("/pricing");
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(/\/pricing/);
    });
  });

  test.describe("Protected Routes", () => {
    test("should redirect unauthenticated user from profile", async ({
      page,
    }) => {
      await page.goto("/profile");
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(/\/login/);
    });

    test("should redirect unauthenticated user from settings", async ({
      page,
    }) => {
      await page.goto("/settings");
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(/\/login/);
    });

    test("should redirect unauthenticated user from bookings", async ({
      page,
    }) => {
      await page.goto("/bookings");
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(/\/login/);
    });

    test("should redirect unauthenticated user from wishlist", async ({
      page,
    }) => {
      await page.goto("/wishlist");
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(/\/login/);
    });

    test("should redirect unauthenticated user from admin panel", async ({
      page,
    }) => {
      await page.goto("/admin-panel");
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe("Redirects", () => {
    test("should redirect /dashboard to /", async ({ page }) => {
      await page.goto("/dashboard");
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(/\/$/);
    });

    test("should redirect /plan/calendar to /calendar", async ({ page }) => {
      await page.goto("/plan/calendar");
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(/\/calendar/);
    });

    test("should redirect /trip-planner to /plan", async ({ page }) => {
      await page.goto("/trip-planner");
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(/\/plan/);
    });

    test("should redirect /messenger to /social", async ({ page }) => {
      await page.goto("/messenger");
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(/\/social/);
    });
  });

  test.describe("404 Handling", () => {
    test("should show 404 for invalid route", async ({ page }) => {
      await page.goto("/this-route-does-not-exist-12345");
      await page.waitForLoadState("networkidle");
      // Should show 404 page
      const bodyText = await page.locator("body").textContent();
      expect(bodyText).toMatch(/404|not found|page not found/i);
    });
  });

  test.describe("Deep Linking", () => {
    test("should load place detail page", async ({ page }) => {
      await page.goto("/places/1");
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(/\/places\/1/);
    });

    test("should load event detail page", async ({ page }) => {
      await page.goto("/events/1");
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(/\/events\/1/);
    });
  });
});
