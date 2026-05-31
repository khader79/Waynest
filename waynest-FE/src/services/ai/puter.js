import { puter } from "@heyputer/puter.js";

const DEFAULT_MODEL = "gpt-5.4-mini";

const DIRECTIVE_ACTION_PATHS = [
  "/",
  "/explore",
  "/plan",
  "/profile",
  "/profile/settings",
  "/saved-plans",
  "/bookings",
  "/wishlist",
  "/calendar",
  "/social",
  "/messenger",
  "/search",
];

const PROFILE_EDIT_MODES = ["details", "avatar", "settings"];

const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : String(value ?? "").trim();

const extractJsonBlock = (value) => {
  const text = normalizeText(value)
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "");

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) {
    return null;
  }

  return text.slice(start, end + 1);
};

const normalizeDirectiveAction = (action) => {
  if (!action || typeof action !== "object") {
    return null;
  }

  if (action.type === "navigate") {
    const path = normalizeText(action.path);
    if (!path || !DIRECTIVE_ACTION_PATHS.some((allowed) => path === allowed)) {
      return null;
    }

    return {
      type: "navigate",
      path,
      label: normalizeText(action.label) || "Open page",
    };
  }

  if (action.type === "profile") {
    const editMode = normalizeText(action.editMode);
    const normalizedMode = PROFILE_EDIT_MODES.includes(editMode)
      ? editMode
      : "details";

    return {
      type: "profile",
      path: "/profile",
      editMode: normalizedMode,
      label: normalizeText(action.label) || "Open profile",
    };
  }

  if (action.type === "plan") {
    const formData = action.formData;
    if (!formData || typeof formData !== "object") {
      return null;
    }

    return {
      type: "plan",
      path: "/plan",
      label: normalizeText(action.label) || "Open trip planner",
      formData: {
        cityId: normalizeText(formData.cityId),
        destination: normalizeText(formData.destination),
        country: normalizeText(formData.country),
        countryId: normalizeText(formData.countryId),
        days: Number(formData.days) || undefined,
        budget: Number(formData.budget) || undefined,
        persons: Number(formData.persons) || undefined,
        startDate: normalizeText(formData.startDate),
        currencyCode: normalizeText(formData.currencyCode),
        naturalLanguagePrompt: normalizeText(formData.naturalLanguagePrompt),
      },
    };
  }

  return null;
};

export const isPuterChatAvailable = () =>
  Boolean(puter?.ai && typeof puter.ai.chat === "function");

export const buildWaynestAiPrompt = ({
  conversationTitle,
  conversationHistory = [],
  userMessage,
  locale = "en",
}) => {
  const historyLines = conversationHistory
    .map((entry) => {
      const role = entry?.role === "assistant" ? "Assistant" : "User";
      const content = normalizeText(entry?.content);
      return content ? `${role}: ${content}` : "";
    })
    .filter(Boolean)
    .join("\n");

  return `You are Waynest AI Concierge for a travel and social app.
Reply in a helpful, concise style. Favor practical travel advice, places, budgets, saved trips, wishlists, routes, and local recommendations.
Match the user's language when reasonable. Keep the response ready to send as a chat message.

Locale: ${locale}
Conversation: ${conversationTitle || "Waynest AI"}
Recent messages:
${historyLines || "None"}

User message:
${normalizeText(userMessage)}`;
};

export const generateWaynestAiReply = async ({
  conversationTitle,
  conversationHistory = [],
  userMessage,
  locale = "en",
  model = DEFAULT_MODEL,
}) => {
  if (!isPuterChatAvailable()) {
    throw new Error("Puter chat is not available");
  }

  const prompt = buildWaynestAiPrompt({
    conversationTitle,
    conversationHistory,
    userMessage,
    locale,
  });

  const response = await puter.ai.chat(prompt, { model });
  const text = normalizeText(
    typeof response === "string" ? response : (response?.text ?? response),
  );

  if (!text) {
    throw new Error("Empty AI response");
  }

  return text;
};

export const buildWaynestAiDirectivePrompt = ({
  conversationTitle,
  conversationHistory = [],
  userMessage,
  locale = "en",
  currentPath = "/",
}) => {
  const basePrompt = buildWaynestAiPrompt({
    conversationTitle,
    conversationHistory,
    userMessage,
    locale,
  });

  return `${basePrompt}

You are running inside a popup control panel for Waynest.
Return only valid JSON with this shape:
{
  "reply": "short helpful response",
  "action": null | { "type": "navigate", "path": "/explore", "label": "Open Explore" } | { "type": "profile", "editMode": "avatar", "label": "Open profile" } | { "type": "plan", "formData": { "destination": "Rome", "days": 4, "budget": 1200, "persons": 2 }, "label": "Open trip planner" },
  "suggestions": ["optional", "follow-up", "chips"]
}

Rules:
- Use only JSON, no markdown fences, no extra commentary.
- Keep reply concise, direct, and useful.
- If the user asks to open a page or section, set action.type to "navigate" and choose one allowed path.
- If the user asks to plan a trip, set action.type to "plan" and include the trip details you can infer.
- If the user asks to change profile photo, edit profile info, or open account settings, set action.type to "profile" and use editMode "avatar" for the photo or "details" for general profile edits.
- For profile and avatar requests, do not route to social chat unless the user explicitly asks for messaging.
- Allowed paths: ${DIRECTIVE_ACTION_PATHS.join(", ")}
- If no page change is needed, set action to null.
- Suggestions should be 0 to 4 short follow-up prompts.
- Current app path: ${currentPath}
`;
};

export const parseWaynestAiDirectiveResponse = (value) => {
  const fallbackReply = normalizeText(value);
  const extracted = extractJsonBlock(fallbackReply);

  if (!extracted) {
    return {
      reply: fallbackReply,
      action: null,
      suggestions: [],
    };
  }

  try {
    const parsed = JSON.parse(extracted);
    const reply = normalizeText(parsed?.reply) || fallbackReply;
    const action = normalizeDirectiveAction(parsed?.action);
    const suggestions = Array.isArray(parsed?.suggestions)
      ? parsed.suggestions.map(normalizeText).filter(Boolean).slice(0, 4)
      : [];

    return {
      reply,
      action,
      suggestions,
    };
  } catch {
    return {
      reply: fallbackReply,
      action: null,
      suggestions: [],
    };
  }
};

export const generateWaynestAiDirectiveReply = async ({
  conversationTitle,
  conversationHistory = [],
  userMessage,
  locale = "en",
  currentPath = "/",
  model = DEFAULT_MODEL,
}) => {
  if (!isPuterChatAvailable()) {
    throw new Error("Puter chat is not available");
  }

  const prompt = buildWaynestAiDirectivePrompt({
    conversationTitle,
    conversationHistory,
    userMessage,
    locale,
    currentPath,
  });

  const response = await puter.ai.chat(prompt, { model });
  const text = normalizeText(
    typeof response === "string" ? response : (response?.text ?? response),
  );

  if (!text) {
    throw new Error("Empty AI response");
  }

  return parseWaynestAiDirectiveResponse(text);
};
