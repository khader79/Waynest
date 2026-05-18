import { Page, expect } from "@playwright/test";

/**
 * Accessibility testing utilities.
 */
export async function checkAccessibility(page: Page): Promise<{
  violations: any[];
  passes: any[];
}> {
  // Inject axe-core if not present
  await page.addScriptTag({
    url: "https://unpkg.com/axe-core@4/axe.min.js",
  });

  const results = await page.evaluate(async () => {
    return await (window as any).axe.run(document, {
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
      },
    });
  });

  return {
    violations: results.violations,
    passes: results.passes,
  };
}

export async function expectNoAccessibilityViolations(page: Page) {
  const { violations } = await checkAccessibility(page);
  if (violations.length > 0) {
    console.error("Accessibility violations found:");
    violations.forEach((v: any) => {
      console.error(`- ${v.id}: ${v.description}`);
      v.nodes.forEach((node: any) => {
        console.error(`  ${node.html}`);
      });
    });
  }
  expect(violations).toHaveLength(0);
}

export async function checkKeyboardNavigation(page: Page, selector: string) {
  const element = page.locator(selector);
  await element.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Space");
  await page.keyboard.press("Escape");
}

export async function checkFocusManagement(page: Page) {
  const focusedElement = await page.evaluate(() => {
    const el = document.activeElement;
    return {
      tagName: el?.tagName,
      role: el?.getAttribute("role"),
      ariaLabel: el?.getAttribute("aria-label"),
    };
  });
  return focusedElement;
}

export async function checkColorContrast(page: Page) {
  return await page.evaluate(() => {
    const elements = document.querySelectorAll("*");
    const issues: any[] = [];
    elements.forEach((el) => {
      const style = window.getComputedStyle(el);
      const color = style.color;
      const bgColor = style.backgroundColor;
      if (color && bgColor && bgColor !== "rgba(0, 0, 0, 0)") {
        // Simple check - in production, use a proper contrast calculator
        issues.push({
          element: el.tagName,
          color,
          bgColor,
        });
      }
    });
    return issues.slice(0, 10); // Limit to first 10
  });
}
