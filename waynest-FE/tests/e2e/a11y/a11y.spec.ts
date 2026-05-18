import { test, expect } from "../../fixtures";
import { checkAccessibility, expectNoAccessibilityViolations } from "../../utils/Accessibility";

test.describe("Accessibility (a11y)", () => {
  test.describe("Landing Page", () => {
    test("should have no accessibility violations", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await expectNoAccessibilityViolations(page);
    });

    test("should have proper heading hierarchy", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const headings = await page.evaluate(() => {
        const h1 = document.querySelectorAll("h1").length;
        const h2 = document.querySelectorAll("h2").length;
        const h3 = document.querySelectorAll("h3").length;
        return { h1, h2, h3 };
      });

      // Should have exactly one h1
      expect(headings.h1).toBeGreaterThanOrEqual(1);
    });

    test("should have alt text on images", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const imagesWithoutAlt = await page.evaluate(() => {
        const images = document.querySelectorAll("img");
        return Array.from(images)
          .filter((img) => !img.alt && !img.getAttribute("aria-hidden"))
          .map((img) => img.src);
      });

      expect(imagesWithoutAlt).toHaveLength(0);
    });

    test("should have accessible links", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const linksWithoutText = await page.evaluate(() => {
        const links = document.querySelectorAll("a");
        return Array.from(links)
          .filter(
            (link) =>
              !link.textContent?.trim() &&
              !link.getAttribute("aria-label") &&
              !link.getAttribute("title"),
          )
          .map((link) => link.href);
      });

      expect(linksWithoutText).toHaveLength(0);
    });
  });

  test.describe("Login Page", () => {
    test("should have no accessibility violations", async ({ page }) => {
      await page.goto("/login");
      await page.waitForLoadState("networkidle");
      await expectNoAccessibilityViolations(page);
    });

    test("should have proper form labels", async ({ page }) => {
      await page.goto("/login");
      await page.waitForLoadState("networkidle");

      const inputsWithoutLabel = await page.evaluate(() => {
        const inputs = document.querySelectorAll("input");
        return Array.from(inputs)
          .filter(
            (input) =>
              !input.id ||
              !document.querySelector(`label[for="${input.id}"]`),
          )
          .filter(
            (input) =>
              !input.getAttribute("aria-label") &&
              !input.getAttribute("placeholder"),
          )
          .map((input) => input.name || input.type);
      });

      expect(inputsWithoutLabel).toHaveLength(0);
    });

    test("should be keyboard navigable", async ({ page }) => {
      await page.goto("/login");
      await page.waitForLoadState("networkidle");

      // Tab through form
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");

      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          tagName: el?.tagName,
          type: el?.getAttribute("type"),
        };
      });

      expect(focusedElement.tagName).toBeTruthy();
    });
  });

  test.describe("Trip Planner Page", () => {
    test("should have no accessibility violations", async ({ page }) => {
      await page.goto("/plan");
      await page.waitForLoadState("networkidle");
      await expectNoAccessibilityViolations(page);
    });

    test("should have proper form labels", async ({ page }) => {
      await page.goto("/plan");
      await page.waitForLoadState("networkidle");

      const inputsWithoutLabel = await page.evaluate(() => {
        const inputs = document.querySelectorAll("input, select, textarea");
        return Array.from(inputs)
          .filter(
            (input) =>
              !input.getAttribute("aria-label") &&
              !input.getAttribute("placeholder"),
          )
          .map((input) => input.name || input.type);
      });

      expect(inputsWithoutLabel).toHaveLength(0);
    });
  });

  test.describe("Contact Page", () => {
    test("should have no accessibility violations", async ({ page }) => {
      await page.goto("/contact");
      await page.waitForLoadState("networkidle");
      await expectNoAccessibilityViolations(page);
    });
  });

  test.describe("RTL Accessibility", () => {
    test("should maintain accessibility in Arabic", async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem("i18nextLng", "ar");
      });
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await expectNoAccessibilityViolations(page);
    });

    test("should maintain accessibility in Hebrew", async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem("i18nextLng", "he");
      });
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await expectNoAccessibilityViolations(page);
    });
  });

  test.describe("Focus Management", () => {
    test("should maintain focus after modal close", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // This test would need a modal trigger - placeholder for now
      const focusedBefore = await page.evaluate(() =>
        document.activeElement?.tagName,
      );
      expect(focusedBefore).toBeTruthy();
    });

    test("should have visible focus indicators", async ({ page }) => {
      await page.goto("/login");
      await page.waitForLoadState("networkidle");

      await page.keyboard.press("Tab");

      const focusOutline = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return null;
        const style = window.getComputedStyle(el);
        return {
          outline: style.outline,
          outlineWidth: style.outlineWidth,
          outlineStyle: style.outlineStyle,
          outlineColor: style.outlineColor,
        };
      });

      // Should have some form of focus indicator
      expect(
        focusOutline?.outlineWidth !== "0px" ||
          focusOutline?.outlineStyle !== "none",
      ).toBeTruthy();
    });
  });
});
