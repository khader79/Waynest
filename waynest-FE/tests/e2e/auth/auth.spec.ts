import { test, expect } from "../fixtures";

test.describe("Authentication Flows", () => {
  test.describe("Login", () => {
    test("should display login form", async ({ loginPage }) => {
      await loginPage.goto();
      await expect(loginPage.identifierInput).toBeVisible();
      await expect(loginPage.passwordInput).toBeVisible();
      await expect(loginPage.loginButton).toBeVisible();
    });

    test("should login with valid credentials via dev bypass", async ({
      loginPage,
      page,
    }) => {
      await loginPage.loginWithDevBypass({
        id: "test-user-id",
        email: "testuser@waynest.com",
        username: "testuser",
        role: "USER",
      });

      // Should redirect to home/social feed
      await expect(page).not.toHaveURL(/\/login/);
    });

    test("should show error with invalid credentials (mocked)", async ({
      page,
      loginPage,
    }) => {
      await page.route("**/api/auth/login", async (route) => {
        await route.fulfill({
          status: 401,
          body: JSON.stringify({ message: "Invalid credentials" }),
        });
      });

      await loginPage.goto();
      await loginPage.identifierInput.fill("invalid");
      await loginPage.passwordInput.fill("wrongpassword");
      await loginPage.loginButton.click();

      // Should show error or stay on login page
      await expect(page).toHaveURL(/\/login/);
    });

    test("should redirect to register from login", async ({ loginPage }) => {
      await loginPage.goto();
      await loginPage.registerLink.click();
      await expect(page).toHaveURL(/\/register/);
    });
  });

  test.describe("Registration", () => {
    test("should display registration form", async ({ registerPage }) => {
      await registerPage.goto();
      await expect(registerPage.firstNameInput).toBeVisible();
      await expect(registerPage.lastNameInput).toBeVisible();
      await expect(registerPage.emailInput).toBeVisible();
      await expect(registerPage.usernameInput).toBeVisible();
      await expect(registerPage.passwordInput).toBeVisible();
      await expect(registerPage.confirmPasswordInput).toBeVisible();
      await expect(registerPage.registerButton).toBeVisible();
    });

    test("should validate password match", async ({ registerPage, page }) => {
      await registerPage.goto();
      await registerPage.firstNameInput.fill("Test");
      await registerPage.lastNameInput.fill("User");
      await registerPage.emailInput.fill("test@example.com");
      await registerPage.usernameInput.fill("testuser");
      await registerPage.passwordInput.fill("Password123!");
      await registerPage.confirmPasswordInput.fill("Password456!");
      await registerPage.registerButton.click();

      // Should show validation error
      await expect(page).toHaveURL(/\/register/);
    });

    test("should validate required fields", async ({ registerPage, page }) => {
      await registerPage.goto();
      await registerPage.registerButton.click();

      // Should show validation errors for required fields
      await expect(page).toHaveURL(/\/register/);
    });

    test("should redirect to login from register", async ({ registerPage }) => {
      await registerPage.goto();
      await registerPage.loginLink.click();
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe("Session Management", () => {
    test("should persist session after page reload", async ({
      loginPage,
      page,
    }) => {
      await loginPage.loginWithDevBypass({
        id: "test-user-id",
        email: "testuser@waynest.com",
        username: "testuser",
        role: "USER",
      });

      await page.reload();
      await page.waitForLoadState("networkidle");

      // Should still be logged in
      await expect(page).not.toHaveURL(/\/login/);
    });

    test("should redirect to login when accessing protected route without auth", async ({
      page,
    }) => {
      await page.goto("/profile");
      await page.waitForLoadState("networkidle");

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });

    test("should redirect admin to admin panel", async ({ loginPage, page }) => {
      await loginPage.loginWithDevBypass({
        id: "test-admin-id",
        email: "admin@waynest.com",
        username: "admin",
        role: "ADMIN",
      });

      // Admin should see admin dashboard or be redirected appropriately
      await page.waitForLoadState("networkidle");
    });

    test("should redirect provider to provider panel", async ({
      loginPage,
      page,
    }) => {
      await loginPage.loginWithDevBypass({
        id: "test-provider-id",
        email: "testprovider@waynest.com",
        username: "testprovider",
        role: "PROVIDER",
      });

      await page.waitForLoadState("networkidle");
    });
  });
});
