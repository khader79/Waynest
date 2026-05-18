import { Page, expect } from "@playwright/test";

/**
 * Visual regression testing utilities.
 */
export async function snapshotPage(
  page: Page,
  name: string,
  options?: { fullPage?: boolean; mask?: any[] },
) {
  await expect(page).toHaveScreenshot(`${name}.png`, {
    fullPage: options?.fullPage ?? true,
    mask: options?.mask ?? [],
    maxDiffPixelRatio: 0.02,
  });
}

export async function snapshotElement(
  page: Page,
  selector: string,
  name: string,
) {
  const element = page.locator(selector);
  await expect(element).toHaveScreenshot(`${name}.png`, {
    maxDiffPixelRatio: 0.02,
  });
}

export async function checkVisualConsistency(page: Page) {
  const issues: string[] = [];

  // Check for overlapping elements
  const overlaps = await page.evaluate(() => {
    const elements = document.querySelectorAll("*");
    const rects: { tag: string; rect: DOMRect }[] = [];
    elements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        rects.push({ tag: el.tagName, rect });
      }
    });
    const overlaps: string[] = [];
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i].rect;
        const b = rects[j].rect;
        if (
          a.left < b.right &&
          a.right > b.left &&
          a.top < b.bottom &&
          a.bottom > b.top
        ) {
          overlaps.push(
            `${rects[i].tag} overlaps ${rects[j].tag}`,
          );
        }
      }
    }
    return overlaps.slice(0, 10);
  });

  if (overlaps.length > 0) {
    issues.push(...overlaps);
  }

  return issues;
}

export async function checkResponsiveLayout(page: Page, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  await page.waitForTimeout(500);

  const layoutInfo = await page.evaluate(() => {
    const body = document.body;
    const html = document.documentElement;
    return {
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      scrollWidth: Math.max(body.scrollWidth, html.scrollWidth),
      scrollHeight: Math.max(body.scrollHeight, html.scrollHeight),
      hasHorizontalOverflow: body.scrollWidth > window.innerWidth,
      hasVerticalOverflow: body.scrollHeight > window.innerHeight,
    };
  });

  return layoutInfo;
}
