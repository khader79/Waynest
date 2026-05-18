import { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

export class NavbarPage extends BasePage {
  readonly brandLogo: Locator;
  readonly searchInput: Locator;
  readonly notificationsButton: Locator;
  readonly messagesButton: Locator;
  readonly profileButton: Locator;
  readonly languageSwitcher: Locator;
  readonly themeToggle: Locator;

  constructor(page: Page) {
    super(page, "/");
    this.brandLogo = page.getByRole("link", { name: /waynest/i }).first();
    this.searchInput = page.getByRole("searchbox").first();
    this.notificationsButton = page.getByRole("button", {
      name: /notification/i,
    });
    this.messagesButton = page.getByRole("button", { name: /message|inbox/i });
    this.profileButton = page.getByRole("button", { name: /profile|account/i });
    this.languageSwitcher = page.getByRole("button", { name: /language|lang/i });
    this.themeToggle = page.getByRole("button", { name: /theme|dark|light/i });
  }

  async switchLanguage(language: string) {
    await this.languageSwitcher.click();
    await this.page.getByRole("option", { name: language }).click();
    await this.page.waitForLoadState("networkidle");
  }

  async toggleTheme() {
    await this.themeToggle.click();
    await this.page.waitForLoadState("networkidle");
  }
}
