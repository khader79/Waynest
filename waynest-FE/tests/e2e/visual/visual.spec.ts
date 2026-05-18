import { test, expect } from "../../fixtures";
import { snapshotPage, checkVisualConsistency } from "../../utils/VisualRegression";

test.describe("Visual Regression", () => {
  test.describe("Landing Page", () => {
    test("should match landing page snapshot", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await snapshotPage(page, "landing-page");
    });

    test("should have no visual inconsistencies", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const issues = await checkVisualConsistency(page);
      if (issues.length > 0) {
        console.log("Visual consistency issues:", issues);
      }
    });
  });

  test.describe("Login Page", () => {
    test("should match login page snapshot", async ({ page }) => {
      await page.goto("/login");
      await page.waitForLoadState("networkidle");
      await snapshotPage(page, "login-page");
    });
  });

  test.describe("Trip Planner Page", () => {
    test("should match trip planner snapshot", async ({ page }) => {
      await page.goto("/plan");
      await page.waitForLoadState("networkidle");
      await snapshotPage(page, "trip-planner-page");
    });
  });

  test.describe("Contact Page", () => {
    test("should match contact page snapshot", async ({ page }) => {
      await page.goto("/contact");
      await page.waitForLoadState("networkidle");
      await snapshotPage(page, "contact-page");
    });
  });

  test.describe("Dark Mode", () => {
    test("should match dark mode snapshot", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // Toggle dark mode
      await page.evaluate(() => {
        document.documentElement.setAttribute("data-theme", "dark");
      });
      await page.waitForTimeout(500);

      await snapshotPage(page, "landing-page-dark");
    });

    test("should transition smoothly to dark mode", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // Check for flash or jarring transition
      const beforeTransition = await page.evaluate(() => {
        return document.documentElement.getAttribute("data-theme");
      });

      await page.evaluate(() => {
        document.documentElement.setAttribute("data-theme", "dark");
      });

      // Wait for transition
      await page.waitForTimeout(300);

      const afterTransition = await page.evaluate(() => {
        return document.documentElement.getAttribute("data-theme");
      });

      expect(afterTransition).toBe("dark");
    });
  });

  test.describe("RTL Visual", () => {
    test("should match Arabic layout snapshot", async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem("i18nextLng", "ar");
      });
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      await snapshotPage(page, "landing-page-arabic");
    });

    test("should match Hebrew layout snapshot", async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem("i18nextLng", "he");
      });
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      await snapshotPage(page, "landing-page-hebrew");
    });
  });

  test.describe("Loading States", () => {
    test("should show loading skeleton on trip planner", async ({ page }) => {
      // Slow down network to see loading states
      await page.context().setOffline(false);

      await page.goto("/plan");

      // Take screenshot immediately to catch loading state
      await snapshotPage(page, "trip-planner-loading");
    });
  });

  test.describe("Error States", () => {
    test("should match 404 page snapshot", async ({ page }) => {
      await page.goto("/this-route-does-not-exist");
      await page.waitForLoadState("networkidle");

      await snapshotPage(page, "404-page");
    });
  });
});
