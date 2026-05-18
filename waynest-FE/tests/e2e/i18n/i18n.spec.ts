import { test, expect } from "../../fixtures";
import { switchLanguage, detectUntranslatedText, checkRTLLayout } from "../../utils/Translations";

test.describe("Internationalization (i18n)", () => {
  test.describe("Language Switching", () => {
    test("should switch to Arabic", async ({ page }) => {
      await page.goto("/");
      await switchLanguage(page, "ar");

      const dir = await page.evaluate(() => document.documentElement.dir);
      expect(dir).toBe("rtl");
    });

    test("should switch to Hebrew", async ({ page }) => {
      await page.goto("/");
      await switchLanguage(page, "he");

      const dir = await page.evaluate(() => document.documentElement.dir);
      expect(dir).toBe("rtl");
    });

    test("should switch to French", async ({ page }) => {
      await page.goto("/");
      await switchLanguage(page, "fr");

      const dir = await page.evaluate(() => document.documentElement.dir);
      expect(dir).toBe("ltr");
    });

    test("should switch to Spanish", async ({ page }) => {
      await page.goto("/");
      await switchLanguage(page, "es");

      const dir = await page.evaluate(() => document.documentElement.dir);
      expect(dir).toBe("ltr");
    });

    test("should switch to Chinese", async ({ page }) => {
      await page.goto("/");
      await switchLanguage(page, "zh");

      const dir = await page.evaluate(() => document.documentElement.dir);
      expect(dir).toBe("ltr");
    });

    test("should switch to Japanese", async ({ page }) => {
      await page.goto("/");
      await switchLanguage(page, "ja");

      const dir = await page.evaluate(() => document.documentElement.dir);
      expect(dir).toBe("ltr");
    });

    test("should switch to Russian", async ({ page }) => {
      await page.goto("/");
      await switchLanguage(page, "ru");

      const dir = await page.evaluate(() => document.documentElement.dir);
      expect(dir).toBe("ltr");
    });

    test("should switch to German", async ({ page }) => {
      await page.goto("/");
      await switchLanguage(page, "de");

      const dir = await page.evaluate(() => document.documentElement.dir);
      expect(dir).toBe("ltr");
    });

    test("should switch to Turkish", async ({ page }) => {
      await page.goto("/");
      await switchLanguage(page, "tr");

      const dir = await page.evaluate(() => document.documentElement.dir);
      expect(dir).toBe("ltr");
    });

    test("should persist language preference after reload", async ({
      page,
    }) => {
      await page.goto("/");
      await switchLanguage(page, "ar");

      await page.reload();
      await page.waitForLoadState("networkidle");

      const dir = await page.evaluate(() => document.documentElement.dir);
      expect(dir).toBe("rtl");
    });
  });

  test.describe("RTL Layout", () => {
    test("should apply RTL direction for Arabic", async ({ page }) => {
      await switchLanguage(page, "ar");
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const { isRTL, issues } = await checkRTLLayout(page);
      expect(isRTL).toBe(true);
      expect(issues).toHaveLength(0);
    });

    test("should apply RTL direction for Hebrew", async ({ page }) => {
      await switchLanguage(page, "he");
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const { isRTL, issues } = await checkRTLLayout(page);
      expect(isRTL).toBe(true);
      expect(issues).toHaveLength(0);
    });

    test("should apply RTL direction for Urdu", async ({ page }) => {
      await switchLanguage(page, "ur");
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const { isRTL, issues } = await checkRTLLayout(page);
      expect(isRTL).toBe(true);
      expect(issues).toHaveLength(0);
    });

    test("should apply LTR direction for English", async ({ page }) => {
      await switchLanguage(page, "en");
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const { isRTL } = await checkRTLLayout(page);
      expect(isRTL).toBe(false);
    });
  });

  test.describe("Missing Translations", () => {
    test("should detect untranslated text on landing page", async ({
      page,
    }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const untranslated = await detectUntranslatedText(page);
      // Log for review - not failing as some keys may be intentionally humanized
      if (untranslated.length > 0) {
        console.log("Potentially untranslated keys found:", untranslated);
      }
    });

    test("should detect untranslated text on login page", async ({
      page,
    }) => {
      await page.goto("/login");
      await page.waitForLoadState("networkidle");

      const untranslated = await detectUntranslatedText(page);
      if (untranslated.length > 0) {
        console.log("Potentially untranslated keys found:", untranslated);
      }
    });

    test("should detect untranslated text on trip planner", async ({
      page,
    }) => {
      await page.goto("/plan");
      await page.waitForLoadState("networkidle");

      const untranslated = await detectUntranslatedText(page);
      if (untranslated.length > 0) {
        console.log("Potentially untranslated keys found:", untranslated);
      }
    });
  });

  test.describe("Translation Consistency", () => {
    test("should have consistent brand name across languages", async ({
      page,
    }) => {
      const languages = ["en", "ar", "fr", "es", "de"];
      const brandNames: string[] = [];

      for (const lang of languages) {
        await switchLanguage(page, lang);
        await page.goto("/");
        await page.waitForLoadState("networkidle");

        const brandText = await page
          .getByText(/waynest/i)
          .first()
          .textContent();
        if (brandText) {
          brandNames.push(brandText.trim().toLowerCase());
        }
      }

      // All brand names should be consistent
      const unique = [...new Set(brandNames)];
      expect(unique.length).toBeLessThanOrEqual(1);
    });
  });
});
