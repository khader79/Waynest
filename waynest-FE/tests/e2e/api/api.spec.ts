import { test, expect } from "@playwright/test";

test.describe("API Tests", () => {
  const API_URL = process.env.API_URL || "http://localhost:3001/api";

  test.describe("Health Check", () => {
    test("should return 200 on health endpoint", async ({ request }) => {
      const response = await request.get(`${API_URL}/health`);
      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);
    });
  });

  test.describe("Authentication API", () => {
    test("should reject login with invalid credentials", async ({
      request,
    }) => {
      const response = await request.post(`${API_URL}/auth/login`, {
        data: {
          identifier: "invalid",
          password: "wrongpassword",
        },
      });
      expect(response.status()).toBe(401);
    });

    test("should reject registration with missing fields", async ({
      request,
    }) => {
      const response = await request.post(`${API_URL}/auth/register`, {
        data: {},
      });
      expect(response.status()).toBeGreaterThanOrEqual(400);
    });

    test("should reject registration with weak password", async ({
      request,
    }) => {
      const response = await request.post(`${API_URL}/auth/register`, {
        data: {
          firstName: "Test",
          lastName: "User",
          email: "test@example.com",
          username: "testuser",
          password: "123",
        },
      });
      expect(response.status()).toBeGreaterThanOrEqual(400);
    });
  });

  test.describe("Public API", () => {
    test("should return countries list", async ({ request }) => {
      const response = await request.get(`${API_URL}/countries`);
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(Array.isArray(data) || Array.isArray(data.data)).toBeTruthy();
    });

    test("should return cities list", async ({ request }) => {
      const response = await request.get(`${API_URL}/cities`);
      expect(response.ok()).toBeTruthy();
    });

    test("should return tags list", async ({ request }) => {
      const response = await request.get(`${API_URL}/tag`);
      expect(response.ok()).toBeTruthy();
    });

    test("should return currencies list", async ({ request }) => {
      const response = await request.get(`${API_URL}/currencies`);
      expect(response.ok()).toBeTruthy();
    });

    test("should search with query parameter", async ({ request }) => {
      const response = await request.get(
        `${API_URL}/search?q=Bethlehem&limit=5`,
      );
      expect(response.ok()).toBeTruthy();
    });

    test("should return landing stats", async ({ request }) => {
      const response = await request.get(`${API_URL}/public/landing-stats`);
      expect(response.ok()).toBeTruthy();
    });
  });

  test.describe("Trip Planner API", () => {
    test("should reject trip generation without required fields", async ({
      request,
    }) => {
      const response = await request.post(`${API_URL}/trip-planner`, {
        data: {},
      });
      expect(response.status()).toBeGreaterThanOrEqual(400);
    });
  });

  test.describe("Contact API", () => {
    test("should reject contact form with missing fields", async ({
      request,
    }) => {
      const response = await request.post(`${API_URL}/contact`, {
        data: {},
      });
      expect(response.status()).toBeGreaterThanOrEqual(400);
    });
  });

  test.describe("Error Handling", () => {
    test("should return 404 for unknown endpoint", async ({ request }) => {
      const response = await request.get(
        `${API_URL}/this-endpoint-does-not-exist`,
      );
      expect(response.status()).toBe(404);
    });

    test("should return 405 for wrong method", async ({ request }) => {
      const response = await request.delete(`${API_URL}/countries`);
      expect(response.status()).toBeGreaterThanOrEqual(400);
    });

    test("should handle malformed JSON", async ({ request }) => {
      const response = await request.post(`${API_URL}/auth/login`, {
        data: "not-json",
      });
      expect(response.status()).toBeGreaterThanOrEqual(400);
    });
  });

  test.describe("Rate Limiting", () => {
    test("should handle rapid requests gracefully", async ({ request }) => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(request.get(`${API_URL}/countries`));
      }
      const responses = await Promise.all(promises);
      // All should succeed or some should be rate limited (429)
      responses.forEach((r) => {
        expect([200, 429]).toContain(r.status());
      });
    });
  });
});
