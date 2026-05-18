import { chromium, FullConfig } from "@playwright/test";
import fs from "fs";
import path from "path";

/**
 * Global setup runs once before all tests.
 * - Creates necessary directories
 * - Generates auth storage states for different roles
 * - Seeds test data if needed
 */
async function globalSetup(config: FullConfig) {
  const authDir = path.join(__dirname, "fixtures/auth");
  const resultsDir = path.join(__dirname, "../test-results");

  // Create directories
  for (const dir of [authDir, resultsDir]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // Generate auth storage states for different roles
  const roles = [
    {
      role: "USER",
      file: "user-storage.json",
      user: {
        id: "test-user-id",
        email: "testuser@waynest.com",
        username: "testuser",
        firstName: "Test",
        lastName: "User",
        role: "USER",
        isEmailVerified: true,
      },
    },
    {
      role: "PROVIDER",
      file: "provider-storage.json",
      user: {
        id: "test-provider-id",
        email: "testprovider@waynest.com",
        username: "testprovider",
        firstName: "Test",
        lastName: "Provider",
        role: "PROVIDER",
        isEmailVerified: true,
      },
    },
    {
      role: "ADMIN",
      file: "admin-storage.json",
      user: {
        id: "test-admin-id",
        email: "admin@waynest.com",
        username: "admin",
        firstName: "System",
        lastName: "Administrator",
        role: "ADMIN",
        isEmailVerified: true,
      },
    },
  ];

  const baseUrl = process.env.BASE_URL || "http://localhost:5173";

  for (const { file, user } of roles) {
    const storagePath = path.join(authDir, file);

    // Try to authenticate via API and capture real tokens
    try {
      const browser = await chromium.launch();
      const context = await browser.newContext();
      const page = await context.newPage();

      // Navigate to trigger localStorage setup
      await page.goto(`${baseUrl}/login`);
      await page.waitForLoadState("networkidle");

      // Set DEV_AUTH_USER for non-production bypass
      await page.evaluate(
        ({ user }) => {
          localStorage.setItem("DEV_AUTH_USER", JSON.stringify(user));
        },
        { user },
      );

      // Refresh to apply
      await page.reload();
      await page.waitForLoadState("networkidle");

      // Save storage state
      await context.storageState({ path: storagePath });
      await browser.close();
    } catch {
      // Fallback: create minimal storage state
      const storageState = {
        cookies: [],
        origins: [
          {
            origin: baseUrl,
            localStorage: [
              {
                name: "DEV_AUTH_USER",
                value: JSON.stringify(user),
              },
              {
                name: "i18nextLng",
                value: "en",
              },
            ],
          },
        ],
      };
      fs.writeFileSync(storagePath, JSON.stringify(storageState, null, 2));
    }
  }

  console.log("✅ Global setup complete. Auth storage states generated.");
}

export default globalSetup;
