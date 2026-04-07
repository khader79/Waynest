import axios from "axios";
import { io } from "socket.io-client";

const API_BASE = process.env.API_BASE || "http://localhost:3001";
const CHAT_NS = "/chat";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ensureUp() {
  for (let i = 0; i < 10; i++) {
    try {
      await axios
        .get(`${API_BASE}/api/docs`, { timeout: 1000 })
        .catch(() => {});
      return;
    } catch (e) {
      await sleep(500);
    }
  }
}

async function registerIfNeeded(user) {
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
    console.log(`registered ${user.username}`);
    return res.data?.user;
  } catch (err) {
    // If already exists, try to find by login later
    console.error(
      `register failed for ${user.username}: status=${err.response?.status} data=${JSON.stringify(err.response?.data) || err.message}`,
    );
    return null;
  }
}

async function login(user) {
  const res = await axios.post(
    `${API_BASE}/auth/login`,
    {
      identifier: user.identifier,
      password: user.password,
    },
    { timeout: 5000 },
  );
  return res.data; // { access_token, user }
}

async function main() {
  console.log("Socket test starting; API_BASE=", API_BASE);
  await sleep(800);

  const suffix = Date.now() % 1000000;
  const password = "Pass1234!";

  const ua = {
    firstName: "TestA",
    lastName: "User",
    email: `testa+${suffix}@example.com`,
    password,
    username: `testa${suffix}`,
    identifier: `testa${suffix}`,
  };

  const ub = {
    firstName: "TestB",
    lastName: "User",
    email: `testb+${suffix}@example.com`,
    password,
    username: `testb${suffix}`,
    identifier: `testb${suffix}`,
  };

  // Wait briefly for server
  await sleep(1200);

  // Try registering (may fail if already exists)
  await registerIfNeeded(ua).catch(() => {});
  await registerIfNeeded(ub).catch(() => {});

  // Login both
  let aSession, bSession;
  try {
    aSession = await login(ua);
    bSession = await login(ub);
  } catch (err) {
    console.error(
      "Login failed:",
      err.response?.status,
      err.response?.data || err.message,
      err.stack,
    );
    process.exit(2);
  }

  console.log("logged in A=", aSession.user.id, "B=", bSession.user.id);

  // Create a group conversation from A -> B + C (register C first)
  let conversationId;
  try {
    const uc = {
      firstName: "TestC",
      lastName: "User",
      email: `testc+${suffix}@example.com`,
      password,
      username: `testc${suffix}`,
      identifier: `testc${suffix}`,
    };
    await registerIfNeeded(uc).catch(() => {});
    let cSession;
    try {
      cSession = await login(uc);
    } catch (e) {
      console.error("login C failed", e.response?.data || e.message);
      process.exit(3);
    }

    const res = await axios.post(
      `${API_BASE}/messaging/conversations`,
      {
        participantIds: [bSession.user.id, cSession.user.id],
        firstMessage: "Initial hello",
        title: "test group",
      },
      {
        headers: { Authorization: `Bearer ${aSession.access_token}` },
        timeout: 5000,
      },
    );
    conversationId = res.data?.conversation?.id ?? res.data?.id ?? null;
    console.log("conversation created", conversationId);
  } catch (err) {
    console.error(
      "Create conversation failed:",
      err.response?.data || err.message,
    );
    process.exit(3);
  }

  // Connect sockets
  const socketA = io(`${API_BASE}${CHAT_NS}`, {
    auth: { token: aSession.access_token },
    transports: ["websocket"],
    reconnectionAttempts: 3,
  });
  const socketB = io(`${API_BASE}${CHAT_NS}`, {
    auth: { token: bSession.access_token },
    transports: ["websocket"],
    reconnectionAttempts: 3,
  });

  await Promise.all([
    new Promise((resolve) =>
      socketA.on("connect", () => {
        console.log("socketA connected");
        resolve();
      }),
    ),
    new Promise((resolve) =>
      socketB.on("connect", () => {
        console.log("socketB connected");
        resolve();
      }),
    ),
  ]);

  let bReceived = false;
  socketB.on("message:new", (payload) => {
    console.log("socketB received message:new", JSON.stringify(payload));
    bReceived = true;
  });

  // Join conversation rooms
  const joinAckA = await new Promise((resolve) => {
    socketA.emit("join", { conversationId }, (res) => resolve(res));
    setTimeout(() => resolve({ ok: false, timeout: true }), 3000);
  });
  const joinAckB = await new Promise((resolve) => {
    socketB.emit("join", { conversationId }, (res) => resolve(res));
    setTimeout(() => resolve({ ok: false, timeout: true }), 3000);
  });
  console.log("join a ack", joinAckA, "join b ack", joinAckB);

  // Send a message via HTTP as A
  try {
    const sendRes = await axios.post(
      `${API_BASE}/messaging/conversations/${conversationId}/messages`,
      { content: "Hello from automated test" },
      {
        headers: { Authorization: `Bearer ${aSession.access_token}` },
        timeout: 5000,
      },
    );
    console.log("message send response", sendRes.data?.id ?? sendRes.data);
  } catch (err) {
    console.error("Send message failed:", err.response?.data || err.message);
  }

  // Wait up to 5s for B to receive
  for (let i = 0; i < 10 && !bReceived; i++) {
    await sleep(500);
  }

  if (bReceived) {
    console.log("SUCCESS: client B received the message in real-time");
  } else {
    console.error("FAIL: client B did NOT receive the message");
  }

  socketA.disconnect();
  socketB.disconnect();
  process.exit(bReceived ? 0 : 4);
}

main().catch((err) => {
  console.error("Test error", err);
  process.exit(1);
});
