import axios from "axios";

const API_BASE = process.env.API_BASE || "http://localhost:3001";

(async function () {
  try {
    const res = await axios.get(`${API_BASE}/api/docs`, { timeout: 3000 });
  } catch (err) {
    console.error("ERR", err.message);
    if (err.response) {
      console.error("RESP", err.response.status, err.response.data);
    } else if (err.request) {
      console.error("NO RESPONSE, request made");
    } else {
      console.error("SETUP ERROR", err.stack);
    }
    process.exit(1);
  }
})();
