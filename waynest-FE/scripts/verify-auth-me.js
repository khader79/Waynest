import axios from "axios";

const API_BASE = process.env.API_BASE || "http://localhost:3001";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function register(user) {
  try {
    const regBody = {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: user.password,
      username: user.username,
    };
    const res = await axios.post(`${API_BASE}/auth/register`, regBody, {
      timeout: 5000,
    });
    return res.data?.user ?? null;
  } catch (err) {
    console.error(
      `register failed for ${user.username}:`,
      err.response?.status,
      err.response?.data || err.message,
    );
    return null;
  }
}

async function login(user) {
  const res = await axios.post(
    `${API_BASE}/auth/login`,
    { identifier: user.identifier ?? user.username, password: user.password },
    { timeout: 5000 },
  );
  return res.data; // { access_token, user }
}

async function main() {
  await sleep(600);

  const suffix = Date.now() % 1000000;
  const password = "Pass1234!";
  const u = {
    firstName: "Verify",
    lastName: "User",
    email: `verify+${suffix}@example.com`,
    password,
    username: `verify${suffix}`,
    identifier: `verify${suffix}`,
  };

  // Ensure server reachable (quick)
  try {
    await axios.get(`${API_BASE}/api/docs`, { timeout: 1200 }).catch(() => {});
  } catch (e) {
    // ignore
  }

  await register(u);

  let session;
  try {
    session = await login(u);
  } catch (err) {
    console.error(
      "Login failed:",
      err.response?.status,
      err.response?.data || err.message,
    );
    process.exit(2);
  }


  // Call /auth/me using Bearer token
  try {
    const me = await axios.get(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      timeout: 4000,
    });

    const ok1 =
      session.user &&
      session.user.firstName === u.firstName &&
      session.user.lastName === u.lastName;
    const ok2 =
      me.data &&
      me.data.firstName === u.firstName &&
      me.data.lastName === u.lastName;

    if (ok1 && ok2) {
        "SUCCESS: backend returns firstName/lastName on login and /auth/me",
      );
      process.exit(0);
    }

    console.error("Mismatch detected:", {
      loginUser: session.user,
      me: me.data,
    });
    process.exit(3);
  } catch (err) {
    console.error(
      "GET /auth/me failed:",
      err.response?.status,
      err.response?.data || err.message,
    );
    process.exit(4);
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
