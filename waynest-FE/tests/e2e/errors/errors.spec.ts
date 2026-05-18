import { test, expect } from "../../fixtures";

test.describe("Console & API Errors", () => {
  test("should have no console errors on landing page", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    expect(errors).toHaveLength(0);
  });

  test("should have no console errors on login page", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    expect(errors).toHaveLength(0);
  });

  test("should have no console errors on trip planner", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto("/plan");
    await page.waitForLoadState("networkidle");

    expect(errors).toHaveLength(0);
  });

  test("should have no failed API requests on landing page", async ({
    page,
  }) => {
    const failedRequests: string[] = [];
    page.on("requestfailed", (request) => {
      failedRequests.push(request.url());
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    expect(failedRequests).toHaveLength(0);
  });

  test("should have no failed API requests on login page", async ({ page }) => {
    const failedRequests: string[] = [];
    page.on("requestfailed", (request) => {
      failedRequests.push(request.url());
    });

    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    expect(failedRequests).toHaveLength(0);
  });

  test("should detect layout overflow on landing page", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const hasOverflow = await page.evaluate(() => {
      const body = document.body;
      const html = document.documentElement;
      return (
        body.scrollWidth > window.innerWidth ||
        body.scrollHeight > window.innerHeight
      );
    });

    expect(hasOverflow).toBe(false);
  });

  test("should detect layout overflow on login page", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    const hasOverflow = await page.evaluate(() => {
      const body = document.body;
      const html = document.documentElement;
      return (
        body.scrollWidth > window.innerWidth ||
        body.scrollHeight > window.innerHeight
      );
    });

    expect(hasOverflow).toBe(false);
  });

  test("should detect layout overflow on trip planner", async ({ page }) => {
    await page.goto("/plan");
    await page.waitForLoadState("networkidle");

    const hasOverflow = await page.evaluate(() => {
      const body = document.body;
      const html = document.documentElement;
      return (
        body.scrollWidth > window.innerWidth ||
        body.scrollHeight > window.innerHeight
      );
    });

    expect(hasOverflow).toBe(false);
  });
});
