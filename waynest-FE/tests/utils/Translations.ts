import { Page } from "@playwright/test";

/**
 * Translation testing utilities.
 */
export async function switchLanguage(page: Page, language: string) {
  await page.evaluate(
    (lang) => {
      localStorage.setItem("i18nextLng", lang);
    },
    language,
  );
  await page.reload();
  await page.waitForLoadState("networkidle");
}

export async function getVisibleText(page: Page): Promise<string[]> {
  return await page.evaluate(() => {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const text = node.textContent?.trim() || "";
          if (!text) return NodeFilter.FILTER_REJECT;
          if (
            node.parentElement?.closest(
              "script, style, noscript, [aria-hidden]",
            )
          )
            return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      },
    );

    const texts: string[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const text = node.textContent?.trim();
      if (text && text.length > 2) {
        texts.push(text);
      }
    }
    return texts;
  });
}

export async function detectUntranslatedText(page: Page): Promise<string[]> {
  return await page.evaluate(() => {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
    );

    const untranslated: string[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const text = node.textContent?.trim() || "";
      // Detect camelCase keys that weren't translated (e.g., "common.brandName")
      if (
        /^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)*$/.test(text) &&
        text.includes(".") &&
        text.length < 60
      ) {
        untranslated.push(text);
      }
    }
    return untranslated;
  });
}

export async function checkRTLLayout(page: Page): Promise<{
  isRTL: boolean;
  issues: string[];
}> {
  const isRTL = await page.evaluate(() => {
    return document.documentElement.dir === "rtl";
  });

  const issues: string[] = [];

  if (isRTL) {
    // Check for LTR-specific issues in RTL mode
    const rtlIssues = await page.evaluate(() => {
      const issues: string[] = [];

      // Check if text alignment is correct for RTL
      const bodyStyle = window.getComputedStyle(document.body);
      if (bodyStyle.direction !== "rtl") {
        issues.push("Body direction is not RTL");
      }

      // Check for elements that should be mirrored
      const nav = document.querySelector("nav");
      if (nav) {
        const navStyle = window.getComputedStyle(nav);
        if (navStyle.direction !== "rtl") {
          issues.push("Navigation direction is not RTL");
        }
      }

      return issues;
    });

    issues.push(...rtlIssues);
  }

  return { isRTL, issues };
}

export async function compareTranslations(
  page: Page,
  lang1: string,
  lang2: string,
  selector: string,
): Promise<{ text1: string; text2: string }> {
  await switchLanguage(page, lang1);
  const text1 = await page.locator(selector).textContent();

  await switchLanguage(page, lang2);
  const text2 = await page.locator(selector).textContent();

  return { text1: text1 || "", text2: text2 || "" };
}
