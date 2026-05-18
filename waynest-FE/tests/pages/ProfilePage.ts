import { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

export class ProfilePage extends BasePage {
  readonly profileName: Locator;
  readonly profileEmail: Locator;
  readonly settingsLink: Locator;
  readonly friendsLink: Locator;
  readonly followersLink: Locator;
  readonly followingLink: Locator;
  readonly bookingsLink: Locator;
  readonly wishlistLink: Locator;
  readonly savedPlansLink: Locator;
  readonly activitiesLink: Locator;

  constructor(page: Page) {
    super(page, "/profile");
    this.profileName = page.locator('[class*="name"], [class*="title"]').first();
    this.profileEmail = page.locator('[class*="email"]').first();
    this.settingsLink = page.getByRole("link", { name: /settings/i });
    this.friendsLink = page.getByRole("link", { name: /friends/i });
    this.followersLink = page.getByRole("link", { name: /followers/i });
    this.followingLink = page.getByRole("link", { name: /following/i });
    this.bookingsLink = page.getByRole("link", { name: /bookings/i });
    this.wishlistLink = page.getByRole("link", { name: /wishlist/i });
    this.savedPlansLink = page.getByRole("link", { name: /saved.*plan/i });
    this.activitiesLink = page.getByRole("link", { name: /activities/i });
  }
}
