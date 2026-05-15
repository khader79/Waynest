// Dev-only API mock. Enabled when NODE_ENV !== 'production' and
// localStorage.DEV_API_MOCK === '1'. Intercepts `fetch` and XHR requests
// targeting `/api/` and returns lightweight mocked responses so the UI
// can be exercised without a live backend during QA.

(function setupDevApiMock() {
  try {
    if (process.env.NODE_ENV === "production") return;
    if (typeof window === "undefined") return;
    const enabled = localStorage.getItem("DEV_API_MOCK") === "1";
    if (!enabled) return;

    const nowIso = () => new Date().toISOString();

    const db = {
      users: [
        {
          id: "u_dev_1",
          firstName: "Dev",
          lastName: "Admin",
          email: "admin@local",
          username: "devadmin",
          role: "ADMIN",
          status: "active",
          createdAt: nowIso(),
        },
      ],
      providers: [],
      places: [],
      tags: [],
      events: [],
      currencies: [
        { code: "USD", name: "US Dollar" },
        { code: "ILS", name: "Israeli Shekel" },
      ],
    };

    const findListFor = (path) => {
      if (!path) return null;
      const m = path.match(/^\/api\/([a-zA-Z0-9-_]+)/);
      return m ? m[1] : null;
    };

    const jsonResponse = (payload, status = 200) =>
      new Response(JSON.stringify(payload), {
        status,
        headers: { "Content-Type": "application/json" },
      });

    // Intercept fetch
    const realFetch = window.fetch.bind(window);
    window.fetch = async (input, init = {}) => {
      try {
        const url = typeof input === "string" ? input : input.url;
        if (!String(url).includes("/api/")) return realFetch(input, init);
        let path = url;
        try {
          const u = new URL(url, location.origin);
          path = u.pathname + (u.search || "");
        } catch (e) {}

        const method = (init.method || "GET").toUpperCase();
        const listKey = findListFor(path);

        // small artificial latency
        await new Promise((r) => setTimeout(r, 120 + Math.random() * 200));

        if (listKey && db[listKey]) {
          if (method === "GET")
            return jsonResponse({
              data: db[listKey],
              total: db[listKey].length,
            });
          if (method === "POST") {
            const bodyText = init.body || "{}";
            const parsed =
              typeof bodyText === "string" ? JSON.parse(bodyText) : bodyText;
            const id = `${listKey.slice(0, 1)}_${Date.now()}`;
            const item = { id, ...parsed, createdAt: nowIso() };
            db[listKey].push(item);
            return jsonResponse(item, 201);
          }
          if (method === "DELETE") {
            const segments = path.split("/");
            const id = segments[segments.length - 1] || null;
            const before = Array.isArray(db[listKey]) ? db[listKey].length : 0;
            if (Array.isArray(db[listKey])) {
              db[listKey] = db[listKey].filter(
                (x) => String(x.id) !== String(id),
              );
            }
            return jsonResponse({
              deleted:
                before - (Array.isArray(db[listKey]) ? db[listKey].length : 0),
            });
          }
        } else if (listKey && !db[listKey]) {
          // known /api/ prefix but no local mock data: return empty list for GET or generic success
          if (method === "GET") return jsonResponse({ data: [], total: 0 });
          if (method === "POST") return jsonResponse({}, 201);
          if (method === "DELETE") return jsonResponse({ deleted: 0 });
        }

        if (path.includes("/api/notifications/unread-count"))
          return jsonResponse({ count: 0 });
        return jsonResponse({});
      } catch (err) {
        return realFetch(input, init);
      }
    };

    // Lightweight Mock XHR so libraries using XMLHttpRequest (axios/legacy)
    // receive equivalent mocked responses.
    (function installMockXHR() {
      const RealXHR = window.XMLHttpRequest;

      function MockXHR() {
        this._headers = {};
        this.readyState = 0;
        this.status = 0;
        this.responseText = null;
        this.response = null;
        this.onreadystatechange = null;
        this.onload = null;
        this.onerror = null;
      }

      MockXHR.prototype.open = function (method, url) {
        this._method = method;
        this._url = String(url || "");
        this.readyState = 1;
        if (typeof this.onreadystatechange === "function")
          this.onreadystatechange();
      };

      MockXHR.prototype.setRequestHeader = function (name, value) {
        this._headers[name] = value;
      };

      MockXHR.prototype.abort = function () {
        this.readyState = 0;
      };

      MockXHR.prototype.send = function (body) {
        const url = this._url || "";
        if (!url.includes("/api/")) {
          // delegate to real XHR for non-api requests
          const real = new RealXHR();
          real.open(this._method || "GET", url);
          for (const k in this._headers)
            real.setRequestHeader(k, this._headers[k]);
          real.send(body);
          real.onload = () => {
            this.status = real.status;
            this.responseText = real.responseText;
            this.response = real.response;
            this.readyState = real.readyState;
            if (typeof this.onreadystatechange === "function")
              this.onreadystatechange();
            if (typeof this.onload === "function") this.onload();
          };
          real.onerror = () => {
            if (typeof this.onerror === "function") this.onerror();
          };
          return;
        }

        let path = url;
        try {
          const u = new URL(url, location.origin);
          path = u.pathname + (u.search || "");
        } catch (e) {}

        const method = String(this._method || "GET").toUpperCase();
        const listKey = findListFor(path);

        const respond = (status, payload) => {
          this.status = status;
          this.responseText =
            typeof payload === "string" ? payload : JSON.stringify(payload);
          this.response = this.responseText;
          this.readyState = 4;
          if (typeof this.onreadystatechange === "function")
            this.onreadystatechange();
          if (typeof this.onload === "function") this.onload();
        };

        setTimeout(
          () => {
            if (listKey && db[listKey]) {
              if (method === "GET")
                return respond(200, {
                  data: db[listKey],
                  total: db[listKey].length,
                });
              if (method === "POST") {
                const parsed = body ? JSON.parse(body) : {};
                const id = `${listKey.slice(0, 1)}_${Date.now()}`;
                const item = { id, ...parsed, createdAt: nowIso() };
                db[listKey].push(item);
                return respond(201, item);
              }
              if (method === "DELETE") {
                const segments = path.split("/");
                const id = segments[segments.length - 1] || null;
                const before = Array.isArray(db[listKey])
                  ? db[listKey].length
                  : 0;
                if (Array.isArray(db[listKey]))
                  db[listKey] = db[listKey].filter(
                    (x) => String(x.id) !== String(id),
                  );
                return respond(200, {
                  deleted:
                    before -
                    (Array.isArray(db[listKey]) ? db[listKey].length : 0),
                });
              }
            } else if (listKey && !db[listKey]) {
              if (method === "GET") return respond(200, { data: [], total: 0 });
              if (method === "POST") return respond(201, {});
              if (method === "DELETE") return respond(200, { deleted: 0 });
            }

            if (path.includes("/api/notifications/unread-count"))
              return respond(200, { count: 0 });
            return respond(200, {});
          },
          150 + Math.floor(Math.random() * 250),
        );
      };

      window.XMLHttpRequest = MockXHR;
      console.info("[DEV_API_MOCK] Mock XMLHttpRequest installed");
    })();

    console.info("[DEV_API_MOCK] enabled — intercepting /api/ requests");
  } catch (err) {
    // no-op
  }
})();
