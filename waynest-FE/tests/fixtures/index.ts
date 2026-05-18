import { Page } from "@playwright/test";
import { LoginPage } from "../pages/LoginPage";
import { RegisterPage } from "../pages/RegisterPage";
import { LandingPage } from "../pages/LandingPage";
import { TripPlannerPage } from "../pages/TripPlannerPage";
import { ContactPage } from "../pages/ContactPage";
import { AdminDashboardPage } from "../pages/AdminDashboardPage";
import { ProfilePage } from "../pages/ProfilePage";
import { SearchPage } from "../pages/SearchPage";
import { SettingsPage } from "../pages/SettingsPage";
import { NavbarPage } from "../pages/NavbarPage";

/**
 * Test fixtures providing reusable page objects and utilities.
 */
import { test as base } from "@playwright/test";

export const test = base.extend<{
  loginPage: LoginPage;
  registerPage: RegisterPage;
  landingPage: LandingPage;
  tripPlannerPage: TripPlannerPage;
  contactPage: ContactPage;
  adminDashboardPage: AdminDashboardPage;
  profilePage: ProfilePage;
  searchPage: SearchPage;
  settingsPage: SettingsPage;
  navbarPage: NavbarPage;
}>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  registerPage: async ({ page }, use) => {
    await use(new RegisterPage(page));
  },
  landingPage: async ({ page }, use) => {
    await use(new LandingPage(page));
  },
  tripPlannerPage: async ({ page }, use) => {
    await use(new TripPlannerPage(page));
  },
  contactPage: async ({ page }, use) => {
    await use(new ContactPage(page));
  },
  adminDashboardPage: async ({ page }, use) => {
    await use(new AdminDashboardPage(page));
  },
  profilePage: async ({ page }, use) => {
    await use(new ProfilePage(page));
  },
  searchPage: async ({ page }, use) => {
    await use(new SearchPage(page));
  },
  settingsPage: async ({ page }, use) => {
    await use(new SettingsPage(page));
  },
  navbarPage: async ({ page }, use) => {
    await use(new NavbarPage(page));
  },
});

export { expect } from "@playwright/test";
