import { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

export class SearchPage extends BasePage {
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly resultsContainer: Locator;
  readonly filterButtons: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    super(page, "/search");
    this.searchInput = page.getByRole("searchbox", { name: /search/i });
    this.searchButton = page.getByRole("button", { name: /search/i });
    this.resultsContainer = page.locator('[class*="results"], [class*="list"]').first();
    this.filterButtons = page.getByRole("button", { name: /filter|type/i });
    this.emptyState = page.getByText(/no results|nothing found/i);
  }

  async search(query: string) {
    await this.goto();
    await this.searchInput.fill(query);
    await this.searchButton.click();
    await this.page.waitForLoadState("networkidle");
  }
}
