import { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

export class RegisterPage extends BasePage {
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly emailInput: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly registerButton: Locator;
  readonly errorMessage: Locator;
  readonly loginLink: Locator;

  constructor(page: Page) {
    super(page, "/register");
    this.firstNameInput = page.getByLabel(/first name/i);
    this.lastNameInput = page.getByLabel(/last name/i);
    this.emailInput = page.getByLabel(/email/i);
    this.usernameInput = page.getByLabel(/username/i);
    this.passwordInput = page.getByLabel(/^password$/i);
    this.confirmPasswordInput = page.getByLabel(/confirm password/i);
    this.registerButton = page.getByRole("button", {
      name: /register|sign up|create account/i,
    });
    this.errorMessage = page.getByRole("alert");
    this.loginLink = page.getByRole("link", { name: /login|sign in/i });
  }

  async register(data: {
    firstName: string;
    lastName: string;
    email: string;
    username: string;
    password: string;
  }) {
    await this.goto();
    await this.firstNameInput.fill(data.firstName);
    await this.lastNameInput.fill(data.lastName);
    await this.emailInput.fill(data.email);
    await this.usernameInput.fill(data.username);
    await this.passwordInput.fill(data.password);
    await this.confirmPasswordInput.fill(data.password);
    await this.registerButton.click();
    await this.page.waitForLoadState("networkidle");
  }
}
