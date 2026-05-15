const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("playwright");

const FRONTEND_URL = process.env.QA_FRONTEND_URL || "http://localhost:5173";
const API_URL = process.env.QA_API_URL || "http://localhost:3001/api";
const ADMIN_IDENTIFIER = process.env.QA_ADMIN_IDENTIFIER || "admin";
const ADMIN_PASSWORD = process.env.QA_ADMIN_PASSWORD || "admin123456";
const LANG = process.env.QA_LANG || "ar";

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const runDir = path.resolve(
  process.env.QA_OUTPUT_DIR || path.join(os.tmpdir(), "waynest-qa", stamp),
);

const englishUiPattern =
  /\b(Login|Register|Search|Explore|Destinations|Plan|Calendar|Profile|Settings|Notifications|Inbox|Messages|Followers|Following|Friends|Save|Share|Like|Comment|Bookings|Wishlist|Dashboard|Users|Providers|Places|Countries|Cities|Currencies|Tags|Reviews|Billing|Create|Edit|Delete|Add|Update|Submit|Cancel|Apply|Details|Filter|Sort|Loading|No results|View details|Public|Private|Actions|Status|Type|Name|Description|Phone|Website|Country|Price|Date|Time|Email|Password|Submit|Welcome)\b/i;

const keyLeakPattern =
  /(<MISSING>|missing key|translation missing|\b[a-z][a-z0-9_-]*(\.[a-z0-9_-]+){2,}\b|undefined|null|\[object Object\])/i;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const safeName = (value) =>
  String(value || "route")
    .replace(/^\/+/, "")
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90) || "root";

async function api(pathname, options = {}) {
  const headers = {
    Accept: "application/json",
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
  };

  const response = await fetch(`${API_URL}${pathname}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const summary =
      typeof data === "string"
        ? data.slice(0, 240)
        : JSON.stringify(data).slice(0, 240);
    throw new Error(`${response.status} ${pathname}: ${summary}`);
  }

  return data;
}

async function login(identifier, password) {
  const payload = await api("/auth/login", {
    method: "POST",
    body: { identifier, password },
  });
  return { token: payload.access_token, user: payload.user };
}

async function createUser(adminToken, roleLabel) {
  const id = `${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 7)}`;
  const password = `Qa!${id}Strong123`;
  const username = `qa_${roleLabel}_${id}`.slice(0, 60);
  const user = await api("/users", {
    method: "POST",
    token: adminToken,
    body: {
      firstName: "QA",
      lastName: roleLabel === "provider" ? "Provider" : "Traveler",
      email: `qa+${roleLabel}.${id}@example.com`,
      username,
      password,
      role: "USER",
      phone: "+970599000001",
    },
  });

  return { user, username, password };
}

async function promoteToProvider(adminToken, qaUser, cityName) {
  const userLogin = await login(qaUser.username, qaUser.password);
  const app = await api("/provider-applications", {
    method: "POST",
    token: userLogin.token,
    body: {
      displayName: `QA Service ${Date.now().toString(36)}`,
      description:
        LANG === "ar"
          ? "ملف مزود خدمة مخصص لجولة ضمان الجودة"
          : "Automated QA service profile",
      categories: ["qa", "travel"],
      phone: "+970599000002",
      city: cityName || "Bethlehem",
      website: "https://example.com",
    },
  });
  await api(`/provider-applications/${app.id}/approve`, {
    method: "POST",
    token: adminToken,
  });
  return login(qaUser.username, qaUser.password);
}

function extractList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

async function collectSeedRoutes(adminToken) {
  const [placesPayload, tripsPayload, usersPayload, providersPayload] =
    await Promise.all([
      api("/place?page=1&limit=5"),
      api("/trip-planner/public/browse?limit=5").catch(() => ({ items: [] })),
      api("/users?page=1&limit=20", { token: adminToken }),
      api("/providers?page=1&limit=20", { token: adminToken }),
    ]);

  const places = extractList(placesPayload);
  const trips = extractList(tripsPayload);
  const users = extractList(usersPayload).filter(
    (user) => user?.username && user?.isSearchVisible !== false,
  );
  const providers = extractList(providersPayload).filter((provider) =>
    provider?.slug?.trim(),
  );
  const place = places.find((item) => item.slug) || places[0];
  const publicUser =
    users.find((user) => user.username !== "admin") || users[0] || null;
  const provider = providers[0] || null;

  return {
    place,
    trip: trips[0] || null,
    publicUser,
    provider,
    cityName: place?.city?.name || providers[0]?.city?.name || "Bethlehem",
  };
}

function withAuthInit(context, persona) {
  return context.addInitScript((payload) => {
    localStorage.setItem("i18nextLng", payload.lang);
    localStorage.setItem("waynest-theme", "light");
    localStorage.setItem("device_fingerprint", payload.fingerprint);
    if (payload.token && payload.user) {
      localStorage.setItem("auth_token", payload.token);
      localStorage.setItem("auth_user", JSON.stringify(payload.user));
      if (payload.user.id && payload.providerModeDone) {
        localStorage.setItem(`waynest_provider_mode_done_${payload.user.id}`, "1");
      }
      if (payload.user.id && payload.workspace) {
        localStorage.setItem(
          `waynest_active_workspace_${payload.user.id}`,
          payload.workspace,
        );
      }
    } else {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
    }
  }, persona);
}

async function makePage(browser, persona) {
  const context = await browser.newContext({
    locale: LANG,
    viewport: { width: 1440, height: 1000 },
  });
  await withAuthInit(context, {
    ...persona,
    lang: LANG,
    fingerprint: `qa-${stamp}`,
  });
  const page = await context.newPage();
  return { context, page };
}

async function inspectDom(page) {
  return page.evaluate(
    ({ englishSource, keySource }) => {
      const englishRe = new RegExp(englishSource, "i");
      const keyRe = new RegExp(keySource, "i");
      const text = document.body?.innerText || "";
      const lines = text
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean);
      const english = [];
      const keyLeaks = [];

      for (const line of lines) {
        if (english.length < 12 && englishRe.test(line)) english.push(line);
        if (keyLeaks.length < 12 && keyRe.test(line)) keyLeaks.push(line);
      }

      const controls = Array.from(
        document.querySelectorAll("button,a,input,select,textarea"),
      );
      const overflowControls = controls
        .filter((node) => {
          const rect = node.getBoundingClientRect();
          const style = window.getComputedStyle(node);
          if (
            rect.width <= 0 ||
            rect.height <= 0 ||
            style.visibility === "hidden" ||
            style.display === "none"
          ) {
            return false;
          }
          const readableText =
            node.innerText?.trim() ||
            node.getAttribute("aria-label") ||
            node.getAttribute("placeholder") ||
            node.getAttribute("title") ||
            "";
          if (!readableText) {
            return false;
          }
          return (
            node.scrollWidth > node.clientWidth + 40 ||
            node.scrollHeight > node.clientHeight + 16
          );
        })
        .slice(0, 8)
        .map((node) => ({
          tag: node.tagName.toLowerCase(),
          text:
            node.innerText?.trim() ||
            node.getAttribute("aria-label") ||
            node.getAttribute("placeholder") ||
            node.getAttribute("title") ||
            "",
          clientWidth: node.clientWidth,
          scrollWidth: node.scrollWidth,
        }));

      return {
        title: document.title,
        finalPath: `${location.pathname}${location.search}`,
        lang: document.documentElement.lang,
        dir: document.documentElement.dir,
        textLength: text.trim().length,
        buttonCount: document.querySelectorAll("button").length,
        linkCount: document.querySelectorAll("a").length,
        english,
        keyLeaks,
        overflowControls,
      };
    },
    {
      englishSource: englishUiPattern.source,
      keySource: keyLeakPattern.source,
    },
  );
}

async function runInteractions(page, routePath) {
  const notes = [];

  if (routePath.startsWith("/explore")) {
    const filterButtons = await page.locator(".filter-bar button").count();
    notes.push(`explore filter buttons: ${filterButtons}`);
    for (let i = 0; i < Math.min(filterButtons, 8); i += 1) {
      await page.locator(".filter-bar button").nth(i).click();
      await sleep(250);
    }
    const activeFilters = await page.locator(".filter-bar button.active").count();
    const cards = await page.locator(".place-card").count();
    notes.push(`explore active filters: ${activeFilters}; cards: ${cards}`);
    const search = page.locator('input[type="search"]').first();
    if ((await search.count()) > 0) {
      await search.fill("Bethlehem");
      await sleep(900);
      notes.push(
        `explore search rows/cards: ${await page
          .locator(".explore-people-result-row, .place-card")
          .count()}`,
      );
    }
  }

  if (routePath.startsWith("/destinations")) {
    const regionButtons = await page.locator(".filter-bar button").count();
    notes.push(`destination region buttons: ${regionButtons}`);
    const search = page.locator(".dest-hero__search input").first();
    if ((await search.count()) > 0) {
      await search.fill("Palestine");
      await sleep(600);
      notes.push(
        `destination cards after search: ${await page
          .locator(".destination-card")
          .count()}`,
      );
    }
  }

  return notes;
}

async function visit(page, route, personaName, report) {
  const routeReport = {
    persona: personaName,
    label: route.label,
    path: route.path,
    ok: true,
    issues: [],
    browser: [],
    interactions: [],
  };

  const browserEvents = [];
  const onConsole = (message) => {
    const text = message.text();
    if (
      message.type() === "error" ||
      /missing key|failed|uncaught|error/i.test(text)
    ) {
      browserEvents.push({ type: `console:${message.type()}`, text });
    }
  };
  const onPageError = (error) => {
    browserEvents.push({ type: "pageerror", text: error.message });
  };
  const onRequestFailed = (request) => {
    const url = request.url();
    const errorText = request.failure()?.errorText || "failed";
    if (/ERR_ABORTED/i.test(errorText)) return;
    if (!/favicon|sockjs|hot-update/i.test(url)) {
      browserEvents.push({
        type: "requestfailed",
        text: `${errorText} ${url}`,
      });
    }
  };
  const onResponse = (response) => {
    const url = response.url();
    const status = response.status();
    if (status < 400 || /favicon|sockjs|hot-update/i.test(url)) return;
    if (
      personaName === "guest" &&
      status === 401 &&
      /\/api\/auth\/me$/.test(url)
    ) {
      return;
    }
    browserEvents.push({ type: "response", text: `${status} ${url}` });
  };

  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  page.on("requestfailed", onRequestFailed);
  page.on("response", onResponse);

  try {
    await page.goto(`${FRONTEND_URL}${route.path}`, {
      waitUntil: "domcontentloaded",
      timeout: 25_000,
    });
    await page.waitForLoadState("networkidle", { timeout: 4_000 }).catch(() => {});
    await sleep(750);
    routeReport.interactions = await runInteractions(page, route.path);

    const dom = await inspectDom(page);
    routeReport.dom = dom;
    routeReport.finalPath = dom.finalPath;

    if (LANG === "ar" && dom.dir !== "rtl") {
      routeReport.issues.push(`document dir is "${dom.dir}" instead of rtl`);
    }
    if (LANG === "ar" && !String(dom.lang || "").startsWith("ar")) {
      routeReport.issues.push(`document lang is "${dom.lang}" instead of ar`);
    }
    if (dom.textLength < (route.minTextLength || 35)) {
      routeReport.issues.push(`page looks blank: only ${dom.textLength} chars`);
    }
    if (route.auth && /\/login$/.test(dom.finalPath)) {
      routeReport.issues.push("auth route redirected to login");
    }
    if (route.disallowUnauthorized && /\/unauthorized$/.test(dom.finalPath)) {
      routeReport.issues.push("route redirected to unauthorized");
    }
    if (dom.keyLeaks.length) {
      routeReport.issues.push(`possible leaked i18n/debug text: ${dom.keyLeaks[0]}`);
    }
    const meaningfulOverflow = dom.overflowControls.filter(
      (item) => String(item.text || "").trim().length > 30,
    );
    if (meaningfulOverflow.length) {
      routeReport.issues.push(
        `possible clipped control text: ${meaningfulOverflow[0].text}`,
      );
    }
    if (dom.english.length && !route.allowEnglishContent) {
      routeReport.issues.push(`visible English UI sample: ${dom.english[0]}`);
    }
  } catch (error) {
    routeReport.ok = false;
    routeReport.issues.push(error.message);
  } finally {
    routeReport.browser = browserEvents.slice(0, 20);
    if (routeReport.browser.length) {
      routeReport.issues.push(
        `browser/API event: ${routeReport.browser[0].type} ${routeReport.browser[0].text}`,
      );
    }
    routeReport.ok = routeReport.ok && routeReport.issues.length === 0;

    if (!routeReport.ok) {
      const file = `${personaName}-${safeName(route.path)}.png`;
      const screenshotPath = path.join(runDir, "screenshots", file);
      await fs.promises.mkdir(path.dirname(screenshotPath), { recursive: true });
      await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
      routeReport.screenshot = screenshotPath;
    }

    page.off("console", onConsole);
    page.off("pageerror", onPageError);
    page.off("requestfailed", onRequestFailed);
    page.off("response", onResponse);
    report.routes.push(routeReport);
  }
}

async function runPersona(browser, personaName, persona, routes, report) {
  const { context, page } = await makePage(browser, persona);
  for (const route of routes) {
    await visit(page, route, personaName, report);
  }
  await context.close();
}

async function main() {
  await fs.promises.mkdir(runDir, { recursive: true });
  const adminLogin = await login(ADMIN_IDENTIFIER, ADMIN_PASSWORD);
  const seeds = await collectSeedRoutes(adminLogin.token);
  const qaTraveler = await createUser(adminLogin.token, "traveler");
  const qaProviderBase = await createUser(adminLogin.token, "provider");
  const travelerLogin = await login(qaTraveler.username, qaTraveler.password);
  const providerLogin = await promoteToProvider(
    adminLogin.token,
    qaProviderBase,
    seeds.cityName,
  );
  const qaProviderProfile = await api("/providers/my", {
    token: providerLogin.token,
  }).catch(() => null);

  const placeParam = seeds.place?.slug || seeds.place?.id;
  const providerParam = qaProviderProfile?.slug || seeds.provider?.slug;
  const publicUsername = seeds.publicUser?.username || travelerLogin.user.username;
  const tripSlug = seeds.trip?.shareSlug;

  const guestRoutes = [
    { label: "home", path: "/" },
    { label: "explore", path: "/explore" },
    { label: "destinations", path: "/destinations" },
    { label: "planner", path: "/plan" },
    { label: "calendar", path: "/calendar" },
    { label: "about", path: "/about" },
    { label: "contact", path: "/contact" },
    { label: "search", path: "/search?q=Bethlehem" },
    { label: "login", path: "/login" },
    { label: "register", path: "/register" },
    { label: "verify email", path: "/verify-email" },
    { label: "invite", path: "/invite" },
    ...(placeParam ? [{ label: "place detail", path: `/places/${placeParam}` }] : []),
    ...(tripSlug
      ? [
          {
            label: "public trip",
            path: `/trip/${tripSlug}`,
            allowEnglishContent: true,
          },
        ]
      : []),
    ...(publicUsername ? [{ label: "public user", path: `/u/${publicUsername}` }] : []),
    ...(providerParam
      ? [
          { label: "public provider", path: `/p/${providerParam}` },
          { label: "public provider places", path: `/p/${providerParam}/places` },
          { label: "public provider events", path: `/p/${providerParam}/events` },
        ]
      : []),
  ];

  const userRoutes = [
    { label: "social", path: "/social", auth: true, disallowUnauthorized: true },
    { label: "inbox", path: "/inbox", auth: true, disallowUnauthorized: true },
    { label: "community", path: "/community/all", auth: true, disallowUnauthorized: true },
    { label: "notifications", path: "/notifications", auth: true, disallowUnauthorized: true },
    { label: "profile", path: "/profile", auth: true, disallowUnauthorized: true },
    { label: "settings", path: "/settings", auth: true, disallowUnauthorized: true },
    { label: "bookings", path: "/bookings", auth: true, disallowUnauthorized: true },
    { label: "wishlist", path: "/wishlist", auth: true, disallowUnauthorized: true },
    { label: "saved plans", path: "/saved-plans", auth: true, disallowUnauthorized: true },
    { label: "activities", path: "/activities", auth: true, disallowUnauthorized: true },
    {
      label: "geo",
      path: "/geo",
      auth: true,
      disallowUnauthorized: true,
      allowEnglishContent: true,
    },
    { label: "pricing", path: "/pricing", auth: true, disallowUnauthorized: true },
    { label: "billing", path: "/billing", auth: true, disallowUnauthorized: true },
    {
      label: "provider apply",
      path: "/account/provider/apply",
      auth: true,
      disallowUnauthorized: true,
    },
    {
      label: "provider register alias",
      path: "/register/provider",
      auth: true,
      disallowUnauthorized: true,
    },
  ];

  const providerRoutes = [
    { label: "provider dashboard", path: "/account/provider", auth: true, disallowUnauthorized: true },
    { label: "provider create post", path: "/account/provider/create-post", auth: true, disallowUnauthorized: true },
    { label: "provider public", path: "/account/provider/public", auth: true, disallowUnauthorized: true },
    { label: "provider public places", path: "/account/provider/public/places", auth: true, disallowUnauthorized: true },
    { label: "provider public events", path: "/account/provider/public/events", auth: true, disallowUnauthorized: true },
    { label: "provider reviews", path: "/account/provider/reviews", auth: true, disallowUnauthorized: true },
    { label: "provider places", path: "/account/provider/places", auth: true, disallowUnauthorized: true },
    { label: "provider events", path: "/account/provider/events", auth: true, disallowUnauthorized: true },
    { label: "provider bookings", path: "/account/provider/bookings", auth: true, disallowUnauthorized: true },
    { label: "provider settings", path: "/account/provider/settings", auth: true, disallowUnauthorized: true },
  ];

  const adminRoutes = [
    { label: "admin dashboard", path: "/admin-panel", auth: true, disallowUnauthorized: true },
    { label: "admin devices", path: "/admin-panel/devices", auth: true, disallowUnauthorized: true },
    { label: "admin users", path: "/users", auth: true, disallowUnauthorized: true },
    { label: "admin providers", path: "/providers", auth: true, disallowUnauthorized: true },
    { label: "admin places", path: "/places", auth: true, disallowUnauthorized: true },
    { label: "admin countries", path: "/countries", auth: true, disallowUnauthorized: true },
    { label: "admin cities", path: "/cities", auth: true, disallowUnauthorized: true },
    { label: "admin currencies", path: "/currencies", auth: true, disallowUnauthorized: true },
    { label: "admin tags", path: "/tags", auth: true, disallowUnauthorized: true },
    { label: "admin events", path: "/events", auth: true, disallowUnauthorized: true },
    { label: "admin reviews", path: "/reviews", auth: true, disallowUnauthorized: true },
    { label: "admin place pricing", path: "/place-pricing", auth: true, disallowUnauthorized: true },
    { label: "admin opening hours", path: "/place-opening-hours", auth: true, disallowUnauthorized: true },
    { label: "admin provider membership", path: "/provider-membership", auth: true, disallowUnauthorized: true },
    { label: "admin applications", path: "/provider-applications", auth: true, disallowUnauthorized: true },
    {
      label: "admin verification requests",
      path: "/provider-verification-requests",
      auth: true,
      disallowUnauthorized: true,
    },
    { label: "admin billing", path: "/billing", auth: true, disallowUnauthorized: true },
  ];

  const report = {
    startedAt: new Date().toISOString(),
    frontendUrl: FRONTEND_URL,
    apiUrl: API_URL,
    lang: LANG,
    runDir,
    qaAccounts: {
      traveler: travelerLogin.user.username,
      provider: providerLogin.user.username,
      admin: adminLogin.user.username,
    },
    seeds: {
      place: placeParam,
      provider: providerParam,
      publicUser: publicUsername,
      trip: tripSlug,
    },
    routes: [],
  };

  const browser = await chromium.launch({ headless: true });
  try {
    await runPersona(browser, "guest", {}, guestRoutes, report);
    await runPersona(
      browser,
      "traveler",
      { token: travelerLogin.token, user: travelerLogin.user },
      userRoutes,
      report,
    );
    await runPersona(
      browser,
      "provider",
      {
        token: providerLogin.token,
        user: providerLogin.user,
        providerModeDone: true,
        workspace: "provider",
      },
      providerRoutes,
      report,
    );
    await runPersona(
      browser,
      "admin",
      { token: adminLogin.token, user: adminLogin.user },
      adminRoutes,
      report,
    );
  } finally {
    await browser.close();
  }

  report.finishedAt = new Date().toISOString();
  report.summary = {
    total: report.routes.length,
    passed: report.routes.filter((route) => route.ok).length,
    failed: report.routes.filter((route) => !route.ok).length,
  };

  const reportPath = path.join(runDir, "browser-qa-report.json");
  await fs.promises.writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ reportPath, summary: report.summary }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
