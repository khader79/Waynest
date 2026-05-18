import { test, expect } from "../../fixtures";
import { ApiMocker } from "../../utils/ApiMocker";

test.describe("Edge Cases", () => {
  test.describe("Network Conditions", () => {
    test("should handle offline mode gracefully", async ({ page }) => {
      await page.context().setOffline(true);
      await page.goto("/");

      // Should show some form of offline indicator or cached content
      await page.waitForLoadState("domcontentloaded");
    });

    test("should handle slow network gracefully", async ({ page }) => {
      await page.context().setOffline(false);
      await page.route("**/*", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await route.continue();
      });

      await page.goto("/");
      // Should show loading state
      await page.waitForLoadState("networkidle");
    });

    test("should recover after network failure", async ({ page }) => {
      await page.context().setOffline(true);
      await page.goto("/");

      await page.context().setOffline(false);
      await page.reload();
      await page.waitForLoadState("networkidle");

      // Should load successfully
      await expect(page).toHaveURL(/\/$/);
    });
  });

  test.describe("URL Parameters", () => {
    test("should handle empty search query", async ({ page }) => {
      await page.goto("/search?q=");
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(/\/search/);
    });

    test("should handle special characters in URL", async ({ page }) => {
      await page.goto("/search?q=%3Cscript%3Ealert%28%27xss%27%29%3C%2Fscript%3E");
      await page.waitForLoadState("networkidle");
      // Should not crash
      await expect(page).toHaveURL(/\/search/);
    });

    test("should handle very long URL parameters", async ({ page }) => {
      const longQuery = "a".repeat(10000);
      await page.goto(`/search?q=${longQuery}`);
      await page.waitForLoadState("networkidle");
      // Should not crash
    });

    test("should handle missing query parameter", async ({ page }) => {
      await page.goto("/search");
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(/\/search/);
    });
  });

  test.describe("Local Storage Edge Cases", () => {
    test("should handle corrupted auth data", async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem("DEV_AUTH_USER", "not-valid-json");
      });
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      // Should not crash, should redirect to login
    });

    test("should handle missing language preference", async ({ page }) => {
      await page.evaluate(() => {
        localStorage.removeItem("i18nextLng");
      });
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      // Should default to English
    });

    test("should handle invalid language preference", async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem("i18nextLng", "invalid-lang");
      });
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      // Should default to English
    });
  });

  test.describe("Form Edge Cases", () => {
    test("should handle rapid form submissions", async ({
      page,
      contactPage,
    }) => {
      const mocker = new ApiMocker(page);
      await mocker.mockContactSubmission({ success: true });

      await contactPage.goto();
      await contactPage.nameInput.fill("Test User");
      await contactPage.emailInput.fill("test@example.com");
      await contactPage.subjectSelect.selectOption("general");
      await contactPage.messageInput.fill("Test message");

      // Rapid clicks
      await contactPage.submitButton.click();
      await contactPage.submitButton.click();
      await contactPage.submitButton.click();

      await page.waitForLoadState("networkidle");
    });

    test("should handle paste in password field", async ({
      page,
      loginPage,
    }) => {
      await loginPage.goto();
      await loginPage.passwordInput.fill("P@ssw0rd123!");
      await page.waitForLoadState("networkidle");
    });

    test("should handle emoji in form fields", async ({
      page,
      contactPage,
    }) => {
      const mocker = new ApiMocker(page);
      await mocker.mockContactSubmission({ success: true });

      await contactPage.goto();
      await contactPage.nameInput.fill("Test User 🌍✈️🗺️");
      await contactPage.emailInput.fill("test@example.com");
      await contactPage.subjectSelect.selectOption("general");
      await contactPage.messageInput.fill("Hello! 🎉 This is a test 🚀");

      await contactPage.submitButton.click();
      await page.waitForLoadState("networkidle");
    });
  });

  test.describe("Browser Features", () => {
    test("should handle back/forward navigation", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      await page.goto("/about");
      await page.waitForLoadState("networkidle");

      await page.goBack();
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(/\/$/);

      await page.goForward();
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(/\/about/);
    });

    test("should handle page refresh", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      await page.reload();
      await page.waitForLoadState("networkidle");

      await expect(page).toHaveURL(/\/$/);
    });

    test("should handle multiple tabs", async ({ context }) => {
      const page1 = await context.newPage();
      const page2 = await context.newPage();

      await page1.goto("/");
      await page2.goto("/about");

      await page1.waitForLoadState("networkidle");
      await page2.waitForLoadState("networkidle");

      await expect(page1).toHaveURL(/\/$/);
      await expect(page2).toHaveURL(/\/about/);
    });
  });

  test.describe("Security Edge Cases", () => {
    test("should not expose sensitive data in URL", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const url = page.url();
      expect(url).not.toContain("token");
      expect(url).not.toContain("password");
      expect(url).not.toContain("secret");
    });

    test("should not expose sensitive data in console", async ({ page }) => {
      const consoleMessages: string[] = [];
      page.on("console", (msg) => {
        consoleMessages.push(msg.text());
      });

      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const sensitiveMessages = consoleMessages.filter(
        (msg) =>
          msg.includes("token") ||
          msg.includes("password") ||
          msg.includes("secret"),
      );
      expect(sensitiveMessages).toHaveLength(0);
    });
  });
});
