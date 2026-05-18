/**
 * Test data factories for generating realistic test data.
 */

export const UserFactory = {
  guest: () => ({
    firstName: "Guest",
    lastName: "User",
    email: `guest${Date.now()}@example.com`,
    username: `guest${Date.now()}`,
    password: "Test123456!",
  }),
  user: () => ({
    firstName: "Test",
    lastName: "User",
    email: `user${Date.now()}@waynest.com`,
    username: `testuser${Date.now()}`,
    password: "Test123456!",
  }),
  admin: () => ({
    identifier: "admin",
    password: process.env.ADMIN_PASSWORD || "admin123456",
  }),
};

export const TripFactory = {
  weekend: () => ({
    country: "Palestine",
    city: "Bethlehem",
    days: "2",
    persons: "2",
    startDate: "2026-06-01",
    budget: "500",
    currency: "USD",
  }),
  solo: () => ({
    country: "Italy",
    city: "Rome",
    days: "5",
    persons: "1",
    startDate: "2026-07-15",
    budget: "1500",
    currency: "EUR",
  }),
  family: () => ({
    country: "Turkey",
    city: "Istanbul",
    days: "7",
    persons: "4",
    startDate: "2026-08-01",
    budget: "3000",
    currency: "USD",
  }),
};

export const ContactFactory = {
  general: () => ({
    name: "Test User",
    email: "test@example.com",
    subject: "general",
    message: "This is a test message from automated testing.",
  }),
  support: () => ({
    name: "Test User",
    email: "test@example.com",
    subject: "support",
    message: "I need help with my account. This is a test.",
  }),
};

export const PlaceFactory = {
  basic: () => ({
    name: `Test Place ${Date.now()}`,
    description: "A test place created by automated testing.",
    category: "Restaurant",
    city: "Bethlehem",
    country: "Palestine",
  }),
};

export const EventFactory = {
  basic: () => ({
    title: `Test Event ${Date.now()}`,
    description: "A test event created by automated testing.",
    startDate: "2026-06-15",
    endDate: "2026-06-16",
    location: "Bethlehem",
  }),
};
