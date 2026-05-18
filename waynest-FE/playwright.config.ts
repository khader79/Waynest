import { defineConfig, devices } from "@playwright/test";
import path from "path";

/**
 * Playwright Enterprise Test Configuration
 * - Multi-browser, multi-device testing
 * - HTML reports, videos, traces, screenshots
 * - API mocking, auth persistence, retry strategy
 * - CI-ready setup
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:5173";
const API_URL = process.env.API_URL || "http://localhost:3001";
const IS_CI = !!process.env.CI;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: !IS_CI,
  forbidOnly: IS_CI,
  retries: IS_CI ? 2 : 1,
  workers: IS_CI ? 3 : undefined,
  reporter: [
    ["html", { outputFolder: "test-results/html-report", open: "never" }],
    ["list"],
    ["json", { outputFile: "test-results/results.json" }],
    ["junit", { outputFile: "test-results/junit.xml" }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    testIdAttribute: "data-testid",
    locale: "en-US",
    timezoneId: "Asia/Jerusalem",
  },
  timeout: 60_000,
  expect: {
    timeout: 5_000,
  },
  projects: [
    // ── Desktop ──
    {
      name: "chromium-desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        storageState: "tests/fixtures/auth/user-storage.json",
      },
    },
    {
      name: "firefox-desktop",
      use: {
        ...devices["Desktop Firefox"],
        viewport: { width: 1440, height: 900 },
        storageState: "tests/fixtures/auth/user-storage.json",
      },
    },
    // ── Tablet ──
    {
      name: "tablet",
      use: {
        ...devices["iPad Mini"],
        storageState: "tests/fixtures/auth/user-storage.json",
      },
    },
    // ── Mobile ──
    {
      name: "mobile-chrome",
      use: {
        ...devices["Pixel 7"],
        storageState: "tests/fixtures/auth/user-storage.json",
      },
    },
    {
      name: "mobile-safari",
      use: {
        ...devices["iPhone 15"],
        storageState: "tests/fixtures/auth/user-storage.json",
      },
    },
    // ── Auth Flows (no storage state) ──
    {
      name: "auth-flows",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
      testMatch: "**/auth/**/*.spec.ts",
    },
    // ── RTL Testing ──
    {
      name: "rtl-arabic",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        locale: "ar",
        storageState: "tests/fixtures/auth/user-storage.json",
      },
      testMatch: "**/i18n/**/*.spec.ts",
    },
    // ── API Tests ──
    {
      name: "api",
      use: {
        baseURL: API_URL,
      },
      testMatch: "**/api/**/*.spec.ts",
    },
    // ── Accessibility ──
    {
      name: "accessibility",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        storageState: "tests/fixtures/auth/user-storage.json",
      },
      testMatch: "**/a11y/**/*.spec.ts",
    },
    // ── Visual Regression ──
    {
      name: "visual",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        storageState: "tests/fixtures/auth/user-storage.json",
      },
      testMatch: "**/visual/**/*.spec.ts",
    },
  ],
  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: !IS_CI,
    timeout: 60_000,
    stdout: "pipe",
    stderr: "pipe",
  },
  outputDir: "test-results/results",
  globalSetup: require.resolve("./tests/global-setup.ts"),
});
