import { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

export class AdminDashboardPage extends BasePage {
  readonly statsCards: Locator;
  readonly sidebar: Locator;
  readonly usersLink: Locator;
  readonly providersLink: Locator;
  readonly placesLink: Locator;
  readonly countriesLink: Locator;
  readonly citiesLink: Locator;
  readonly currenciesLink: Locator;
  readonly tagsLink: Locator;
  readonly eventsLink: Locator;
  readonly reviewsLink: Locator;
  readonly billingLink: Locator;

  constructor(page: Page) {
    super(page, "/admin-panel");
    this.statsCards = page.locator('[class*="stat"], [class*="card"]');
    this.sidebar = page.locator('[class*="sidebar"], [class*="nav"]');
    this.usersLink = page.getByRole("link", { name: /users/i });
    this.providersLink = page.getByRole("link", { name: /providers/i });
    this.placesLink = page.getByRole("link", { name: /places/i });
    this.countriesLink = page.getByRole("link", { name: /countries/i });
    this.citiesLink = page.getByRole("link", { name: /cities/i });
    this.currenciesLink = page.getByRole("link", { name: /currencies/i });
    this.tagsLink = page.getByRole("link", { name: /tags/i });
    this.eventsLink = page.getByRole("link", { name: /events/i });
    this.reviewsLink = page.getByRole("link", { name: /reviews/i });
    this.billingLink = page.getByRole("link", { name: /billing/i });
  }

  async navigateToSection(section: string) {
    const link = this.page.getByRole("link", { name: new RegExp(section, "i") });
    await link.click();
    await this.page.waitForLoadState("networkidle");
  }
}
