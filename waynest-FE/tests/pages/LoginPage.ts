import { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

export class LoginPage extends BasePage {
  readonly identifierInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;
  readonly forgotPasswordLink: Locator;
  readonly registerLink: Locator;

  constructor(page: Page) {
    super(page, "/login");
    this.identifierInput = page.getByRole("textbox", {
      name: /email|username|identifier/i,
    });
    this.passwordInput = page.getByLabel(/password/i);
    this.loginButton = page.getByRole("button", { name: /sign in|login/i });
    this.errorMessage = page.getByRole("alert");
    this.forgotPasswordLink = page.getByRole("link", {
      name: /forgot password/i,
    });
    this.registerLink = page.getByRole("link", { name: /register|sign up/i });
  }

  async login(identifier: string, password: string) {
    await this.goto();
    await this.identifierInput.fill(identifier);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
    await this.page.waitForLoadState("networkidle");
  }

  async loginWithDevBypass(user: {
    id: string;
    email: string;
    username: string;
    role: string;
  }) {
    await this.page.goto(this.url);
    await this.page.evaluate(
      ({ user }) => {
        localStorage.setItem("DEV_AUTH_USER", JSON.stringify(user));
      },
      { user },
    );
    await this.page.reload();
    await this.page.waitForLoadState("networkidle");
  }

  async expectLoginError(message: string) {
    await this.expectVisible(this.errorMessage);
    await this.expectText(this.errorMessage, message);
  }
}
