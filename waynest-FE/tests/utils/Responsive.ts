import { Page } from "@playwright/test";

/**
 * Responsive testing utilities.
 */
export const VIEWPORTS = {
  MOBILE_SMALL: { width: 320, height: 568 },
  MOBILE_MEDIUM: { width: 375, height: 667 },
  MOBILE_LARGE: { width: 414, height: 736 },
  TABLET_SMALL: { width: 600, height: 960 },
  TABLET_MEDIUM: { width: 768, height: 1024 },
  TABLET_LARGE: { width: 834, height: 1112 },
  DESKTOP_SMALL: { width: 1024, height: 768 },
  DESKTOP_MEDIUM: { width: 1280, height: 800 },
  DESKTOP_LARGE: { width: 1440, height: 900 },
  DESKTOP_XL: { width: 1920, height: 1080 },
  ULTRAWIDE: { width: 2560, height: 1440 },
};

export async function testResponsive(
  page: Page,
  url: string,
  viewports: { width: number; height: number }[],
) {
  const results: {
    viewport: { width: number; height: number };
    hasOverflow: boolean;
    screenshot: string;
  }[] = [];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto(url);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    const hasOverflow = await page.evaluate(() => {
      const body = document.body;
      const html = document.documentElement;
      return (
        body.scrollWidth > window.innerWidth ||
        body.scrollHeight > window.innerHeight
      );
    });

    const screenshotPath = `test-results/screenshots/responsive-${viewport.width}x${viewport.height}-${Date.now()}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });

    results.push({ viewport, hasOverflow, screenshot: screenshotPath });
  }

  return results;
}

export async function checkBreakpoints(page: Page, url: string) {
  const breakpoints = [
    { name: "mobile", width: 375 },
    { name: "tablet", width: 768 },
    { name: "desktop", width: 1024 },
    { name: "large-desktop", width: 1440 },
  ];

  const results: { name: string; width: number; elements: string[] }[] = [];

  for (const bp of breakpoints) {
    await page.setViewportSize({ width: bp.width, height: 800 });
    await page.goto(url);
    await page.waitForLoadState("networkidle");

    const elements = await page.evaluate(() => {
      const visible: string[] = [];
      const hidden: string[] = [];
      document.querySelectorAll("[class*='mobile'], [class*='tablet'], [class*='desktop']").forEach((el) => {
        const rect = el.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0;
        if (isVisible) {
          visible.push(el.className);
        } else {
          hidden.push(el.className);
        }
      });
      return { visible, hidden };
    });

    results.push({ name: bp.name, width: bp.width, elements: elements.visible });
  }

  return results;
}
