import { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

export class SettingsPage extends BasePage {
  readonly newPasswordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly saveButton: Locator;
  readonly successMessage: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page, "/settings");
    this.newPasswordInput = page.getByLabel(/new password/i);
    this.confirmPasswordInput = page.getByLabel(/confirm password/i);
    this.saveButton = page.getByRole("button", { name: /save|update/i });
    this.successMessage = page.getByText(/updated|success/i);
    this.errorMessage = page.getByRole("alert");
  }

  async changePassword(newPassword: string, confirmPassword: string) {
    await this.goto();
    await this.newPasswordInput.fill(newPassword);
    await this.confirmPasswordInput.fill(confirmPassword);
    await this.saveButton.click();
    await this.page.waitForLoadState("networkidle");
  }
}
