import { Page, Locator, expect } from "@playwright/test";

/**
 * Base page with common utilities shared across all pages.
 */
export class BasePage {
  readonly page: Page;
  readonly url: string;

  constructor(page: Page, url: string) {
    this.page = page;
    this.url = url;
  }

  async goto(params?: Record<string, string>) {
    const queryString = params
      ? "?" + new URLSearchParams(params).toString()
      : "";
    await this.page.goto(`${this.url}${queryString}`);
    await this.page.waitForLoadState("networkidle");
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState("networkidle");
  }

  async getPageTitle(): Promise<string> {
    return this.page.title();
  }

  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }

  async expectUrl(path: string) {
    await expect(this.page).toHaveURL(new RegExp(`${path}$`));
  }

  async expectTitle(title: string) {
    await expect(this.page).toHaveTitle(title);
  }

  async expectVisible(locator: Locator) {
    await expect(locator).toBeVisible();
  }

  async expectHidden(locator: Locator) {
    await expect(locator).toBeHidden();
  }

  async expectText(locator: Locator, text: string | RegExp) {
    await expect(locator).toContainText(text);
  }

  async click(locator: Locator) {
    await locator.click();
    await this.waitForPageLoad();
  }

  async fill(locator: Locator, value: string) {
    await locator.fill(value);
  }

  async selectOption(locator: Locator, value: string) {
    await locator.selectOption(value);
  }

  async screenshot(name: string) {
    await this.page.screenshot({
      path: `test-results/screenshots/${name}-${Date.now()}.png`,
      fullPage: true,
    });
  }

  async checkConsoleErrors(): Promise<string[]> {
    const errors: string[] = [];
    this.page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });
    return errors;
  }

  async checkFailedRequests(): Promise<string[]> {
    const failed: string[] = [];
    this.page.on("requestfailed", (request) => {
      failed.push(request.url());
    });
    return failed;
  }

  async checkLayoutOverflow(): Promise<boolean> {
    const hasOverflow = await this.page.evaluate(() => {
      const body = document.body;
      const html = document.documentElement;
      const width = Math.max(
        body.scrollWidth,
        body.offsetWidth,
        html.clientWidth,
        html.scrollWidth,
        html.offsetWidth,
      );
      const height = Math.max(
        body.scrollHeight,
        body.offsetHeight,
        html.clientHeight,
        html.scrollHeight,
        html.offsetHeight,
      );
      return {
        width,
        height,
        overflowX: width > window.innerWidth,
        overflowY: height > window.innerHeight,
      };
    });
    return hasOverflow.overflowX || hasOverflow.overflowY;
  }

  async getMissingTranslations(): Promise<string[]> {
    return await this.page.evaluate(() => {
      const missing: string[] = [];
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
      );
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const text = node.textContent?.trim() || "";
        // Detect camelCase or snake_case text that wasn't translated
        if (
          /^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)*$/.test(text) &&
          text.includes(".") &&
          text.length < 50
        ) {
          missing.push(text);
        }
      }
      return missing;
    });
  }

  async isRTL(): Promise<boolean> {
    return await this.page.evaluate(() => {
      return document.documentElement.dir === "rtl";
    });
  }
}
