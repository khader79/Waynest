import { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

export class ContactPage extends BasePage {
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly subjectSelect: Locator;
  readonly messageInput: Locator;
  readonly submitButton: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    super(page, "/contact");
    this.nameInput = page.getByLabel(/name/i);
    this.emailInput = page.getByLabel(/email/i);
    this.subjectSelect = page.getByLabel(/subject/i);
    this.messageInput = page.getByLabel(/message/i);
    this.submitButton = page.getByRole("button", { name: /send|submit/i });
    this.successMessage = page.getByText(/sent|success|thank/i);
  }

  async submitForm(data: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }) {
    await this.goto();
    await this.nameInput.fill(data.name);
    await this.emailInput.fill(data.email);
    await this.subjectSelect.selectOption(data.subject);
    await this.messageInput.fill(data.message);
    await this.submitButton.click();
    await this.page.waitForLoadState("networkidle");
  }
}
