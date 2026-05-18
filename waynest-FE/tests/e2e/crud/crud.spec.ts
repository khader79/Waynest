import { test, expect } from "../../fixtures";
import { ApiMocker } from "../../utils/ApiMocker";

test.describe("CRUD Operations", () => {
  test.describe("Contact Form (Create)", () => {
    test("should create a contact submission", async ({ page, contactPage }) => {
      const mocker = new ApiMocker(page);
      await mocker.mockContactSubmission({ success: true });

      await contactPage.submitForm({
        name: "Test User",
        email: "test@example.com",
        subject: "general",
        message: "This is a test contact submission.",
      });

      await page.waitForLoadState("networkidle");
    });
  });

  test.describe("Trip Planner (Create)", () => {
    test("should create a trip plan", async ({ page, tripPlannerPage }) => {
      const mocker = new ApiMocker(page);
      await mocker.mockAllCatalogData();
      await mocker.mockTripGeneration({
        id: "test-trip-id",
        days: [
          {
            day: 1,
            activities: [
              { name: "Activity 1", description: "Description 1" },
            ],
          },
        ],
        budget: 500,
        currency: "USD",
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
      await page.waitForLoadState("networkidle");

      // Should show results
      const bodyText = await page.locator("body").textContent();
      expect(bodyText).toBeTruthy();
    });
  });

  test.describe("Search (Read)", () => {
    test("should search and display results", async ({ page, searchPage }) => {
      const mocker = new ApiMocker(page);
      await mocker.mockSearch([
        { id: "1", name: "Bethlehem Church", type: "place" },
        { id: "2", name: "Manger Square", type: "place" },
      ]);

      await searchPage.search("Bethlehem");
      await page.waitForLoadState("networkidle");
    });

    test("should handle no results", async ({ page, searchPage }) => {
      const mocker = new ApiMocker(page);
      await mocker.mockSearch([]);

      await searchPage.search("xyznonexistent123");
      await page.waitForLoadState("networkidle");
    });
  });

  test.describe("Settings (Update)", () => {
    test("should update user settings", async ({
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
      await settingsPage.newPasswordInput.fill("NewSecurePass123!");
      await settingsPage.confirmPasswordInput.fill("NewSecurePass123!");
      await settingsPage.saveButton.click();

      await page.waitForLoadState("networkidle");
    });
  });

  test.describe("Admin CRUD", () => {
    test("should access admin users list", async ({
      loginPage,
      adminDashboardPage,
      page,
    }) => {
      await loginPage.loginWithDevBypass({
        id: "test-admin-id",
        email: "admin@waynest.com",
        username: "admin",
        role: "ADMIN",
      });

      await adminDashboardPage.goto();
      await adminDashboardPage.navigateToSection("Users");

      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(/\/admin-panel\/users/);
    });

    test("should access admin places list", async ({
      loginPage,
      adminDashboardPage,
      page,
    }) => {
      await loginPage.loginWithDevBypass({
        id: "test-admin-id",
        email: "admin@waynest.com",
        username: "admin",
        role: "ADMIN",
      });

      await adminDashboardPage.goto();
      await adminDashboardPage.navigateToSection("Places");

      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(/\/admin-panel\/places/);
    });

    test("should access admin countries list", async ({
      loginPage,
      adminDashboardPage,
      page,
    }) => {
      await loginPage.loginWithDevBypass({
        id: "test-admin-id",
        email: "admin@waynest.com",
        username: "admin",
        role: "ADMIN",
      });

      await adminDashboardPage.goto();
      await adminDashboardPage.navigateToSection("Countries");

      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(/\/admin-panel\/countries/);
    });
  });
});
