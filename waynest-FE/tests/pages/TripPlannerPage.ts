import { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

export class TripPlannerPage extends BasePage {
  readonly countrySelect: Locator;
  readonly citySelect: Locator;
  readonly daysInput: Locator;
  readonly personsInput: Locator;
  readonly startDateInput: Locator;
  readonly budgetInput: Locator;
  readonly currencySelect: Locator;
  readonly generateButton: Locator;
  readonly interestCheckboxes: Locator;
  readonly addToCalendarCheckbox: Locator;

  constructor(page: Page) {
    super(page, "/plan");
    this.countrySelect = page.getByLabel(/country/i);
    this.citySelect = page.getByLabel(/city/i);
    this.daysInput = page.getByLabel(/days|duration/i);
    this.personsInput = page.getByLabel(/persons|travelers|people/i);
    this.startDateInput = page.getByLabel(/start date|date/i);
    this.budgetInput = page.getByLabel(/budget/i);
    this.currencySelect = page.getByLabel(/currency/i);
    this.generateButton = page.getByRole("button", {
      name: /generate|plan|create/i,
    });
    this.interestCheckboxes = page.locator('input[type="checkbox"]');
    this.addToCalendarCheckbox = page.getByLabel(/add to calendar/i);
  }

  async fillTripPlan(data: {
    country: string;
    city: string;
    days: string;
    persons: string;
    startDate: string;
    budget: string;
    currency?: string;
  }) {
    await this.goto();
    await this.countrySelect.click();
    await this.page
      .getByRole("option", { name: data.country, exact: true })
      .click();
    await this.citySelect.click();
    await this.page
      .getByRole("option", { name: data.city, exact: true })
      .click();
    await this.daysInput.fill(data.days);
    await this.personsInput.fill(data.persons);
    await this.startDateInput.fill(data.startDate);
    await this.budgetInput.fill(data.budget);
    if (data.currency) {
      await this.currencySelect.click();
      await this.page
        .getByRole("option", { name: data.currency, exact: true })
        .click();
    }
  }

  async generate() {
    await this.generateButton.click();
    await this.page.waitForLoadState("networkidle");
  }
}
