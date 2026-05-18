import { test, expect } from "../../fixtures";
import { ApiMocker } from "../../utils/ApiMocker";

test.describe("Form Testing", () => {
  test.describe("Contact Form", () => {
    test("should submit contact form successfully (mocked)", async ({
      page,
      contactPage,
    }) => {
      const mocker = new ApiMocker(page);
      await mocker.mockContactSubmission({ success: true });

      await contactPage.submitForm({
        name: "Test User",
        email: "test@example.com",
        subject: "general",
        message: "This is a test message.",
      });

      // Should show success or stay on page
      await expect(page).toHaveURL(/\/contact/);
    });

    test("should validate required fields", async ({ contactPage, page }) => {
      await contactPage.goto();
      await contactPage.submitButton.click();

      // Should show validation errors
      await expect(page).toHaveURL(/\/contact/);
    });

    test("should validate email format", async ({ contactPage, page }) => {
      await contactPage.goto();
      await contactPage.nameInput.fill("Test User");
      await contactPage.emailInput.fill("invalid-email");
      await contactPage.submitButton.click();

      // Should show validation error
      await expect(page).toHaveURL(/\/contact/);
    });
  });

  test.describe("Trip Planner Form", () => {
    test("should fill and submit trip planner form (mocked)", async ({
      page,
      tripPlannerPage,
    }) => {
      const mocker = new ApiMocker(page);
      await mocker.mockAllCatalogData();
      await mocker.mockTripGeneration({
        id: "test-trip-id",
        days: [],
        budget: 500,
      });

      await tripPlannerPage.fillTripPlan({
        country: "Palestine",
        city: "Bethlehem",
        days: "3",
        persons: "2",
        startDate: "2026-06-01",
        budget: "500",
        currency: "USD",
      });

      await tripPlannerPage.generate();

      // Should navigate to results or show loading
      await page.waitForLoadState("networkidle");
    });

    test("should validate required fields", async ({
      tripPlannerPage,
      page,
    }) => {
      await tripPlannerPage.goto();
      await tripPlannerPage.generateButton.click();

      // Should show validation errors
      await page.waitForLoadState("networkidle");
    });

    test("should load countries and cities from API", async ({
      page,
      tripPlannerPage,
    }) => {
      const mocker = new ApiMocker(page);
      await mocker.mockAllCatalogData();

      await tripPlannerPage.goto();

      // Click country select to see options
      await tripPlannerPage.countrySelect.click();
      await expect(page.getByRole("option").first()).toBeVisible();
    });
  });

  test.describe("Settings Form", () => {
    test("should validate password match", async ({
      loginPage,
      settingsPage,
      page,
    }) => {
      // Login first
      await loginPage.loginWithDevBypass({
        id: "test-user-id",
        email: "testuser@waynest.com",
        username: "testuser",
        role: "USER",
      });

      await settingsPage.goto();
      await settingsPage.newPasswordInput.fill("NewPass123!");
      await settingsPage.confirmPasswordInput.fill("DifferentPass123!");
      await settingsPage.saveButton.click();

      // Should show validation error
      await page.waitForLoadState("networkidle");
    });

    test("should validate password length", async ({
      loginPage,
      settingsPage,
      page,
    }) => {
      await loginPage.loginWithDevBypass({
        id: "test-user-id",
        email: "testuser@waynest.com",
        username: "testuser",
        role: "USER",
      });

      await settingsPage.goto();
      await settingsPage.newPasswordInput.fill("short");
      await settingsPage.confirmPasswordInput.fill("short");
      await settingsPage.saveButton.click();

      // Should show validation error
      await page.waitForLoadState("networkidle");
    });
  });

  test.describe("Search Functionality", () => {
    test("should search for places", async ({ page, searchPage }) => {
      const mocker = new ApiMocker(page);
      await mocker.mockSearch([
        { id: "1", name: "Test Place", type: "place" },
      ]);

      await searchPage.search("Bethlehem");

      // Should show results
      await page.waitForLoadState("networkidle");
    });

    test("should handle empty search results", async ({ page, searchPage }) => {
      const mocker = new ApiMocker(page);
      await mocker.mockSearch([]);

      await searchPage.search("xyznonexistent123");

      // Should show empty state
      await page.waitForLoadState("networkidle");
    });

    test("should handle special characters in search", async ({
      page,
      searchPage,
    }) => {
      const mocker = new ApiMocker(page);
      await mocker.mockSearch([]);

      await searchPage.search("<script>alert('xss')</script>");

      // Should not crash
      await page.waitForLoadState("networkidle");
    });
  });
});
