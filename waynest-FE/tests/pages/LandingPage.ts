import { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

export class LandingPage extends BasePage {
  readonly heroTitle: Locator;
  readonly heroSubtitle: Locator;
  readonly ctaButton: Locator;
  readonly navbar: Locator;
  readonly footer: Locator;

  constructor(page: Page) {
    super(page, "/");
    this.heroTitle = page.getByRole("heading", { level: 1 });
    this.heroSubtitle = page.getByRole("heading", { level: 2 });
    this.ctaButton = page.getByRole("button", { name: /get started|plan trip|explore/i });
    this.navbar = page.locator("nav, [class*='navbar']");
    this.footer = page.locator("footer, [class*='footer']");
  }

  async clickCta() {
    await this.ctaButton.click();
    await this.page.waitForLoadState("networkidle");
  }
}
