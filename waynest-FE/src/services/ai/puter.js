import { puter } from "@heyputer/puter.js";

const DEFAULT_MODEL = "gpt-5.4-mini";

const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : String(value ?? "").trim();

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
