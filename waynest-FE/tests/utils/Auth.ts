import { Page } from "@playwright/test";

/**
 * Authentication helpers for managing test user sessions.
 */
export async function authenticateAs(
  page: Page,
  user: { id: string; email: string; username: string; role: string },
) {
  await page.evaluate(
    ({ user }) => {
      localStorage.setItem("DEV_AUTH_USER", JSON.stringify(user));
    },
    { user },
  );
  await page.reload();
  await page.waitForLoadState("networkidle");
}

export async function logout(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem("DEV_AUTH_USER");
    localStorage.removeItem("waynest-auth-token");
    localStorage.removeItem("waynest-auth-user");
  });
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
}

export async function isLoggedIn(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    return !!localStorage.getItem("DEV_AUTH_USER");
  });
}

export async function getUserRole(page: Page): Promise<string | null> {
  return await page.evaluate(() => {
    const userStr = localStorage.getItem("DEV_AUTH_USER");
    if (!userStr) return null;
    try {
      const user = JSON.parse(userStr);
      return user.role || null;
    } catch {
      return null;
    }
  });
}

export const TEST_USERS = {
  USER: {
    id: "test-user-id",
    email: "testuser@waynest.com",
    username: "testuser",
    role: "USER",
  },
  PROVIDER: {
    id: "test-provider-id",
    email: "testprovider@waynest.com",
    username: "testprovider",
    role: "PROVIDER",
  },
  ADMIN: {
    id: "test-admin-id",
    email: "admin@waynest.com",
    username: "admin",
    role: "ADMIN",
  },
};
